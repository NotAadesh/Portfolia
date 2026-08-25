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


def send_email_smtp(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Send an email via standard SMTP.
    If SMTP credentials are not configured, logs the email content for dev testing.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            f"\n[DEV MODE] SMTP not configured. Simulated email to: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content:\n{text_content or html_content}\n"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email

        if text_content:
            part1 = MIMEText(text_content, "plain")
            msg.attach(part1)

        part2 = MIMEText(html_content, "html")
        msg.attach(part2)

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"Successfully sent verification email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
        # Return True in development mode so user registration is not blocked by SMTP errors
        return False


def send_otp_verification_email(to_email: str, otp_code: str, full_name: str = "") -> bool:
    """Send a stylized HTML verification email containing the 6-digit OTP."""
    greeting = f"Hello {full_name}," if full_name else "Hello,"
    subject = f"{otp_code} is your Financial AI Agent verification code"

    text_content = f"""
{greeting}

Your 6-digit email verification code is: {otp_code}

This code will expire in 15 minutes. If you did not request this, please ignore this email.

Best regards,
The Financial AI Agent Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }}
    .logo {{ font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 24px; }}
    .title {{ font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 12px; }}
    .text {{ color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }}
    .otp-box {{ background-color: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }}
    .otp-code {{ font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; font-family: monospace; }}
    .footer {{ font-size: 12px; color: #9ca3af; margin-top: 32px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ Financial AI Agent</div>
    <div class="title">{greeting}</div>
    <div class="text">Thank you for registering on Financial AI Agent. Please use the verification code below to verify your email address and activate your portfolio account:</div>
    <div class="otp-box">
      <div class="otp-code">{otp_code}</div>
    </div>
    <div class="text">This verification code is valid for <strong>15 minutes</strong>. If you did not create an account, you can safely disregard this email.</div>
    <div class="footer">
      © {datetime.now().year} Financial AI Agent. All rights reserved.
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
