"""
Centralized subscription plan configuration for Auto-Wish AI.
All plan prices, limits, and feature flags are defined here.
"""

CURRENCY = 'INR'

PLAN_IDS = ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE')

# Checkout amounts in INR (Enterprise uses custom sales flow)
CHECKOUT_AMOUNTS = {
    'PRO': 799,
    'BUSINESS': 2499,
}

PLAN_DEFINITIONS = {
    'FREE': {
        'id': 'FREE',
        'name': 'Free Plan',
        'price': 0,
        'currency': CURRENCY,
        'is_custom_pricing': False,
        'scheduled_wish_limit': 10,
        'ai_generation_limit': 10,
        'features': [
            '10 scheduled wishes/month',
            '10 AI generations/month',
            'Email delivery',
            'Standard AI Generator',
            'Basic analytics',
            'Basic support',
        ],
        'feature_flags': {
            'email': True,
            'sms': False,
            'whatsapp': False,
            'advanced_personalization': False,
            'csv_import_export': False,
            'advanced_analytics': False,
            'team_access': False,
            'custom_prompt_builder': False,
            'api_access': False,
            'automated_daily_wishes': False,
        },
        'checkout_available': False,
        'contact_sales': False,
    },
    'PRO': {
        'id': 'PRO',
        'name': 'Pro Plan',
        'price': 799,
        'currency': CURRENCY,
        'is_custom_pricing': False,
        'scheduled_wish_limit': 500,
        'ai_generation_limit': 500,
        'features': [
            '500 scheduled wishes/month',
            '500 AI generations/month',
            'Email delivery',
            'SMS delivery',
            'Advanced AI personalization',
            'Priority support',
            'CSV Import/Export',
            'Advanced analytics',
        ],
        'feature_flags': {
            'email': True,
            'sms': True,
            'whatsapp': False,
            'advanced_personalization': True,
            'csv_import_export': True,
            'advanced_analytics': True,
            'team_access': False,
            'custom_prompt_builder': False,
            'api_access': False,
            'automated_daily_wishes': True,
        },
        'checkout_available': True,
        'contact_sales': False,
    },
    'BUSINESS': {
        'id': 'BUSINESS',
        'name': 'Business Plan',
        'price': 2499,
        'currency': CURRENCY,
        'is_custom_pricing': False,
        'scheduled_wish_limit': 2000,
        'ai_generation_limit': 2000,
        'features': [
            '2,000 scheduled wishes/month',
            '2,000 AI generations/month',
            'Email delivery',
            'SMS delivery',
            'WhatsApp delivery',
            'Advanced AI personalization',
            '5 team members',
            'Custom Prompt Builder',
            'Advanced analytics',
            'API access',
            'Priority support',
            'Dedicated support',
        ],
        'feature_flags': {
            'email': True,
            'sms': True,
            'whatsapp': True,
            'advanced_personalization': True,
            'csv_import_export': True,
            'advanced_analytics': True,
            'team_access': True,
            'custom_prompt_builder': True,
            'api_access': True,
            'automated_daily_wishes': True,
        },
        'checkout_available': True,
        'contact_sales': False,
    },
    'ENTERPRISE': {
        'id': 'ENTERPRISE',
        'name': 'Enterprise Plan',
        'price': None,
        'currency': CURRENCY,
        'is_custom_pricing': True,
        'price_subtitle': 'Tailored pricing for your organization',
        'scheduled_wish_limit': None,
        'ai_generation_limit': None,
        'features': [
            'Custom scheduled wish limits',
            'Custom AI generation limits',
            'All Business features',
            'WhatsApp/SMS/Email delivery',
            'Dedicated SMTP/API',
            'Custom recurrence rules',
            'Advanced API access',
            'Unlimited/custom team members',
            'Dedicated account manager',
            'SLA support',
            'Custom onboarding',
        ],
        'feature_flags': {
            'email': True,
            'sms': True,
            'whatsapp': True,
            'advanced_personalization': True,
            'csv_import_export': True,
            'advanced_analytics': True,
            'team_access': True,
            'custom_prompt_builder': True,
            'api_access': True,
            'automated_daily_wishes': True,
            'dedicated_smtp_api': True,
            'custom_recurrence': True,
            'sla_support': True,
        },
        'checkout_available': False,
        'contact_sales': True,
    },
}


def get_plan_definition(plan_id):
    return PLAN_DEFINITIONS.get(plan_id, PLAN_DEFINITIONS['FREE'])


def get_checkout_amount(plan_id):
    return CHECKOUT_AMOUNTS.get(plan_id)


def build_plan_api_payload(plan_id):
    """Build the public plan object for the subscriptions API."""
    plan = get_plan_definition(plan_id)
    payload = {
        'id': plan['id'],
        'name': plan['name'],
        'currency': plan['currency'],
        'is_custom_pricing': plan['is_custom_pricing'],
        'scheduled_wish_limit': plan['scheduled_wish_limit'],
        'ai_generation_limit': plan['ai_generation_limit'],
        'features': plan['features'],
        'feature_flags': plan['feature_flags'],
        'checkout_available': plan['checkout_available'],
        'contact_sales': plan['contact_sales'],
    }
    if plan['is_custom_pricing']:
        payload['price'] = None
        payload['price_display'] = 'Custom'
        payload['price_subtitle'] = plan.get('price_subtitle', '')
    else:
        payload['price'] = plan['price']
        payload['price_display'] = str(plan['price'])
    return payload
