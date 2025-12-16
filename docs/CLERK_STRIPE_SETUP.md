# Clerk & Stripe Integration Setup

This guide explains how to set up Clerk (OAuth authentication) and Stripe (subscription payments) for RSA.

## Overview

- **Clerk** handles user authentication via OAuth providers (Google, GitHub, etc.)
- **Stripe** handles subscription billing and payment processing
- **PHP Backend** handles Stripe checkout sessions, webhooks, and subscription sync
- Both integrate with RSA's existing auth system, allowing legacy email/password login to continue working

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  PHP API    │────▶│   Stripe    │
│   (React)   │     │ (SiteGround)│◀────│   Webhooks  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   MySQL +   │
                   │    Clerk    │
                   └─────────────┘
```

## Prerequisites

1. A Clerk account at [clerk.com](https://clerk.com)
2. A Stripe account at [stripe.com](https://stripe.com)
3. Node.js 18+ installed (for frontend)
4. PHP 7.4+ with Composer (for backend)
5. MySQL database (SiteGround provides this)

---

## Part 1: Clerk Setup

### 1.1 Create a Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Create application"
3. Name it "RSA" or "Racing Systems Analysis"
4. Select the OAuth providers you want to enable:
   - **Google** (recommended)
   - **GitHub** (optional)
   - **Email/Password** (optional - we have legacy support)

### 1.2 Configure OAuth Providers

#### Google OAuth
1. In Clerk Dashboard → User & Authentication → Social Connections
2. Enable Google
3. For production, you'll need to create a Google Cloud OAuth app:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://clerk.your-domain.com/v1/oauth_callback`

#### GitHub OAuth (optional)
1. Enable GitHub in Clerk Dashboard
2. For production, create a GitHub OAuth App:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Add callback URL from Clerk dashboard

### 1.3 Get Your API Keys

1. In Clerk Dashboard → API Keys
2. Copy the **Publishable Key** (starts with `pk_`)
3. Copy the **Secret Key** (starts with `sk_`) - keep this secure!

### 1.4 Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

> **Note**: The secret key is only needed for backend/webhook operations.

### 1.5 Configure Clerk Webhooks (Optional)

For syncing user data with your backend:

1. In Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-api.com/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`

---

## Part 2: Stripe Setup

### 2.1 Create Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Products → Add Product
3. Create three products matching RSA tiers:

#### Racer Plan
- Name: "RSA Racer"
- Price: $9.99/month (or $99.99/year)
- Metadata: `plan_id: racer`

#### Pro Plan
- Name: "RSA Pro"
- Price: $24.99/month (or $249.99/year)
- Metadata: `plan_id: pro`

#### Team Plan
- Name: "RSA Team"
- Price: $49.99/month (or $499.99/year)
- Metadata: `plan_id: team`

### 2.2 Get Your API Keys

1. In Stripe Dashboard → Developers → API Keys
2. Copy the **Publishable Key** (starts with `pk_`)
3. Copy the **Secret Key** (starts with `sk_`) - keep this secure!

### 2.3 Configure Environment Variables

Add to your `.env.local`:

```bash
# Stripe Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 2.4 Update Price IDs in Code

After creating products, update `src/domain/payments/stripeConfig.ts`:

```typescript
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'racer',
    // ... other fields
    stripePriceIdMonthly: 'price_xxxxx', // From Stripe dashboard
    stripePriceIdYearly: 'price_xxxxx',
  },
  // ... other plans
];
```

---

## Part 3: PHP Backend Setup

### 3.1 Install Stripe PHP SDK

SSH into your SiteGround server and run:

```bash
cd ~/public_html/api
composer require stripe/stripe-php
```

Or upload the `vendor` folder after running `composer install` locally in the `api/` directory.

### 3.2 Configure Backend

Copy `config.template.php` to `config.php` and fill in your values:

```php
// Stripe Configuration
define('STRIPE_SECRET_KEY', 'sk_live_xxx'); // From Stripe Dashboard
define('STRIPE_WEBHOOK_SECRET', 'whsec_xxx'); // From webhook setup

// Stripe Price IDs (from your products)
define('STRIPE_PRICE_RACER_MONTHLY', 'price_1ScCEJLhFtG9ySfYTncD5d5u');
define('STRIPE_PRICE_RACER_YEARLY', 'price_1ScCEJLhFtG9ySfYLapGFU4N');
define('STRIPE_PRICE_PRO_MONTHLY', 'price_1ScCFMLhFtG9ySfYhr5toBm2');
define('STRIPE_PRICE_PRO_YEARLY', 'price_1ScCFMLhFtG9ySfYmfxdHyKA');
define('STRIPE_PRICE_TEAM_MONTHLY', 'price_1ScCGCLhFtG9ySfYgFS2yYip');
define('STRIPE_PRICE_TEAM_YEARLY', 'price_1ScCGCLhFtG9ySfYt48noho4');

// Frontend URLs
define('FRONTEND_URL', 'https://racingsystemsanalysis.com');
define('STRIPE_SUCCESS_URL', FRONTEND_URL . '/account?checkout=success');
define('STRIPE_CANCEL_URL', FRONTEND_URL . '/account?checkout=canceled');

// Clerk (optional - for syncing subscription to Clerk metadata)
define('CLERK_SECRET_KEY', 'sk_live_xxx');
```

