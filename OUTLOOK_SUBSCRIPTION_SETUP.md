# BlocIQ Outlook Add-in Subscription Setup Guide

## Overview
This guide walks through setting up the complete subscription-based payment system for the BlocIQ Outlook Add-in using Stripe.

## Prerequisites
- Stripe account with live API keys
- Database migration completed for `outlook_subscriptions` table
- Environment variables configured

## Setup Steps

### 1. Database Migration
Ensure the Outlook subscription tables are created:

```sql
-- Run the migration file
\i supabase/migrations/20250101000000_create_outlook_subscriptions.sql
```

### 2. Environment Variables
Your `.env.local` file should include:

```env
# Stripe Configuration for Outlook Add-in Subscriptions
STRIPE_SECRET_KEY=sk_live_[your_stripe_secret_key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your_stripe_publishable_key]
STRIPE_WEBHOOK_SECRET_OUTLOOK=whsec_outlook_[your_webhook_secret]
```

### 3. Create Stripe Products and Prices
Run the setup script to create the required Stripe products:

```bash
# Set your Stripe secret key
export STRIPE_SECRET_KEY=sk_live_[your_stripe_secret_key]

# Install stripe dependency if not already installed
npm install stripe

# Run the product creation script
node scripts/create-stripe-products.js
```

The script will create three subscription plans:
- **Starter**: £29/month - 1,000 AI replies
- **Professional**: £79/month - 5,000 AI replies
- **Enterprise**: £199/month - 20,000 AI replies

### 4. Update Price IDs
After running the script, update the price IDs in these files:
- `app/outlook-subscription/page.tsx`
- `app/outlook-subscription/upgrade/page.tsx`
- `app/api/stripe/webhook-outlook/route.ts`

### 5. Configure Stripe Webhook
1. Go to your Stripe Dashboard → Webhooks
2. Create a new webhook endpoint: `https://your-domain.com/api/stripe/webhook-outlook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy the webhook secret and update `STRIPE_WEBHOOK_SECRET_OUTLOOK`

## API Endpoints

### Subscription Management
- `GET /api/outlook-subscription?email={email}` - Check subscription status
- `POST /api/outlook-subscription` - Create/update subscription
- `DELETE /api/outlook-subscription` - Cancel subscription

### Stripe Integration
- `POST /api/stripe/create-outlook-subscription` - Create checkout session
- `GET /api/stripe/create-outlook-subscription?session_id={id}` - Retrieve session details
- `POST /api/stripe/webhook-outlook` - Handle Stripe webhooks

### Protected Add-in APIs
All Outlook add-in APIs now use subscription middleware:
- `POST /api/ask-ai-outlook` - AI assistance (protected)
- `POST /api/addin/generate-reply` - Generate replies (protected)

## Subscription Pages

### Landing Page
Visit: `https://your-domain.com/outlook-subscription`
- Choose subscription plan
- Enter email address
- Redirect to Stripe checkout

### Success Page
Visit: `https://your-domain.com/outlook-subscription/success?session_id={id}`
- Displays subscription confirmation
- Provides add-in installation instructions
- Downloads manifest file

### Upgrade Page
Visit: `https://your-domain.com/outlook-subscription/upgrade`
- For users who exceed usage limits
- Shows current usage statistics
- Upgrade to higher tier plans

## Outlook Add-in Integration

### Subscription Validation
All add-in functions now check subscription status:

```javascript
// In functions-reply.html and other add-in files
async function checkSubscription(userEmail) {
  const response = await fetch(`https://your-domain.com/api/outlook-subscription?email=${encodeURIComponent(userEmail)}`);
  const data = await response.json();
  return data.subscription || { hasAccess: false, isActive: false, usageRemaining: 0 };
}
```

### Usage Tracking
Each API call increments the monthly usage count:
- Automatic usage logging in middleware
- Monthly reset on successful payment
- Grace period handling for payment failures

## Testing

### Test Stripe Integration
1. Use Stripe test keys for development
2. Test webhook delivery in Stripe Dashboard
3. Verify subscription creation and updates
4. Test payment failure scenarios

### Test Outlook Add-in
1. Install add-in with test subscription
2. Test usage limits and blocking
3. Verify subscription status checks
4. Test upgrade flow

## Monitoring

### Subscription Health
Monitor these metrics:
- Monthly active subscriptions
- Usage patterns per plan
- Payment failure rates
- Churn and upgrades

### Database Queries
```sql
-- Active subscriptions
SELECT COUNT(*) FROM outlook_subscriptions WHERE subscription_status = 'active';

-- Usage this month
SELECT email, monthly_usage_count, monthly_usage_limit
FROM outlook_subscriptions
WHERE subscription_status = 'active'
ORDER BY monthly_usage_count DESC;

-- Payment failures
SELECT * FROM outlook_subscriptions
WHERE subscription_status = 'suspended'
AND updated_at > NOW() - INTERVAL '7 days';
```

## Support and Troubleshooting

### Common Issues
1. **Webhook not receiving events**: Check endpoint URL and selected events
2. **Price ID not found**: Ensure Stripe product creation was successful
3. **Subscription not updating**: Verify webhook secret and payload handling
4. **Usage not resetting**: Check monthly reset function in database

### Debug Logging
All APIs include comprehensive logging:
- Subscription status checks
- Usage increments
- Payment webhook events
- Error conditions

## Security Considerations

### API Protection
- All Outlook APIs protected by subscription middleware
- Rate limiting implemented per subscription tier
- Webhook signature verification required

### Data Privacy
- Minimal customer data stored
- Stripe handles payment information
- GDPR-compliant data handling

## Deployment Checklist

- [ ] Database migration completed
- [ ] Environment variables set with live Stripe keys
- [ ] Stripe products and prices created
- [ ] Webhook endpoint configured in Stripe
- [ ] Price IDs updated in application code
- [ ] SSL certificate installed for webhook endpoint
- [ ] Domain configured for production URLs
- [ ] Monitoring and alerting set up

## Support

For technical support with the Outlook subscription system:
- Email: support@blociq.co.uk
- Review logs in Supabase dashboard
- Check Stripe webhook delivery logs
- Monitor usage patterns and limits