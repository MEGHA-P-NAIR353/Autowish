import json
from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core import mail
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.test import APIClient

from core.models import PasswordResetOTP


class ForgotPasswordOTPTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.email = "testuser@example.com"
        self.password = "InitialPassword123!"
        self.user = User.objects.create_user(
            username="testuser",
            email=self.email,
            password=self.password,
            first_name="Test"
        )

    def test_unknown_email_returns_generic_response_no_enumeration(self):
        """Requesting reset for non-existent email returns generic 200 without sending email."""
        resp = self.client.post('/api/auth/forgot-password/', {'email': 'unknown@example.com'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("If an account with that email exists", resp.data.get('message', ''))
        # No email sent for unknown users
        self.assertEqual(len(mail.outbox), 0)

    def test_otp_generation_and_email_delivery(self):
        """Requesting reset for registered email creates OTP record and sends branded email."""
        resp = self.client.post('/api/auth/forgot-password/', {'email': self.email})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("If an account with that email exists", resp.data.get('message', ''))

        # Check OTP record in DB
        otp_records = PasswordResetOTP.objects.filter(email=self.email, is_used=False)
        self.assertEqual(otp_records.count(), 1)
        record = otp_records.first()
        self.assertFalse(record.is_verified)
        self.assertFalse(record.is_used)
        self.assertFalse(record.is_invalidated)
        # Ensure raw OTP is NOT stored in plain text
        self.assertTrue(record.otp_hash.startswith('pbkdf2_') or record.otp_hash.startswith('argon2'))

        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, [self.email])
        self.assertIn("Password Reset Verification Code", sent_email.subject)
        # Check that HTML alternative was attached
        self.assertTrue(any(alt[1] == "text/html" for alt in sent_email.alternatives))

    def test_resend_cooldown_enforced(self):
        """Requesting OTP again within cooldown period returns 429 Too Many Requests."""
        # First request
        resp1 = self.client.post('/api/auth/forgot-password/', {'email': self.email})
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Immediate second request should be throttled
        resp2 = self.client.post('/api/auth/forgot-password/', {'email': self.email})
        self.assertEqual(resp2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('cooldown_seconds', resp2.data)

    def test_invalidation_of_older_otps(self):
        """When a new OTP is issued (after cooldown), prior active OTPs are invalidated."""
        # Create an existing OTP from 2 minutes ago
        past_time = timezone.now() - timedelta(minutes=2)
        old_record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("111111"),
            expires_at=timezone.now() + timedelta(minutes=3),
        )
        PasswordResetOTP.objects.filter(id=old_record.id).update(created_at=past_time)

        # Request new OTP
        resp = self.client.post('/api/auth/forgot-password/', {'email': self.email})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        old_record.refresh_from_db()
        self.assertTrue(old_record.is_invalidated)

    def test_correct_otp_verification_issues_reset_token(self):
        """Verifying correct OTP returns 200 and a secure single-use reset token."""
        raw_otp = "654321"
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password(raw_otp),
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        resp = self.client.post('/api/auth/verify-reset-otp/', {
            'email': self.email,
            'otp': raw_otp
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('reset_token', resp.data)
        self.assertTrue(len(resp.data['reset_token']) > 20)

        record.refresh_from_db()
        self.assertTrue(record.is_verified)
        self.assertEqual(record.reset_token, resp.data['reset_token'])
        self.assertIsNotNone(record.verified_at)

    def test_incorrect_otp_increments_attempts(self):
        """Incorrect OTP increments attempts counter and warns user of remaining attempts."""
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        resp = self.client.post('/api/auth/verify-reset-otp/', {
            'email': self.email,
            'otp': "999999"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['attempts_remaining'], 4)

        record.refresh_from_db()
        self.assertEqual(record.attempts, 1)

    def test_five_attempt_limit_invalidates_otp(self):
        """After 5 failed attempts, the OTP is invalidated and further attempts rejected."""
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=5),
            attempts=4
        )

        # 5th attempt (fails)
        resp = self.client.post('/api/auth/verify-reset-otp/', {
            'email': self.email,
            'otp': "000000"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data.get('attempts_remaining'), 0)

        record.refresh_from_db()
        self.assertEqual(record.attempts, 5)
        self.assertTrue(record.is_invalidated)

        # 6th attempt with the correct OTP should now be rejected because it's invalidated
        resp_correct = self.client.post('/api/auth/verify-reset-otp/', {
            'email': self.email,
            'otp': "123456"
        })
        self.assertEqual(resp_correct.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_otp_rejected(self):
        """Expired OTP is rejected."""
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("123456"),
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        resp = self.client.post('/api/auth/verify-reset-otp/', {
            'email': self.email,
            'otp': "123456"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", resp.data.get('error', '').lower())

    def test_reused_otp_rejected(self):
        """An already verified OTP cannot be verified again."""
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=True,
            reset_token="some-token"
        )

        resp = self.client.post('/api/auth/verify-reset-otp/', {
            'email': self.email,
            'otp': "123456"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_successful_password_reset_and_login_with_new_password(self):
        """End-to-end flow: verified reset token resets password, old password is rejected, new works."""
        token = "test-reset-authorization-token-secure-12345"
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=True,
            reset_token=token,
            reset_token_expires_at=timezone.now() + timedelta(minutes=15)
        )

        new_pass = "BrandNewSecurePassword2026!"

        # Reset password
        resp = self.client.post('/api/auth/reset-password/', {
            'reset_token': token,
            'password': new_pass,
            'confirm_password': new_pass
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("successfully", resp.data.get('message', '').lower())

        # Verify record is marked as used and invalidated
        record.refresh_from_db()
        self.assertTrue(record.is_used)
        self.assertTrue(record.is_invalidated)

        # Attempt to login with OLD password -> should fail
        old_login = self.client.post('/api/auth/login/', {
            'email': self.email,
            'password': self.password
        })
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # Attempt to login with NEW password -> should succeed
        new_login = self.client.post('/api/auth/login/', {
            'email': self.email,
            'password': new_pass
        })
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        self.assertIn('access', new_login.data)

    def test_reset_authorization_single_use(self):
        """A reset token cannot be reused to change password again."""
        token = "single-use-token-abc123xyz456"
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=True,
            reset_token=token,
            reset_token_expires_at=timezone.now() + timedelta(minutes=15)
        )

        # First reset -> OK
        resp1 = self.client.post('/api/auth/reset-password/', {
            'reset_token': token,
            'password': "NewStrongPassword1!",
            'confirm_password': "NewStrongPassword1!"
        })
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second reset with SAME token -> must be rejected
        resp2 = self.client.post('/api/auth/reset-password/', {
            'reset_token': token,
            'password': "AnotherPassword2!",
            'confirm_password': "AnotherPassword2!"
        })
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_reset_authorization_rejected(self):
        """Expired reset token is rejected."""
        token = "expired-token-12345"
        record = PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=True,
            reset_token=token,
            reset_token_expires_at=timezone.now() - timedelta(minutes=1)
        )

        resp = self.client.post('/api/auth/reset-password/', {
            'reset_token': token,
            'password': "NewStrongPassword1!",
            'confirm_password': "NewStrongPassword1!"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", resp.data.get('error', '').lower())

    def test_mismatched_password_rejected(self):
        """Mismatched password and confirm_password are rejected."""
        token = "test-token-mismatch"
        PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=True,
            reset_token=token,
            reset_token_expires_at=timezone.now() + timedelta(minutes=15)
        )

        resp = self.client.post('/api/auth/reset-password/', {
            'reset_token': token,
            'password': "PasswordA123!",
            'confirm_password': "PasswordB456!"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("match", str(resp.data).lower())

    def test_weak_password_rejected(self):
        """Passwords failing Django validators (e.g. too short) are rejected."""
        token = "test-token-short-pass"
        PasswordResetOTP.objects.create(
            user=self.user,
            email=self.email,
            otp_hash=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=True,
            reset_token=token,
            reset_token_expires_at=timezone.now() + timedelta(minutes=15)
        )

        resp = self.client.post('/api/auth/reset-password/', {
            'reset_token': token,
            'password': "short",
            'confirm_password': "short"
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_malicious_request_rejected(self):
        """Empty, non-existent, or forged tokens are rejected."""
        resp = self.client.post('/api/auth/reset-password/', {
            'reset_token': 'completely-forged-token-9999999',
            'password': 'SomeStrongPassword123!',
            'confirm_password': 'SomeStrongPassword123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_existing_registration_and_login_preserved(self):
        """Verify that existing user registration and login workflows work seamlessly without regressions."""
        # 1. Register new user
        reg_payload = {
            'name': 'New Member',
            'email': 'newmember@example.com',
            'password': 'StrongSecurePass2026!'
        }
        reg_resp = self.client.post('/api/auth/register/', reg_payload)
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', reg_resp.data)

        # 2. Login newly registered user
        login_resp = self.client.post('/api/auth/login/', {
            'email': 'newmember@example.com',
            'password': 'StrongSecurePass2026!'
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)
        self.assertIn('refresh', login_resp.data)

