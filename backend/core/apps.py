from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import os
        from django.conf import settings

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
