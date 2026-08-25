from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

import app.db.base
from app.db.session import get_db
from app.api.deps import get_current_superadmin
from app.models.user import User, UserRole
from app.models.portfolio import Portfolio, PortfolioAsset
from app.schemas.user import UserResponse, UserAdminUpdate

router = APIRouter(prefix="/admin", tags=["Superadmin Management"])


class AdminUserDetail(BaseModel):
    id: int
    email: str
    full_name: str = None
    role: str
    is_active: bool
    is_verified: bool
    portfolio_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class GlobalPortfolioDetail(BaseModel):
    id: int
    user_id: int
    owner_email: str
    name: str
    initial_investment: float
    horizon_years: int
    expected_return: float = None
    volatility: float = None
    sharpe_ratio: float = None
    tickers: List[str] = []
    created_at: datetime


class AdminMetricsResponse(BaseModel):
    total_users: int
    verified_users: int
    unverified_users: int
    total_portfolios: int
    total_simulated_capital: float
    average_expected_return: float
    popular_stocks: List[Dict[str, Any]]


# ----------------------------------------------------
# 1. Platform Metrics & Analytics
# ----------------------------------------------------
@router.get("/metrics", response_model=AdminMetricsResponse)
def get_platform_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_superadmin)
):
    total_users = db.query(User).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    unverified_users = total_users - verified_users

    total_portfolios = db.query(Portfolio).count()
    capital_sum = db.query(func.sum(Portfolio.initial_investment)).scalar() or 0.0
    avg_return = db.query(func.avg(Portfolio.expected_return)).scalar() or 0.0

    # Calculate most popular tickers in portfolios
    popular_assets = db.query(
        PortfolioAsset.ticker,
        func.count(PortfolioAsset.id).label("count")
    ).group_by(PortfolioAsset.ticker).order_by(func.count(PortfolioAsset.id).desc()).limit(10).all()

    popular_stocks = [{"ticker": row[0], "count": row[1]} for row in popular_assets]

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "unverified_users": unverified_users,
        "total_portfolios": total_portfolios,
        "total_simulated_capital": round(float(capital_sum), 2),
        "average_expected_return": round(float(avg_return), 2),
        "popular_stocks": popular_stocks
    }


# ----------------------------------------------------
# 2. User Management (List, Update Role/Status, Delete)
# ----------------------------------------------------
@router.get("/users", response_model=List[AdminUserDetail])
def list_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_superadmin)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        p_count = db.query(Portfolio).filter(Portfolio.user_id == u.id).count()
        result.append(AdminUserDetail(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            is_verified=u.is_verified,
            portfolio_count=p_count,
            created_at=u.created_at
        ))
    return result


@router.put("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    data: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_superadmin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin.id and data.role and data.role != UserRole.SUPERADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote yourself from superadmin"
        )

    if data.role is not None:
        if data.role not in [r.value for r in UserRole]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {data.role}")
        user.role = data.role

    if data.is_active is not None:
        user.is_active = data.is_active

    if data.is_verified is not None:
        user.is_verified = data.is_verified

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_superadmin)
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own superadmin account"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} and all associated data deleted successfully"}


# ----------------------------------------------------
# 3. Global Portfolios Inspector
# ----------------------------------------------------
@router.get("/portfolios", response_model=List[GlobalPortfolioDetail])
def list_global_portfolios(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_superadmin)
):
    portfolios = db.query(Portfolio).order_by(Portfolio.created_at.desc()).all()
    result = []
    for p in portfolios:
        owner = db.query(User).filter(User.id == p.user_id).first()
        assets = db.query(PortfolioAsset).filter(PortfolioAsset.portfolio_id == p.id).all()
        result.append(GlobalPortfolioDetail(
            id=p.id,
            user_id=p.user_id,
            owner_email=owner.email if owner else "Unknown",
            name=p.name,
            initial_investment=p.initial_investment,
            horizon_years=p.horizon_years,
            expected_return=p.expected_return,
            volatility=p.volatility,
            sharpe_ratio=p.sharpe_ratio,
            tickers=[a.ticker for a in assets],
            created_at=p.created_at
        ))
    return result
