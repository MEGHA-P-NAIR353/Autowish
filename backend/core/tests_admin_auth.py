from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from core.models import UserProfile
from core.admin_provisioning import ensure_admin_user


class AdminAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.test_admin_email = "testadmin@autowish.ai"
        self.test_admin_password = "SecureAdminPassword2026!"
        self.normal_user_email = "regularuser@autowish.ai"
        self.normal_user_password = "RegularUserPassword123!"

        # Create regular user
        self.normal_user = User.objects.create_user(
            username="regularuser",
            email=self.normal_user_email,
            password=self.normal_user_password
        )

    def test_admin_idempotent_provisioning_and_login(self):
        """Verify that an unprovisioned admin account is automatically provisioned and authenticated."""
        with override_settings(
            ADMIN_EMAIL=self.test_admin_email,
            ADMIN_PASSWORD=self.test_admin_password,
            ALLOWED_HOSTS=['*']
        ):
            # Ensure admin does not exist yet
            User.objects.filter(email__iexact=self.test_admin_email).delete()

            # Attempt login with configured credentials
            response = self.client.post(
                '/api/auth/login/',
                {'email': self.test_admin_email, 'password': self.test_admin_password},
                format='json'
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('access', response.data)
            self.assertIn('refresh', response.data)
            user_data = response.data.get('user', {})
            self.assertEqual(user_data.get('email'), self.test_admin_email)
            self.assertTrue(user_data.get('is_staff'))
            self.assertTrue(user_data.get('is_superuser'))
            self.assertEqual(user_data.get('profile', {}).get('role'), 'super_admin')

            # Verify in database
            db_admin = User.objects.get(email__iexact=self.test_admin_email)
            self.assertTrue(db_admin.is_staff)
            self.assertTrue(db_admin.is_superuser)
            self.assertEqual(db_admin.profile.role, 'super_admin')

    def test_admin_case_insensitive_and_whitespace_login(self):
        """Admin login succeeds with mixed casing and leading/trailing whitespace."""
        with override_settings(
            ADMIN_EMAIL=self.test_admin_email,
            ADMIN_PASSWORD=self.test_admin_password,
            ALLOWED_HOSTS=['*']
        ):
            # Provision admin
            ensure_admin_user(self.test_admin_email, self.test_admin_password)

            # Mixed-case and padded email login
            padded_email = f"  {self.test_admin_email.upper()}  "
            response = self.client.post(
                '/api/auth/login/',
                {'email': padded_email, 'password': self.test_admin_password},
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('access', response.data)

    def test_admin_username_login(self):
        """Admin can log in using their username instead of email."""
        with override_settings(
            ADMIN_EMAIL=self.test_admin_email,
            ADMIN_PASSWORD=self.test_admin_password,
            ALLOWED_HOSTS=['*']
        ):
            admin_user = ensure_admin_user(self.test_admin_email, self.test_admin_password)

            response = self.client.post(
                '/api/auth/login/',
                {'email': admin_user.username, 'password': self.test_admin_password},
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_invalid_password_rejected(self):
        """Admin login with wrong password fails with 401."""
        with override_settings(
            ADMIN_EMAIL=self.test_admin_email,
            ADMIN_PASSWORD=self.test_admin_password,
            ALLOWED_HOSTS=['*']
        ):
            ensure_admin_user(self.test_admin_email, self.test_admin_password)

            response = self.client.post(
                '/api/auth/login/',
                {'email': self.test_admin_email, 'password': 'WrongPassword999!'},
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertEqual(response.data.get('error'), 'Invalid email or password')

    def test_unprovisioned_admin_wrong_password_does_not_create_account(self):
        """Attempting to log in with admin email and wrong password does not provision account."""
        unprovisioned_email = "nevercreated@autowish.ai"
        with override_settings(
            ADMIN_EMAIL=unprovisioned_email,
            ADMIN_PASSWORD=self.test_admin_password,
            ALLOWED_HOSTS=['*']
        ):
            response = self.client.post(
                '/api/auth/login/',
                {'email': unprovisioned_email, 'password': 'IncorrectPassword!'},
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertFalse(User.objects.filter(email__iexact=unprovisioned_email).exists())

    def test_jwt_admin_api_access(self):
        """Admin JWT token has access to admin-only APIs."""
        with override_settings(
            ADMIN_EMAIL=self.test_admin_email,
            ADMIN_PASSWORD=self.test_admin_password,
            ALLOWED_HOSTS=['*']
        ):
            ensure_admin_user(self.test_admin_email, self.test_admin_password)

            login_resp = self.client.post(
                '/api/auth/login/',
                {'email': self.test_admin_email, 'password': self.test_admin_password},
                format='json'
            )
            token = login_resp.data['access']

            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            stats_resp = self.client.get('/api/admin/dashboard/stats/')
            self.assertEqual(stats_resp.status_code, status.HTTP_200_OK)
            self.assertIn('totalUsers', stats_resp.data)

    def test_regular_user_denied_admin_api(self):
        """Regular users are forbidden (403) from accessing admin endpoints."""
        with override_settings(ALLOWED_HOSTS=['*']):
            login_resp = self.client.post(
                '/api/auth/login/',
                {'email': self.normal_user_email, 'password': self.normal_user_password},
                format='json'
            )
            self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
            token = login_resp.data['access']

            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            stats_resp = self.client.get('/api/admin/dashboard/stats/')
            self.assertEqual(stats_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_registration_and_login_unaffected(self):
        """Normal registration and login flow continues to operate properly."""
        with override_settings(ALLOWED_HOSTS=['*']):
            reg_resp = self.client.post(
                '/api/auth/register/',
                {
                    'name': 'Fresh User',
                    'email': 'freshuser@autowish.ai',
                    'password': 'FreshPassword123!'
                },
                format='json'
            )
            self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
            self.assertIn('access', reg_resp.data)

            login_resp = self.client.post(
                '/api/auth/login/',
                {
                    'email': 'freshuser@autowish.ai',
                    'password': 'FreshPassword123!'
                },
                format='json'
            )
            self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(login_resp.data.get('user', {}).get('profile', {}).get('role'), 'free')
            self.assertFalse(login_resp.data.get('user', {}).get('is_staff'))
            self.assertFalse(login_resp.data.get('user', {}).get('is_superuser'))

    def test_idempotent_provisioning_avoids_duplicate_users(self):
        """Calling ensure_admin_user multiple times never creates duplicates."""
        with override_settings(
            ADMIN_EMAIL=self.test_admin_email,
            ADMIN_PASSWORD=self.test_admin_password
        ):
            u1 = ensure_admin_user(self.test_admin_email, self.test_admin_password)
            u2 = ensure_admin_user(self.test_admin_email, self.test_admin_password)
            self.assertEqual(u1.id, u2.id)
            self.assertEqual(User.objects.filter(email__iexact=self.test_admin_email).count(), 1)
