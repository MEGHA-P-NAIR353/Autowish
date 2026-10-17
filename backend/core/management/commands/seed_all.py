import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import GreetingTemplate, WishTemplate, AIPrompt, UserProfile

class Command(BaseCommand):
    help = 'Seeds default admin, greeting templates, wish templates, and AI prompts.'

    def handle(self, *args, **options):
        # 1. Admin account creation
        from core.admin_provisioning import ensure_admin_user
        admin_user = ensure_admin_user()
        if admin_user:
            self.stdout.write(self.style.SUCCESS(f"Successfully provisioned/verified admin user: {admin_user.email}"))
        else:
            self.stdout.write(self.style.WARNING("Admin provisioning skipped (ADMIN_EMAIL not set)."))

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

        # 3. Seed default legacy greeting templates
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

        # 4. Seed and migrate dedicated WishTemplate library
        default_wish_templates = [
            {
                'name': 'Classic Birthday Card',
                'occasion': 'Birthday',
                'tone': 'Friendly',
                'language': 'en',
                'status': 'published',
                'message': 'Wishing you a beautiful day filled with laughter, love, and your favorite treats! Happy Birthday! 🎉'
            },
            {
                'name': 'Birthday - Friendly',
                'occasion': 'Birthday',
                'tone': 'Friendly',
                'language': 'en',
                'status': 'published',
                'message': 'Happy Birthday {{name}}! May your year ahead be filled with joy, exciting adventures, and wonderful memories.'
            },
            {
                'name': 'Heartfelt Birthday Wish',
                'occasion': 'Birthday',
                'tone': 'Heartfelt',
                'language': 'en',
                'status': 'published',
                'message': 'Dearest {{name}}, on your birthday I want to thank you for bringing so much light into the world. May all your dreams and wishes come true this year! 🎂'
            },
            {
                'name': 'Playful Birthday Greetings',
                'occasion': 'Birthday',
                'tone': 'Funny',
                'language': 'en',
                'status': 'published',
                'message': 'Happy Birthday {{name}}! Don\'t count the candles, just enjoy the glow! Hope your special day is as incredible as you are. 🎈🍰'
            },
            {
                'name': 'Corporate Success Anniversary',
                'occasion': 'Anniversary',
                'tone': 'Formal',
                'language': 'en',
                'status': 'published',
                'message': 'Congratulations on your work anniversary! Thank you for your dedication, enthusiasm, and the outstanding value you bring to our team. Best wishes for continued success.'
            },
            {
                'name': 'Anniversary - Romantic',
                'occasion': 'Anniversary',
                'tone': 'Romantic',
                'language': 'en',
                'status': 'published',
                'message': 'Happy Anniversary {{name}}! Every moment with you is a blessing. Here\'s to celebrating our love today, tomorrow, and forever. ❤️'
            },
            {
                'name': 'Loving Couple Anniversary',
                'occasion': 'Anniversary',
                'tone': 'Heartfelt',
                'language': 'en',
                'status': 'published',
                'message': 'Happy Anniversary to an extraordinary couple! May your love and bond grow deeper with each passing year. Wishing you endless happiness together.'
            },
            {
                'name': 'Warm Holiday Greetings',
                'occasion': 'Festival',
                'tone': 'Friendly',
                'language': 'en',
                'status': 'published',
                'message': 'Sending warm thoughts and bright wishes for a happy holiday season and a prosperous New Year! 🌟'
            },
            {
                'name': 'Joyful Festival Blessings',
                'occasion': 'Festival',
                'tone': 'Heartfelt',
                'language': 'en',
                'status': 'published',
                'message': 'May the divine lights of this festive season bring eternal peace, prosperity, and good health to you and your loved ones. Joyous celebrations! 🪔✨'
            },
            {
                'name': 'Season\'s Cheer & Good Tidings',
                'occasion': 'Holiday',
                'tone': 'Friendly',
                'language': 'en',
                'status': 'published',
                'message': 'Wishing you peace, cheer, and joy this holiday season! May the coming year bring new happiness, new goals, and wonderful achievements.'
            },
            {
                'name': 'Executive Corporate Holiday Note',
                'occasion': 'Holiday',
                'tone': 'Professional',
                'language': 'en',
                'status': 'published',
                'message': 'Warm holiday greetings from our team to yours. We truly value our collaboration this past year and look forward to continued shared success in the coming year.'
            },
            {
                'name': 'Special Day Custom Wish',
                'occasion': 'Custom',
                'tone': 'Friendly',
                'language': 'en',
                'status': 'published',
                'message': 'Thinking of you today and sending my warmest thoughts your way on this special occasion! Wishing you happiness and all the best. 🌟'
            },
            {
                'name': 'Spanish - Feliz Cumpleaños Caluroso',
                'occasion': 'Birthday',
                'tone': 'Friendly',
                'language': 'es',
                'status': 'published',
                'message': '¡Feliz cumpleaños {{name}}! Te deseo un día lleno de amor, sonrisas y momentos inolvidables. ¡Que disfrutes al máximo tu día especial!'
            },
            {
                'name': 'French - Meilleurs Vœux d\'Anniversaire',
                'occasion': 'Birthday',
                'tone': 'Heartfelt',
                'language': 'fr',
                'status': 'published',
                'message': 'Joyeux anniversaire {{name}} ! Que cette journée spéciale soit remplie de joie, de douceur et de précieux souvenirs.'
            },
            {
                'name': 'Hindi - जन्मदिन की हार्दिक शुभकामनाएं',
                'occasion': 'Birthday',
                'tone': 'Heartfelt',
                'language': 'hi',
                'status': 'published',
                'message': 'जन्मदिन की हार्दिक शुभकामनाएं {{name}}! ईश्वर आपको उत्तम स्वास्थ्य, दीर्घायु और अपार खुशियां प्रदान करे।'
            },
        ]

        # Migrate existing GreetingTemplate instances into WishTemplate if not present
        for gt in GreetingTemplate.objects.all():
            WishTemplate.objects.get_or_create(
                name=gt.name,
                defaults={
                    'occasion': gt.occasion or 'Birthday',
                    'tone': gt.tone or 'Friendly',
                    'language': 'en',
                    'message': gt.content,
                    'status': 'published',
                    'is_published': True,
                    'created_by': admin_user or gt.user
                }
            )

        # Seed new templates
        for wt in default_wish_templates:
            obj, created = WishTemplate.objects.get_or_create(
                name=wt['name'],
                defaults={
                    'occasion': wt['occasion'],
                    'tone': wt['tone'],
                    'language': wt['language'],
                    'status': wt['status'],
                    'is_published': wt['status'] == 'published',
                    'message': wt['message'],
                    'created_by': admin_user
                }
            )
            if created:
                safe_name = wt['name'].encode('ascii', errors='replace').decode('ascii')
                self.stdout.write(self.style.SUCCESS(f"Seeded wish template: {safe_name}"))

        # 5. Seed Greeting Card Template library (single source of truth).
        from django.core import management as mgmt
        mgmt.call_command('seed_greeting_templates')

        self.stdout.write(self.style.SUCCESS('All data seeded successfully!'))
