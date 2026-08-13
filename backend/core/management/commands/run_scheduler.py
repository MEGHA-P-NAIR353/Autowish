from django.core.management.base import BaseCommand
from core.scheduler import start_scheduler

class Command(BaseCommand):
    help = 'Start APScheduler for AutoWish'

    def handle(self, *args, **options):
        start_scheduler()
        self.stdout.write(self.style.SUCCESS('Scheduler running...'))
