import io
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Contact


class ContactCSVImportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='importuser', password='password123', email='import@test.com')
        self.user_b = User.objects.create_user(username='otheruser2', password='password123', email='other2@test.com')
        self.client.force_authenticate(user=self.user)

    def test_import_csv_persists_contacts_in_database(self):
        """Contacts imported via CSV must be saved to PostgreSQL and retrieved on subsequent GET requests."""
        csv_content = (
            "Name,Email,Phone,Birthday,Relationship\n"
            "Alice Smith,alice@example.com,+12025550123,1992-05-15,Friend\n"
            "Bob Jones,bob@example.com,+447911123456,1988-11-20,Colleague\n"
        )
        csv_file = SimpleUploadedFile("contacts.csv", csv_content.encode('utf-8'), content_type="text/csv")

        response = self.client.post('/api/contacts/import_csv/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['imported'], 2)
        self.assertEqual(response.data['duplicates_skipped'], 0)

        # Verify persistent in database
        self.assertEqual(Contact.objects.filter(user=self.user).count(), 2)
        alice = Contact.objects.get(user=self.user, email='alice@example.com')
        self.assertEqual(alice.name, 'Alice Smith')
        self.assertEqual(alice.phone, '+12025550123')
        self.assertEqual(alice.relationship, 'Friend')

        # Verify retrieved via subsequent contacts list request (simulating page reload)
        list_resp = self.client.get('/api/contacts/')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        contacts = list_resp.data if isinstance(list_resp.data, list) else list_resp.data.get('results', [])
        names = [c['name'] for c in contacts]
        self.assertIn('Alice Smith', names)
        self.assertIn('Bob Jones', names)

    def test_import_with_utf8_bom_excel_format(self):
        """Files exported from Microsoft Excel starting with UTF-8 BOM (\ufeff) must parse correctly."""
        csv_content = "\ufeffName,Email,Phone\nCarol White,carol@example.com,+919876543210\n"
        csv_file = SimpleUploadedFile("excel_contacts.csv", csv_content.encode('utf-8-sig'), content_type="text/csv")

        response = self.client.post('/api/contacts/import_csv/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['imported'], 1)

        carol = Contact.objects.get(user=self.user, email='carol@example.com')
        self.assertEqual(carol.name, 'Carol White')
        self.assertEqual(carol.phone, '+919876543210')

    def test_import_skips_duplicates_safely(self):
        """Duplicate contacts with the same email must be skipped and reported in duplicates_skipped."""
        # Existing contact
        Contact.objects.create(
            user=self.user,
            name='Existing User',
            email='existing@example.com',
            phone='+1234567890'
        )

        csv_content = (
            "Name,Email,Phone\n"
            "Existing User New Name,existing@example.com,+1234567890\n"
            "Fresh User,fresh@example.com,+9876543210\n"
            "Fresh User Repeat,fresh@example.com,+9876543210\n"
        )
        csv_file = SimpleUploadedFile("duplicates.csv", csv_content.encode('utf-8'), content_type="text/csv")

        response = self.client.post('/api/contacts/import_csv/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['imported'], 1)  # only fresh@example.com once
        self.assertEqual(response.data['duplicates_skipped'], 2)  # 1 against existing, 1 in file

        self.assertEqual(Contact.objects.filter(user=self.user).count(), 2)

    def test_user_ownership_strictly_enforced_on_import(self):
        """Imported contacts must always be assigned to authenticated user and isolated from other users."""
        csv_content = "Name,Email,Phone\nDavid Clark,david@example.com,+15555555555\n"
        csv_file = SimpleUploadedFile("david.csv", csv_content.encode('utf-8'), content_type="text/csv")

        response = self.client.post('/api/contacts/import_csv/', {'file': csv_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Contact must belong to self.user, not self.user_b
        david = Contact.objects.get(email='david@example.com')
        self.assertEqual(david.user, self.user)
        self.assertFalse(Contact.objects.filter(user=self.user_b, email='david@example.com').exists())

        # When user_b queries contacts, david is not visible
        self.client.force_authenticate(user=self.user_b)
        b_list = self.client.get('/api/contacts/')
        b_contacts = b_list.data if isinstance(b_list.data, list) else b_list.data.get('results', [])
        b_emails = [c['email'] for c in b_contacts]
        self.assertNotIn('david@example.com', b_emails)

    def test_missing_file_returns_error(self):
        """Submitting request without a file returns 400 Bad Request."""
        response = self.client.post('/api/contacts/import_csv/', {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No contact file provided', response.data['error'])