### 3.3 Run Database Migration

Visit `https://racingsystemsanalysis.com/api/setup.php` to add the new subscription columns:

- `stripe_customer_id` - Links user to Stripe customer
- `subscription_id` - Active Stripe subscription ID
- `subscription_plan` - Current plan (racer/pro/team)
- `subscription_status` - Status (active/canceled/past_due)
- `subscription_period_end` - When current period ends
- `clerk_user_id` - Links to Clerk user (for OAuth users)

### 3.4 Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://racingsystemsanalysis.com/api/stripe-webhook.php`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to `config.php` as `STRIPE_WEBHOOK_SECRET`

### 3.5 Configure Customer Portal

1. Go to [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable features:
   - ✅ Allow customers to update subscriptions
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to update payment methods
3. Configure products/prices that can be switched between
4. Save changes

---

## Part 4: Testing

### 4.1 Test Clerk Login

1. Start dev server: `npm run dev`
2. Go to `/login`
3. If Clerk is configured, you'll see OAuth buttons
4. Click "Sign in with Google" to test

### 4.2 Test Stripe Checkout

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### 4.3 Test Webhooks Locally

Use Stripe CLI to forward webhooks to your local/staging server:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login to Stripe
stripe login

# Forward webhooks to your server
stripe listen --forward-to https://racingsystemsanalysis.com/api/stripe-webhook.php

# Or for local testing (if running PHP locally)
stripe listen --forward-to localhost:8000/stripe-webhook.php
```

### 4.4 Test Full Flow

1. Log in to RSA (via Clerk OAuth or legacy)
2. Go to Account page
3. Click "Subscribe" on a plan
4. Complete checkout with test card `4242 4242 4242 4242`
5. Verify webhook received (check Stripe Dashboard → Webhooks → Recent events)
6. Refresh Account page - subscription status should show
7. Click "Manage Subscription" to test Customer Portal

---

## Part 5: Production Checklist

- [ ] Install Stripe PHP SDK on server (`composer require stripe/stripe-php`)
- [ ] Run database migration (`/api/setup.php`)
- [ ] Configure `config.php` with production Stripe keys
- [ ] Set up Stripe webhook endpoint in dashboard
- [ ] Configure Stripe Customer Portal settings
- [ ] Switch Clerk to production mode
- [ ] Switch Stripe to live mode  
- [ ] Update `.env.local` with production keys
- [ ] Test full signup → subscription → access flow
- [ ] Verify webhooks are being received and processed

---

## File Structure

```
src/
├── domain/
│   ├── auth/
│   │   ├── authStore.tsx         # Legacy auth (still works)
│   │   ├── ClerkAuthProvider.tsx # Clerk integration
│   │   ├── clerkConfig.ts        # Clerk configuration
│   │   └── index.ts              # Exports
│   └── payments/
│       ├── stripeConfig.ts       # Stripe configuration & API calls
│       ├── StripeProvider.tsx    # Stripe Elements wrapper
│       └── index.ts              # Exports

api/
├── config.php                    # Database & API keys (gitignored)
├── config.template.php           # Template for config.php
├── functions.php                 # Shared helper functions
├── auth.php                      # Authentication endpoints
├── stripe.php                    # Stripe checkout/portal endpoints
├── stripe-webhook.php            # Stripe webhook handler
├── setup.php                     # Database migration script
├── composer.json                 # PHP dependencies
└── vendor/                       # Composer packages (gitignored)
```

---

## Troubleshooting

### Clerk not showing on login page
- Check `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env.local`
- Key must start with `pk_`
- Restart dev server after changing env vars

### Stripe checkout not working
- Check browser console for API errors
- Verify `VITE_API_URL` points to correct backend
- Ensure Stripe PHP SDK is installed (`composer install` in api/)
- Check PHP error logs on server
- Verify price IDs in `config.php` match Stripe dashboard

### Webhook not receiving events
- Check webhook URL is correct in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` in `config.php`
- Check Stripe Dashboard → Webhooks → Recent events for errors
- Look at PHP error logs for signature verification failures

### User not getting access after payment
- Check webhook is receiving `checkout.session.completed` event
- Verify user's `subscription_plan` and `subscription_status` in database
- Check that `client_reference_id` matches RSA user ID
- If using Clerk, verify Clerk metadata is being updated

### Customer Portal not working
- Ensure user has a `stripe_customer_id` in database
- Check Customer Portal is configured in Stripe Dashboard
- Verify the portal session endpoint returns a valid URL

---

## Support

For issues with:
- **Clerk**: [clerk.com/docs](https://clerk.com/docs)
- **Stripe**: [stripe.com/docs](https://stripe.com/docs)
- **RSA Integration**: Check GitHub issues or contact support
