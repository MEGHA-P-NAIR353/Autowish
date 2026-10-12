from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import os
        import sys
        from django.conf import settings

        # Connect post_migrate signal for idempotent administrator provisioning
        from django.db.models.signals import post_migrate

        def _on_post_migrate(sender, **kwargs):
            if sender.name == 'core':
                try:
                    from core.admin_provisioning import ensure_admin_user
                    ensure_admin_user()
                except Exception as ex:
                    print(f"[ADMIN PROVISION ERROR] {ex}")

        post_migrate.connect(_on_post_migrate, sender=self)

        # Do not start background scheduler during tests, migrations, checks, or shell
        if any(cmd in sys.argv for cmd in ['test', 'pytest', 'makemigrations', 'migrate', 'collectstatic', 'check', 'showmigrations', 'shell']):
            return

        # Run in the dev server's active child process (RUN_MAIN == 'true')
        # or in production where the reloader is not active (not DEBUG).
        is_dev_child = os.environ.get('RUN_MAIN') == 'true'
        is_prod = not settings.DEBUG

        if is_dev_child or is_prod:
            # ── Multi-Provider AI startup validation ───────────────────────────
            try:
                from services.ai.openrouter_service import startup_validate
                startup_validate()
            except Exception as e:
                print(f"[STARTUP ERROR] AI provider validation raised an exception: {e}")

            # ── APScheduler ───────────────────────────────────────────────────
            try:
                from .scheduler import start_scheduler
                start_scheduler()
            except Exception as e:
                print(f"Scheduler not started: {e}")
