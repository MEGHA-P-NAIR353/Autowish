import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def build_otp_email_html(name: str, otp: str) -> str:
    """Builds a responsive, branded HTML email for password reset OTP verification."""
    # Split OTP with spacing for readability in the visual preview
    formatted_otp = ' '.join(list(str(otp).strip()))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - AutoWish AI</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 15px;
      box-sizing: border-box;
    }}
    .container {{
      max-width: 540px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }}
    .header {{
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #9333ea 100%);
      padding: 36px 30px;
      text-align: center;
    }}
    .logo-badge {{
      display: inline-block;
      width: 50px;
      height: 50px;
      line-height: 50px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      border-radius: 14px;
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }}
    .header h1 {{
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }}
    .content {{
      padding: 36px 32px;
      text-align: left;
      line-height: 1.6;
      color: #e2e8f0;
    }}
    .greeting {{
      font-size: 18px;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 12px;
    }}
    .text {{
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 24px;
    }}
    .otp-card {{
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
      margin: 28px 0;
    }}
    .otp-label {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #818cf8;
      margin-bottom: 12px;
    }}
    .otp-code {{
      font-family: 'SF Pro Mono', 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #ffffff;
      margin: 0;
      padding-left: 8px;
      text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
    }}
    .otp-expiry {{
      font-size: 12px;
      color: #f43f5e;
      font-weight: 500;
      margin-top: 14px;
    }}
    .security-notice {{
      background: rgba(244, 63, 94, 0.08);
      border-left: 3px solid #f43f5e;
      padding: 14px 16px;
      border-radius: 8px;
      margin-top: 24px;
      font-size: 12px;
      color: #cbd5e1;
    }}
    .footer {{
      background: #090d16;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }}
    .footer p {{
      margin: 4px 0;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">A</div>
        <h1>Password Reset Verification</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello {name},</div>
        <p class="text">
          We received a request to reset the password for your AutoWish AI account. 
          Please use the single-use verification code below to verify your identity:
        </p>

        <div class="otp-card">
          <div class="otp-label">Verification Code</div>
          <div class="otp-code">{formatted_otp}</div>
          <div class="otp-expiry">⏳ This code expires in 5 minutes</div>
        </div>

        <p class="text">
          Enter this code on the password reset screen to set a new password for your account.
        </p>

        <div class="security-notice">
          <strong>Security Notice:</strong> Never share this code with anyone. AutoWish AI support will never ask for your verification code. If you did not request this password reset, please ignore this email or review your account security immediately.
        </div>
      </div>
      <div class="footer">
        <p>AutoWish AI — Automated Joyful Moments</p>
        <p>© 2026 AutoWish AI. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>"""


def send_password_reset_otp_email(recipient_email: str, otp: str, user=None) -> tuple[bool, str | None]:
    """
    Sends a password reset OTP verification email using Django's email backend.
    Supports Gmail SMTP via environment variables.
    Never logs the OTP value itself.
    Returns (success, error_message).
    """
    name = (user.first_name if (user and user.first_name) else None) or "there"
    subject = "Password Reset Verification Code - AutoWish AI"

    plain_message = (
        f"Hello {name},\n\n"
        f"We received a request to reset your AutoWish AI password.\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code will expire in 5 minutes.\n\n"
        f"If you did not request a password reset, you can safely ignore this email.\n\n"
        f"— AutoWish AI Team"
    )

    html_message = build_otp_email_html(name, otp)

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'autowish.ai@gmail.com')
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=from_email,
            to=[recipient_email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)
        logger.info(f"Successfully dispatched password reset OTP email to {recipient_email}")
        return True, None
    except Exception as e:
        logger.error(f"Failed to deliver password reset OTP email to {recipient_email}: {e}")
        return False, str(e)
