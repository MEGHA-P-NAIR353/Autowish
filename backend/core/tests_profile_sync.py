"""
Tests for user name synchronization between profile update, authentication,
audit logging, and administrator notifications.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from core.models import AuditLog, Notification


class ProfileNameSyncTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='megha_user',
            email='megha@example.com',
            password='pass12345',
            first_name='Megha',
            last_name='P Nair',
        )
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='pass12345',
            is_staff=True,
        )
        self.admin.profile.role = 'admin'
        self.admin.profile.save()

    def test_1_user_changes_first_name_persists_and_returns_updated(self):
        """1. A user changes their first name; the database and profile API return the updated value."""
        self.client.force_authenticate(user=self.user)
        res = self.client.patch('/api/auth/profile/', {'first_name': 'Athul'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['first_name'], 'Athul')
        self.assertEqual(res.data['last_name'], 'P Nair')
        self.assertEqual(res.data['display_name'], 'Athul P Nair')
        self.assertEqual(res.data['full_name'], 'Athul P Nair')

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Athul')

    def test_2_user_changes_last_name_persists(self):
        """2. A user changes their last name; the updated value is persisted."""
        self.client.force_authenticate(user=self.user)
        res = self.client.patch('/api/auth/profile/', {'last_name': 'S'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['last_name'], 'S')
        self.assertEqual(res.data['display_name'], 'Megha S')

        self.user.refresh_from_db()
        self.assertEqual(self.user.last_name, 'S')

    def test_3_fresh_profile_and_login_return_persisted_name(self):
        """3 & 4. A fresh profile load and fresh login show the persisted name."""
        self.user.first_name = 'Athul'
        self.user.last_name = 'S'
        self.user.save()

        # Fresh profile GET
        self.client.force_authenticate(user=self.user)
        profile_res = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_res.status_code, 200)
        self.assertEqual(profile_res.data['first_name'], 'Athul')
        self.assertEqual(profile_res.data['last_name'], 'S')
        self.assertEqual(profile_res.data['display_name'], 'Athul S')

        # Fresh login
        self.client.force_authenticate(user=None)
        login_res = self.client.post('/api/auth/login/', {
            'email': 'megha@example.com',
            'password': 'pass12345'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.data['user']['first_name'], 'Athul')
        self.assertEqual(login_res.data['user']['last_name'], 'S')
        self.assertEqual(login_res.data['user']['display_name'], 'Athul S')

    def test_4_audit_log_records_correct_actor_and_old_new_names(self):
        """5. The audit log records the correct actor ID and old/new names."""
        self.client.force_authenticate(user=self.user)
        res = self.client.patch('/api/auth/profile/', {
            'first_name': 'Athul',
            'last_name': 'S',
        }, format='json')
        self.assertEqual(res.status_code, 200)

        log = AuditLog.objects.filter(action='profile_name_changed').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_id, self.user.id)
        self.assertEqual(log.previous_name, 'Megha P Nair')
        self.assertEqual(log.updated_name, 'Athul S')
        self.assertEqual(log.actor_name, 'Athul S')
        self.assertEqual(log.event_type, 'profile_name_changed')
        self.assertIn('Athul S changed their profile name from Megha P Nair to Athul S.', log.details)

    def test_5_subsequent_login_event_does_not_display_stale_name(self):
        """6. A subsequent login event does not display a stale hardcoded name."""
        self.client.force_authenticate(user=self.user)
        self.client.patch('/api/auth/profile/', {
            'first_name': 'Athul',
            'last_name': 'S',
        }, format='json')

        # Perform login after name change
        self.client.force_authenticate(user=None)
        login_res = self.client.post('/api/auth/login/', {
            'email': 'megha@example.com',
            'password': 'pass12345'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)

        login_log = AuditLog.objects.filter(action='Login').order_by('-created_at').first()
        self.assertIsNotNone(login_log)
        self.assertEqual(login_log.actor_name, 'Athul S')

        # Verify admin audit log API serializes the login log with the correct display name
        self.client.force_authenticate(user=self.admin)
        admin_logs_res = self.client.get('/api/admin/audit-logs/')
        self.assertEqual(admin_logs_res.status_code, 200)
        logs_data = admin_logs_res.data.get('results', admin_logs_res.data)
        latest_login = next(l for l in logs_data if l['id'] == login_log.id)
        self.assertEqual(latest_login['display_name'], 'Athul S')
        self.assertEqual(latest_login['username'], 'Athul S')

    def test_6_multiple_consecutive_name_changes_retain_historical_names(self):
        """7. Multiple consecutive name changes retain the correct historical names."""
        self.client.force_authenticate(user=self.user)

        # First change: Megha P Nair -> Athul S
        res1 = self.client.patch('/api/auth/profile/', {'first_name': 'Athul', 'last_name': 'S'}, format='json')
        self.assertEqual(res1.status_code, 200)

        # Second change: Athul S -> Rohan V
        res2 = self.client.patch('/api/auth/profile/', {'first_name': 'Rohan', 'last_name': 'V'}, format='json')
        self.assertEqual(res2.status_code, 200)

        logs = list(AuditLog.objects.filter(action='profile_name_changed').order_by('created_at'))
        self.assertEqual(len(logs), 2)

        # First event preserved
        self.assertEqual(logs[0].previous_name, 'Megha P Nair')
        self.assertEqual(logs[0].updated_name, 'Athul S')
        self.assertEqual(logs[0].actor_name, 'Athul S')

        # Second event preserved
        self.assertEqual(logs[1].previous_name, 'Athul S')
        self.assertEqual(logs[1].updated_name, 'Rohan V')
        self.assertEqual(logs[1].actor_name, 'Rohan V')

    def test_7_saving_unchanged_name_does_not_create_duplicate_events(self):
        """8. Saving an unchanged name does not create duplicate name-change events."""
        self.client.force_authenticate(user=self.user)

        # Save identical name
        res = self.client.patch('/api/auth/profile/', {
            'first_name': 'Megha',
            'last_name': 'P Nair',
        }, format='json')
        self.assertEqual(res.status_code, 200)

        # No profile_name_changed audit logs created
        self.assertEqual(AuditLog.objects.filter(action='profile_name_changed').count(), 0)
        self.assertEqual(Notification.objects.filter(event_type='profile_name_changed').count(), 0)

    def test_8_authorized_administrator_receives_persistent_notification(self):
        """9. An authorized administrator receives the persistent notification."""
        self.client.force_authenticate(user=self.user)
        res = self.client.patch('/api/auth/profile/', {
            'first_name': 'Athul',
            'last_name': 'S',
        }, format='json')
        self.assertEqual(res.status_code, 200)

        # Check notification for admin
        notif = Notification.objects.filter(user=self.admin, event_type='profile_name_changed').first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.title, 'User Profile Name Changed')
        self.assertEqual(notif.message, 'Athul S changed their profile name from Megha P Nair to Athul S.')
        self.assertEqual(notif.category, 'User Management')
        self.assertEqual(notif.related_user_id, self.user.id)
        self.assertFalse(notif.is_read)

        # Verify admin notifications API returns it
        self.client.force_authenticate(user=self.admin)
        notif_res = self.client.get('/api/notifications/')
        self.assertEqual(notif_res.status_code, 200)
        results = notif_res.data.get('results', notif_res.data)
        admin_notif = next(n for n in results if n['id'] == notif.id)
        self.assertEqual(admin_notif['category'], 'User Management')
        self.assertEqual(admin_notif['related_user_id'], self.user.id)

    def test_9_ordinary_user_cannot_access_admin_audit_logs(self):
        """10. An ordinary user cannot access administrative audit data."""
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/admin/audit-logs/')
        self.assertEqual(res.status_code, 403)

    def test_10_invalid_profile_updates_do_not_create_false_audit_or_notifications(self):
        """11. Invalid profile updates do not create false audit events or notifications."""
        self.client.force_authenticate(user=self.user)

        # Attempt to set empty username or username taken by admin
        res = self.client.patch('/api/auth/profile/', {
            'username': 'admin_user',
            'first_name': 'Hacker',
        }, format='json')
        self.assertEqual(res.status_code, 400)

        # Database remained unchanged
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Megha')

        # No audit logs or notifications
        self.assertEqual(AuditLog.objects.filter(action='profile_name_changed').count(), 0)
        self.assertEqual(Notification.objects.filter(event_type='profile_name_changed').count(), 0)

    def test_11_audit_log_search_and_csv_fields(self):
        """12. Audit log search filtering and CSV-compatible field presence."""
        self.client.force_authenticate(user=self.user)
        self.client.patch('/api/auth/profile/', {'first_name': 'Athul', 'last_name': 'S'}, format='json')

        self.client.force_authenticate(user=self.admin)
        # Search by updated name
        res = self.client.get('/api/admin/audit-logs/?search=Athul')
        self.assertEqual(res.status_code, 200)
        results = res.data.get('results', res.data)
        self.assertTrue(any('Athul' in r['display_name'] for r in results))

        # Check all required fields are present in serialized output
        first_item = results[0]
        for field in ['id', 'user', 'username', 'display_name', 'actor_name', 'action', 'event_type', 'previous_name', 'updated_name', 'details', 'ip_address', 'created_at']:
            self.assertIn(field, first_item)
