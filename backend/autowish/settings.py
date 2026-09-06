import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Explicitly load .env from BASE_DIR
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key-change-in-prod')

DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host.strip()]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if origin.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    
    # Local
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'autowish.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'autowish.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', BASE_DIR / 'db.sqlite3'),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.getenv('TIME_ZONE', 'Asia/Kolkata')
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = os.getenv('MEDIA_URL', '/media/')
MEDIA_ROOT = BASE_DIR / os.getenv('MEDIA_ROOT', 'media')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('DEFAULT_PAGE_SIZE', 20)),
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME', 15))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if origin.strip()]
CORS_ALLOW_CREDENTIALS = True

# Security
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 0))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False') == 'True'
SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False') == 'True'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'


# Redis & Cache Configuration
REDIS_URL = os.getenv('REDIS_URL', os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0'))

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 2,
            'SOCKET_TIMEOUT': 2,
            'IGNORE_EXCEPTIONS': True,
        }
    }
}

# Celery Configurations
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Auto-detect if Redis is available. If not, default to eager execution for a smooth dev experience.
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'
if not CELERY_TASK_ALWAYS_EAGER:
    try:
        import redis
        # Check connection with a 1s timeout to keep startup quick
        r = redis.Redis.from_url(CELERY_BROKER_URL, socket_connect_timeout=1, socket_timeout=1)
        r.ping()
    except Exception:
        CELERY_TASK_ALWAYS_EAGER = True

# Celery Beat — Periodic Tasks
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    # Run daily wish check every day at 7:00 AM (server timezone)
    'daily-wish-check': {
        'task': 'core.tasks.check_daily_wishes_task',
        'schedule': crontab(hour=7, minute=0),
    },
}

# Email (Gmail SMTP)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'autowish.ai@gmail.com')

# Frontend URL (used in email links)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# Feature flags
ENABLE_AI = os.getenv('ENABLE_AI', 'True') == 'True'
ENABLE_EMAIL = os.getenv('ENABLE_EMAIL', 'True') == 'True'
ENABLE_SMS = os.getenv('ENABLE_SMS', 'False') == 'True'
ENABLE_WHATSAPP = os.getenv('ENABLE_WHATSAPP', 'False') == 'True'

# File upload limits
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 10485760))  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE

# Default pagination
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'core': {
            'handlers': ['console'],
            'level': os.getenv('LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}

# ==============================================================================
# AI Multi-Provider Configuration (Primary: Gemini -> Fallback 1: Groq -> Fallback 2: OpenRouter)
# ==============================================================================
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-3.7-flash').strip() or 'gemini-3.7-flash'
GEMINI_FALLBACK_MODELS = os.getenv('GEMINI_FALLBACK_MODELS', 'gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash,gemini-3.6-flash').strip()
GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv('GEMINI_MAX_OUTPUT_TOKENS', '2048'))
GEMINI_RETRY_MAX_OUTPUT_TOKENS = int(os.getenv('GEMINI_RETRY_MAX_OUTPUT_TOKENS', '3072'))
GEMINI_MAX_TRUNCATION_RETRIES = int(os.getenv('GEMINI_MAX_TRUNCATION_RETRIES', '1'))

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '').strip()
GROQ_MODEL = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b').strip() or 'openai/gpt-oss-120b'
GROQ_FALLBACK_MODELS = os.getenv('GROQ_FALLBACK_MODELS', 'openai/gpt-oss-120b,qwen/qwen3.8-27b,groq/compound-mini,openai/gpt-oss-20b,qwen/qwen3.6-27b').strip()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '').strip()
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free').strip() or 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
OPENROUTER_FALLBACK_MODELS = os.getenv('OPENROUTER_FALLBACK_MODELS', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,minimax/minimax-m3:free,google/gemma-4-26b-a4b-it:free,liquid/lfm-2.5-2.6b:free,nvidia/nemotron-3.5-lightning:free').strip()
OPENROUTER_BASE_URL = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1').strip()

AI_PROVIDER_TIMEOUT = float(os.getenv('AI_PROVIDER_TIMEOUT', '15.0'))
AI_CACHE_TTL = int(os.getenv('AI_CACHE_TTL', '86400'))


