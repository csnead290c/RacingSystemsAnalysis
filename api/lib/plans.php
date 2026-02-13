<?php
/**
 * Centralized Plan & Price Mapping
 *
 * Single source of truth for:
 *   - Stripe price_id → internal plan_id
 *   - plan_id → legacy product list
 *   - plan_id → canonical capability plan alias
 *   - plan_id → Stripe price_id (reverse lookup)
 *
 * Both stripe.php and stripe-webhook.php MUST use these functions
 * instead of defining their own local copies.
 *
 * Mapping table:
 *
 *   Stripe Price ID                  → Plan ID  → Cap Plan  → Products
 *   ─────────────────────────────────────────────────────────────────────
 *   STRIPE_PRICE_RACER_MONTHLY/YEARLY → racer    → basic     → [quarter_jr]
 *   STRIPE_PRICE_PRO_MONTHLY/YEARLY   → pro      → pro       → [quarter_pro, bonneville_pro]
 *   STRIPE_PRICE_TEAM_MONTHLY/YEARLY  → team     → team      → [quarter_pro, bonneville_pro, engine_pro, clutch_pro, suspension_pro]
 *   (no subscription / canceled)      → (none)   → free      → []
 */

/**
 * Map a Stripe price ID to our internal plan ID.
 *
 * @return string|null  'racer', 'pro', 'team', or null if unknown
 */
function rsa_getPlanIdFromPrice(string $priceId): ?string {
    $mapping = [
        STRIPE_PRICE_RACER_MONTHLY => 'racer',
        STRIPE_PRICE_RACER_YEARLY  => 'racer',
        STRIPE_PRICE_PRO_MONTHLY   => 'pro',
        STRIPE_PRICE_PRO_YEARLY    => 'pro',
        STRIPE_PRICE_TEAM_MONTHLY  => 'team',
        STRIPE_PRICE_TEAM_YEARLY   => 'team',
    ];

    return $mapping[$priceId] ?? null;
}

/**
 * Map our internal plan ID + billing period to a Stripe price ID.
 *
 * @return string|null  The Stripe price ID, or null if invalid
 */
function rsa_getPriceIdForPlan(string $planId, string $billingPeriod = 'monthly'): ?string {
    $prices = [
        'racer' => [
            'monthly' => STRIPE_PRICE_RACER_MONTHLY,
            'yearly'  => STRIPE_PRICE_RACER_YEARLY,
        ],
        'pro' => [
            'monthly' => STRIPE_PRICE_PRO_MONTHLY,
            'yearly'  => STRIPE_PRICE_PRO_YEARLY,
        ],
        'team' => [
            'monthly' => STRIPE_PRICE_TEAM_MONTHLY,
            'yearly'  => STRIPE_PRICE_TEAM_YEARLY,
        ],
    ];

    return $prices[$planId][$billingPeriod] ?? null;
}

/**
 * Map plan ID to the legacy RSA product array.
 *
 * @return string[]
 */
function rsa_getProductsForPlan(?string $planId): array {
    $products = [
        'racer' => ['quarter_jr'],
        'pro'   => ['quarter_pro', 'bonneville_pro'],
        'team'  => ['quarter_pro', 'bonneville_pro', 'engine_pro', 'clutch_pro', 'suspension_pro'],
    ];

    return $products[$planId] ?? [];
}

/**
 * Detect billing period from a Stripe price ID.
 *
 * @return string 'monthly' or 'yearly'
 */
function rsa_getBillingPeriodFromPrice(string $priceId): string {
    $yearly = [
        STRIPE_PRICE_RACER_YEARLY,
        STRIPE_PRICE_PRO_YEARLY,
        STRIPE_PRICE_TEAM_YEARLY,
    ];

    return in_array($priceId, $yearly) ? 'yearly' : 'monthly';
}
