from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import (
    ContactViewSet, EventViewSet, GreetingTemplateViewSet,
    ScheduledWishViewSet, SchedulesViewSet, EmailLogViewSet, NotificationViewSet,
    AIPromptViewSet, AuditLogViewSet, AdminUserViewSet,
    register, login_view, verify_email, forgot_password, reset_password,
    change_password, user_profile_view, upload_avatar, delete_account,
    generate_ai_greeting, send_greeting_email, schedule_greeting, save_greeting_template,
    dashboard_stats, greeting_analytics, subscription_plans,
    create_checkout_session, payment_webhook, admin_dashboard_stats,
    recent_activity,
    GreetingCardTemplateViewSet, GreetingCardViewSet
)

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contacts')
router.register(r'events', EventViewSet, basename='events')
router.register(r'templates', GreetingTemplateViewSet, basename='templates')
router.register(r'scheduled', ScheduledWishViewSet, basename='scheduled')
router.register(r'schedules', SchedulesViewSet, basename='schedules')
router.register(r'logs', EmailLogViewSet, basename='logs')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'admin/prompts', AIPromptViewSet, basename='admin-prompts')
router.register(r'admin/audit-logs', AuditLogViewSet, basename='admin-audit-logs')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')
# Greeting Card System
router.register(r'card-templates', GreetingCardTemplateViewSet, basename='card-templates')
router.register(r'cards', GreetingCardViewSet, basename='cards')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    # Auth Endpoints
    path('api/auth/register/', register, name='register'),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify-email/', verify_email, name='verify_email'),
    path('api/auth/forgot-password/', forgot_password, name='forgot_password'),
    path('api/auth/reset-password/', reset_password, name='reset_password'),
    path('api/auth/change-password/', change_password, name='change_password'),
    path('api/auth/profile/', user_profile_view, name='profile_view'),
    path('api/auth/profile/avatar/', upload_avatar, name='upload_avatar'),
    path('api/auth/delete-account/', delete_account, name='delete_account'),
    
    # AI Workflow Endpoints
    path('api/ai/generate/', generate_ai_greeting, name='ai-generate'),
    path('api/ai/send/', send_greeting_email, name='ai-send'),
    path('api/ai/schedule/', schedule_greeting, name='ai-schedule'),
    path('api/ai/template/', save_greeting_template, name='ai-template'),
    
    # Payments & Subscriptions
    path('api/subscriptions/plans/', subscription_plans, name='subscription-plans'),
    path('api/payments/checkout/', create_checkout_session, name='payments-checkout'),
    path('api/payments/webhook/', payment_webhook, name='payments-webhook'),
    
    # Dashboard & Admin
    path('api/dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('api/dashboard/recent-activity/', recent_activity, name='recent-activity'),
    path('api/analytics/greetings/', greeting_analytics, name='greeting-analytics'),
    path('api/admin/dashboard/stats/', admin_dashboard_stats, name='admin-dashboard-stats'),

]

# Serve media files in development (when running runserver directly)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

