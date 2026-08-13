import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import GreetingTemplate, AIPrompt, UserProfile

class Command(BaseCommand):
    help = 'Seeds default admin, greeting templates, and AI prompts.'

    def handle(self, *args, **options):
        # 1. Admin account creation
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@autowish.ai')
        admin_password = os.getenv('ADMIN_PASSWORD', 'AdminSecure123')
        
        if not User.objects.filter(email=admin_email).exists():
            admin_user = User.objects.create_superuser(
                username=admin_email.split('@')[0],
                email=admin_email,
                password=admin_password
            )
            self.stdout.write(self.style.SUCCESS(f"Successfully created admin user: {admin_email}"))
        else:
            self.stdout.write(self.style.WARNING(f"Admin user already exists with email: {admin_email}"))

        # 2. Seed default AI prompts
        default_prompts = [
            {
                'name': 'Warm Birthday Prompt',
                'occasion': 'Birthday',
                'tone': 'Friendly',
                'template': 'Write a warm, friendly birthday wish. Mention the recipient name, highlight their positive energy, and wish them an amazing year ahead.'
            },
            {
                'name': 'Professional Anniversary Prompt',
                'occasion': 'Anniversary',
                'tone': 'Formal',
                'template': 'Write a formal corporate/work anniversary message congratulating the recipient on their dedication, loyalty, and milestones.'
            },
            {
                'name': 'Funny Festival Prompt',
                'occasion': 'Festival',
                'tone': 'Funny',
                'template': 'Write a funny and lighthearted greeting for the holiday season. Keep it witty and engaging.'
            },
            {
                'name': 'Romantic custom prompt',
                'occasion': 'Custom',
                'tone': 'Romantic',
                'template': 'Write a deeply romantic, emotional message for my partner, celebrating our special connection.'
            }
        ]

        for p in default_prompts:
            obj, created = AIPrompt.objects.get_or_create(
                name=p['name'],
                defaults={
                    'occasion': p['occasion'],
                    'tone': p['tone'],
                    'prompt_template': p['template'],
                    'is_active': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Seeded prompt: {p['name']}"))

        # 3. Seed default templates
        default_templates = [
            {
                'name': 'Classic Birthday Card',
                'occasion': 'Birthday',
                'tone': 'Friendly',
                'content': 'Wishing you a beautiful day filled with laughter, love, and your favorite treats! Happy Birthday! 🎉'
            },
            {
                'name': 'Corporate Success Anniversary',
                'occasion': 'Anniversary',
                'tone': 'Formal',
                'content': 'Congratulations on your work anniversary. Thank you for your dedication and the value you bring to our team. Best wishes for continued success!'
            },
            {
                'name': 'Warm Holiday Greetings',
                'occasion': 'Festival',
                'tone': 'Friendly',
                'content': 'Sending warm thoughts and bright wishes for a happy holiday season and a prosperous New Year! 🌟'
            }
        ]

        for t in default_templates:
            obj, created = GreetingTemplate.objects.get_or_create(
                name=t['name'],
                defaults={
                    'occasion': t['occasion'],
                    'tone': t['tone'],
                    'content': t['content'],
                    'is_favorite': True
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Seeded template: {t['name']}"))

        # 4. Seed Greeting Card Template library (single source of truth).
        # Delegated to the dedicated command so we keep one canonical seed dataset.
        from django.core import management as mgmt
        mgmt.call_command('seed_greeting_templates')

        self.stdout.write(self.style.SUCCESS('All data seeded successfully!'))
