from django.test import TestCase
from django.contrib.auth.models import User
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status
from core.models import WishTemplate, UserProfile, GreetingTemplate, AIPrompt


class WishTemplateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create admin user
        self.admin_user = User.objects.create_superuser(
            username="adminuser",
            email="admin@autowish.ai",
            password="AdminPassword123!"
        )
        p_admin, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        p_admin.role = "admin"
        p_admin.save()

        # Create regular user
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="regular@autowish.ai",
            password="UserPassword123!"
        )
        p_reg, _ = UserProfile.objects.get_or_create(user=self.regular_user)
        p_reg.role = "free"
        p_reg.save()

        # Create second regular user for favorite isolation testing
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@autowish.ai",
            password="OtherPassword123!"
        )
        p_other, _ = UserProfile.objects.get_or_create(user=self.other_user)
        p_other.role = "free"
        p_other.save()

    # ─── 1. Admin Template Management Tests ───────────────────────────────────

    def test_admin_can_create_wish_template(self):
        """Verify an administrator can create a greeting template."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Joyful Birthday Celebration",
            "occasion": "Birthday",
            "tone": "Friendly",
            "language": "en",
            "status": "published",
            "message": "Happy Birthday {{name}}! May your year ahead be filled with laughter and success! 🎉",
        }
        response = self.client.post('/api/admin/templates/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], "Joyful Birthday Celebration")
        self.assertEqual(response.data['occasion'], "Birthday")
        self.assertTrue(response.data['is_published'])
        self.assertEqual(response.data['content'], payload['message'])

        # Verify saved in database
        self.assertTrue(WishTemplate.objects.filter(name="Joyful Birthday Celebration").exists())

    def test_admin_can_edit_wish_template(self):
        """Verify an administrator can edit an existing template."""
        template = WishTemplate.objects.create(
            name="Initial Title",
            message="Original message for {{name}}.",
            occasion="Birthday",
            tone="Friendly",
            status="published",
            is_published=True,
            created_by=self.admin_user
        )
        self.client.force_authenticate(user=self.admin_user)
        update_payload = {
            "name": "Updated Title",
            "message": "Updated celebration message for {{name}}! 🎂",
            "tone": "Heartfelt",
        }
        response = self.client.patch(f'/api/admin/templates/{template.id}/', update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Updated Title")
        self.assertEqual(response.data['tone'], "Heartfelt")

        template.refresh_from_db()
        self.assertEqual(template.name, "Updated Title")
        self.assertEqual(template.tone, "Heartfelt")

    def test_admin_can_unpublish_and_publish_template(self):
        """Verify an admin can toggle, publish, and unpublish templates."""
        template = WishTemplate.objects.create(
            name="Publishable Template",
            message="Congratulations on your anniversary {{name}}!",
            occasion="Anniversary",
            status="published",
            is_published=True,
            created_by=self.admin_user
        )
        self.client.force_authenticate(user=self.admin_user)

        # Unpublish
        unpub_res = self.client.post(f'/api/admin/templates/{template.id}/unpublish/')
        self.assertEqual(unpub_res.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertFalse(template.is_published)
        self.assertEqual(template.status, "draft")

        # Publish
        pub_res = self.client.post(f'/api/admin/templates/{template.id}/publish/')
        self.assertEqual(pub_res.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertTrue(template.is_published)
        self.assertEqual(template.status, "published")

        # Toggle publish
        toggle_res = self.client.post(f'/api/admin/templates/{template.id}/toggle_publish/')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertFalse(template.is_published)

    def test_admin_can_delete_template(self):
        """Verify an admin can delete a template."""
        template = WishTemplate.objects.create(
            name="To Be Deleted",
            message="Short message.",
            occasion="Custom",
            status="draft",
            is_published=False,
            created_by=self.admin_user
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/admin/templates/{template.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WishTemplate.objects.filter(id=template.id).exists())

    def test_admin_stats_endpoint(self):
        """Verify admin stats endpoint returns correct counts."""
        WishTemplate.objects.all().delete()
        WishTemplate.objects.create(name="T1", message="Msg 1", status="published", is_published=True)
        WishTemplate.objects.create(name="T2", message="Msg 2", status="draft", is_published=False)
        WishTemplate.objects.create(name="T3", message="Msg 3", status="archived", is_published=False)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/templates/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 3)
        self.assertEqual(response.data['published'], 1)
        self.assertEqual(response.data['drafts'], 1)
        self.assertEqual(response.data['archived'], 1)

    # ─── 2. User-Facing Wish Templates Endpoint Tests ─────────────────────────

    def test_regular_user_only_sees_published_templates(self):
        """Verify regular users only see published templates and never drafts or archived."""
        WishTemplate.objects.all().delete()
        pub = WishTemplate.objects.create(
            name="Public Birthday Template",
            message="Happy Birthday {{name}}!",
            occasion="Birthday",
            status="published",
            is_published=True
        )
        draft = WishTemplate.objects.create(
            name="Secret Draft Template",
            message="Draft internal message.",
            occasion="Birthday",
            status="draft",
            is_published=False
        )
        archived = WishTemplate.objects.create(
            name="Old Archived Template",
            message="Archived message.",
            occasion="Festival",
            status="archived",
            is_published=False
        )

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/templates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        names = [item['name'] for item in results]
        self.assertIn("Public Birthday Template", names)
        self.assertNotIn("Secret Draft Template", names)
        self.assertNotIn("Old Archived Template", names)

    def test_unpublishing_removes_template_from_user_view(self):
        """Verify unpublishing a template immediately hides it from regular users."""
        template = WishTemplate.objects.create(
            name="Temporary Live Template",
            message="Now you see me.",
            occasion="Festival",
            status="published",
            is_published=True
        )

        # Visible initially
        self.client.force_authenticate(user=self.regular_user)
        res1 = self.client.get('/api/templates/')
        names1 = [t['name'] for t in res1.data.get('results', res1.data)]
        self.assertIn("Temporary Live Template", names1)

        # Admin unpublishes it
        self.client.force_authenticate(user=self.admin_user)
        self.client.post(f'/api/admin/templates/{template.id}/unpublish/')

        # Hidden from regular user
        self.client.force_authenticate(user=self.regular_user)
        res2 = self.client.get('/api/templates/')
        names2 = [t['name'] for t in res2.data.get('results', res2.data)]
        self.assertNotIn("Temporary Live Template", names2)

    def test_search_and_filters_on_backend(self):
        """Verify search and filters work against actual database data."""
        WishTemplate.objects.all().delete()
        WishTemplate.objects.create(
            name="Special Milestone Birthday",
            message="Turning 30 is amazing {{name}}!",
            occasion="Birthday",
            tone="Funny",
            language="en",
            status="published",
            is_published=True
        )
        WishTemplate.objects.create(
            name="Silver Wedding Milestone",
            message="Celebrating 25 wonderful years of marriage.",
            occasion="Anniversary",
            tone="Formal",
            language="en",
            status="published",
            is_published=True
        )
        WishTemplate.objects.create(
            name="Festival of Lights Greetings",
            message="Wishing you joy on Diwali!",
            occasion="Festival",
            tone="Heartfelt",
            language="hi",
            status="published",
            is_published=True
        )

        self.client.force_authenticate(user=self.regular_user)

        # Search by keyword
        res_search = self.client.get('/api/templates/?search=Diwali')
        results = res_search.data.get('results', res_search.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Festival of Lights Greetings")

        # Filter by occasion
        res_occ = self.client.get('/api/templates/?occasion=Birthday')
        results_occ = res_occ.data.get('results', res_occ.data)
        self.assertEqual(len(results_occ), 1)
        self.assertEqual(results_occ[0]['name'], "Special Milestone Birthday")

        # Filter by tone
        res_tone = self.client.get('/api/templates/?tone=Formal')
        results_tone = res_tone.data.get('results', res_tone.data)
        self.assertEqual(len(results_tone), 1)
        self.assertEqual(results_tone[0]['name'], "Silver Wedding Milestone")

        # Filter by language
        res_lang = self.client.get('/api/templates/?language=hi')
        results_lang = res_lang.data.get('results', res_lang.data)
        self.assertEqual(len(results_lang), 1)
        self.assertEqual(results_lang[0]['name'], "Festival of Lights Greetings")

    def test_user_favorite_toggle_and_isolation(self):
        """Verify regular users can toggle favorites and favorites are user-specific."""
        template = WishTemplate.objects.create(
            name="Favoritable Template",
            message="Warm thoughts for you {{name}}.",
            occasion="Birthday",
            status="published",
            is_published=True
        )

        # Regular user favorites it
        self.client.force_authenticate(user=self.regular_user)
        fav_res = self.client.post(f'/api/templates/{template.id}/toggle_favorite/')
        self.assertEqual(fav_res.status_code, status.HTTP_200_OK)
        self.assertTrue(fav_res.data['is_favorite'])

        # Regular user sees is_favorite=True
        get_res = self.client.get(f'/api/templates/{template.id}/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertTrue(get_res.data['is_favorite'])

        # Other user sees is_favorite=False (isolation)
        self.client.force_authenticate(user=self.other_user)
        other_get = self.client.get(f'/api/templates/{template.id}/')
        self.assertEqual(other_get.status_code, status.HTTP_200_OK)
        self.assertFalse(other_get.data['is_favorite'])

        # Regular user un-favorites
        self.client.force_authenticate(user=self.regular_user)
        unfav_res = self.client.post(f'/api/templates/{template.id}/toggle_favorite/')
        self.assertEqual(unfav_res.status_code, status.HTTP_200_OK)
        self.assertFalse(unfav_res.data['is_favorite'])

    # ─── 3. Authorization & Permission Enforcement ────────────────────────────

    def test_unauthenticated_cannot_access_templates(self):
        """Verify anonymous users are rejected from template endpoints."""
        res_admin = self.client.get('/api/admin/templates/')
        self.assertEqual(res_admin.status_code, status.HTTP_401_UNAUTHORIZED)

        res_user = self.client.get('/api/templates/')
        self.assertEqual(res_user.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_access_admin_templates(self):
        """Verify regular users cannot access administrative endpoints."""
        self.client.force_authenticate(user=self.regular_user)
        res = self.client.get('/api/admin/templates/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        create_res = self.client.post('/api/admin/templates/', {'name': 'Hack', 'message': 'Hacked'}, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_modify_or_delete_admin_or_other_template(self):
        """Verify regular users cannot modify or delete an administrator's or another user's template."""
        admin_template = WishTemplate.objects.create(
            name="Admin System Template",
            message="Do not touch.",
            occasion="Birthday",
            status="published",
            is_published=True,
            created_by=self.admin_user
        )
        self.client.force_authenticate(user=self.regular_user)

        # Cannot delete admin's template
        delete_res = self.client.delete(f'/api/templates/{admin_template.id}/')
        self.assertEqual(delete_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(WishTemplate.objects.filter(id=admin_template.id).exists())

        # Cannot modify admin's template
        patch_res = self.client.patch(f'/api/templates/{admin_template.id}/', {'name': 'Defaced'}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

        # Regular user creates custom template
        create_res = self.client.post('/api/templates/', {
            'name': 'My Custom Birthday Wish',
            'message': 'Happy Birthday from me!',
            'occasion': 'Birthday',
            'tone': 'Friendly'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        my_tpl_id = create_res.data['id']

        # Another user cannot delete regular user's custom template
        self.client.force_authenticate(user=self.other_user)
        other_del = self.client.delete(f'/api/templates/{my_tpl_id}/')
        self.assertEqual(other_del.status_code, status.HTTP_403_FORBIDDEN)

        # Regular user CAN delete their own custom template
        self.client.force_authenticate(user=self.regular_user)
        own_del = self.client.delete(f'/api/templates/{my_tpl_id}/')
        self.assertEqual(own_del.status_code, status.HTTP_204_NO_CONTENT)

    # ─── 4. Validation & Error Handling ───────────────────────────────────────

    def test_validation_rejects_empty_or_too_short_fields(self):
        """Verify validation errors for bad input."""
        self.client.force_authenticate(user=self.admin_user)

        # Name too short
        bad_name = self.client.post('/api/admin/templates/', {
            'name': 'A',
            'message': 'Valid message here.',
            'occasion': 'Birthday'
        }, format='json')
        self.assertEqual(bad_name.status_code, status.HTTP_400_BAD_REQUEST)

        # Message too short
        bad_msg = self.client.post('/api/admin/templates/', {
            'name': 'Valid Name',
            'message': 'Hi',
            'occasion': 'Birthday'
        }, format='json')
        self.assertEqual(bad_msg.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid status
        bad_status = self.client.post('/api/admin/templates/', {
            'name': 'Valid Name',
            'message': 'Valid message here.',
            'occasion': 'Birthday',
            'status': 'invalid_status'
        }, format='json')
        self.assertEqual(bad_status.status_code, status.HTTP_400_BAD_REQUEST)

    # ─── 5. Seed Command Idempotency & Compatibility ──────────────────────────

    def test_seed_all_idempotent_and_non_destructive(self):
        """Verify seed_all can run repeatedly without error or duplicates."""
        # Run once
        call_command('seed_all')
        count1 = WishTemplate.objects.count()
        self.assertGreater(count1, 0)

        # Run twice
        call_command('seed_all')
        count2 = WishTemplate.objects.count()
        self.assertEqual(count1, count2)

        # Verify AI Prompts remain intact
        self.assertGreaterEqual(AIPrompt.objects.count(), 4)
