import smtplib
import random
import string
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_otp(length: int = 6) -> str:
    """Generate a secure numeric OTP."""
    return "".join(random.choices(string.digits, k=length))


import requests

def send_email_resend_http(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Send email via Resend HTTPS REST API (Port 443).
    Bypasses cloud SMTP blocks completely.
    """
    if not settings.RESEND_API_KEY:
        return False

    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": settings.RESEND_FROM_EMAIL or "Portfolia <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=6)
        if resp.status_code in [200, 201]:
            logger.info(f"✅ Successfully sent email to {to_email} via Resend HTTPS REST API (ID: {resp.json().get('id')})")
            return True
        else:
            logger.warning(f"Resend HTTPS API returned status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        logger.warning(f"Failed to send email via Resend HTTPS API: {e}")
        return False


def send_email_smtp(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Send an email via Resend HTTPS API (Primary) with fallback to standard SMTP.
    """
    # 1. Primary: Try Resend HTTPS API (Port 443)
    if settings.RESEND_API_KEY:
        if send_email_resend_http(to_email, subject, html_content, text_content):
            return True

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            f"\n[DEV MODE] SMTP not configured. Simulated email to: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content:\n{text_content or html_content}\n"
        )
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to_email

    if text_content:
        part1 = MIMEText(text_content, "plain")
        msg.attach(part1)

    part2 = MIMEText(html_content, "html")
    msg.attach(part2)

    # Attempt 1: Direct SSL on Port 465 (Cloud & Render preferred)
    try:
        with smtplib.SMTP_SSL(settings.SMTP_SERVER, 465, timeout=3) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())
        logger.info(f"Successfully sent verification email to {to_email} via Port 465 SSL")
        return True
    except Exception as e_ssl:
        logger.warning(f"Port 465 SSL delivery attempt failed ({e_ssl}), trying Port 587 STARTTLS...")

    # Attempt 2: STARTTLS on Port 587
    try:
        with smtplib.SMTP(settings.SMTP_SERVER, 587, timeout=3) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())
        logger.info(f"Successfully sent verification email to {to_email} via Port 587 STARTTLS")
        return True
    except Exception as e_tls:
        logger.error(f"Failed to send email to {to_email} via both 465 and 587: {e_tls}")
        return False


def send_otp_verification_email(to_email: str, otp_code: str, full_name: str = "") -> bool:
    """Send a stylized HTML verification email containing the 6-digit OTP."""
    logger.info(f"🔐 Verification OTP for {to_email}: [{otp_code}]")
    greeting = f"Hello {full_name}," if full_name else "Hello,"
    subject = f"{otp_code} is your Portfolia verification code"

    text_content = f"""
{greeting}

Your 6-digit Portfolia email verification code is: {otp_code}

This code will expire in 15 minutes. If you did not request this, please ignore this email.

Best regards,
The Portfolia Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
    .logo-container {{ display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }}
    .brand {{ font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; }}
    .badge {{ background: #2563eb; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-left: 8px; text-transform: uppercase; }}
    .title {{ font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .text {{ color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }}
    .otp-box {{ background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 2px dashed #3b82f6; border-radius: 12px; text-align: center; padding: 24px; margin: 24px 0; }}
    .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; }}
    .footer {{ font-size: 12px; color: #94a3b8; margin-top: 32px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <span class="brand">Portfolia</span>
      <span class="badge">Institutional</span>
    </div>
    <div class="title">{greeting}</div>
    <div class="text">Thank you for registering on <strong>Portfolia</strong>. Please use the verification code below to verify your email address and activate your live Demat workspace:</div>
    <div class="otp-box">
      <div class="otp-code">{otp_code}</div>
    </div>
    <div class="text">This verification code is valid for <strong>15 minutes</strong>. If you did not create an account, you can safely disregard this email.</div>
    <div class="footer">
      © {datetime.now().year} Portfolia Institutional Terminal. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

    return send_email_smtp(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )
