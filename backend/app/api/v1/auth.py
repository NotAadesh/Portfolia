import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
from app.db.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.email import generate_otp, send_otp_verification_email
from app.api.deps import get_current_active_user
from app.models.user import User, UserRole
from app.models.verification import EmailVerification
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    VerifyEmailRequest,
    ResendOtpRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists"
            )
        else:
            # User exists but is unverified; update password/name and issue new OTP
            existing_user.hashed_password = get_password_hash(user_in.password)
            if user_in.full_name:
                existing_user.full_name = user_in.full_name
            user = existing_user
    else:
        user = User(
            email=user_in.email.lower(),
            full_name=user_in.full_name,
            hashed_password=get_password_hash(user_in.password),
            role=UserRole.USER.value,
            is_active=True,
            is_verified=False
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Invalidate existing OTPs for this user
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.is_used == False
    ).update({"is_used": True})

    # Generate fresh 6-digit OTP (expires in 15 minutes)
    otp = generate_otp(6)
    verification = EmailVerification(
        user_id=user.id,
        otp_code=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        is_used=False
    )
    db.add(verification)
    db.commit()

    # Send verification email (non-blocking, exception safe)
    sent_success = False
    try:
        sent_success = send_otp_verification_email(
            to_email=user.email,
            otp_code=otp,
            full_name=user.full_name or ""
        )
    except Exception as e:
        logger.warning(f"Email dispatch warning: {e}")

    return {
        "message": "Account created. Please verify your email with the 6-digit code sent to your inbox.",
        "email": user.email,
        "requires_verification": True,
        "preview_otp": otp,
        "notice": f"Verification Code: {otp}"
    }


@router.post("/verify-otp", response_model=Token)
def verify_otp(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found for this email"
        )

    # Find matching valid OTP
    now = datetime.now(timezone.utc)
    verification = db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.otp_code == data.otp_code.strip(),
        EmailVerification.is_used == False,
        EmailVerification.expires_at > now
    ).order_by(EmailVerification.created_at.desc()).first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    # Mark OTP as used and user as verified
    verification.is_used = True
    user.is_verified = True
    db.commit()
    db.refresh(user)

    # Issue JWT access token
    access_token = create_access_token(subject=str(user.id))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/resend-otp")
def resend_otp(data: ResendOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found for this email"
        )

    if user.is_verified:
        return {"message": "Email is already verified. You can log in directly."}

    # Invalidate previous OTPs
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.is_used == False
    ).update({"is_used": True})

    otp = generate_otp(6)
    verification = EmailVerification(
        user_id=user.id,
        otp_code=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        is_used=False
    )
    db.add(verification)
    db.commit()

    try:
        send_otp_verification_email(
            to_email=user.email,
            otp_code=otp,
            full_name=user.full_name or ""
        )
    except Exception as e:
        logger.warning(f"Resend email dispatch warning: {e}")

    return {
        "message": "A new verification code has been sent to your email.",
        "preview_otp": otp,
        "notice": f"Verification Code: {otp}"
    }


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has been deactivated"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address is not verified. Please verify your email.",
        )

    access_token = create_access_token(subject=str(user.id))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
