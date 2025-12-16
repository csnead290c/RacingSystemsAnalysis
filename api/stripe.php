<?php
/**
 * Stripe API Endpoints
 * 
 * Actions:
 * - create-checkout-session: Create a Stripe Checkout session for subscription
 * - create-portal-session: Create a Stripe Customer Portal session
 * - subscription-status: Get current subscription status for user
 * 
 * Requires: Stripe PHP SDK (installed via Composer)
 */

require_once 'config.php';
require_once 'functions.php';
require_once __DIR__ . '/vendor/autoload.php'; // Composer autoload for Stripe SDK

rsa_setCorsHeaders();

// Initialize Stripe
\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'create-checkout-session':
        handleCreateCheckoutSession($pdo);
        break;
    case 'create-portal-session':
        handleCreatePortalSession($pdo);
        break;
    case 'subscription-status':
        handleSubscriptionStatus($pdo);
        break;
    case 'prices':
        handleGetPrices();
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

/**
 * Create a Stripe Checkout Session for subscription
 */
function handleCreateCheckoutSession($pdo) {
    $auth = rsa_requireAuth();
    $input = rsa_getJsonInput();
    
    $planId = $input['planId'] ?? '';
    $billingPeriod = $input['billingPeriod'] ?? 'monthly';
    $customerEmail = $input['customerEmail'] ?? '';
    
    if (!$planId) {
        rsa_jsonResponse(['error' => 'Plan ID required'], 400);
    }
    
    // Map plan ID to Stripe price ID
    $priceId = getPriceIdForPlan($planId, $billingPeriod);
    if (!$priceId) {
        rsa_jsonResponse(['error' => 'Invalid plan'], 400);
    }
    
    // Use email from request if provided, otherwise from auth token
    if ($customerEmail) {
        $auth['email'] = $customerEmail;
    }
    
    // Get or create user - handle both legacy and Clerk users
    $user = getOrCreateUser($pdo, $auth);
    
    // If user still has no email, use the one from request
    if (empty($user['email']) && $customerEmail) {
        $user['email'] = $customerEmail;
    }
    
    try {
        $sessionParams = [
            'mode' => 'subscription',
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'success_url' => STRIPE_SUCCESS_URL . '&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => STRIPE_CANCEL_URL,
            'client_reference_id' => (string)$user['id'], // RSA user ID
            'metadata' => [
                'rsa_user_id' => $user['id'],
                'plan_id' => $planId,
                'billing_period' => $billingPeriod,
            ],
            'subscription_data' => [
                'metadata' => [
                    'rsa_user_id' => $user['id'],
                    'plan_id' => $planId,
                ],
            ],
            'allow_promotion_codes' => true,
        ];
        
        // If user already has a Stripe customer ID, use it
        if ($user['stripe_customer_id']) {
            $sessionParams['customer'] = $user['stripe_customer_id'];
        } else {
            // Pre-fill email for new customers
            $sessionParams['customer_email'] = $user['email'];
        }
        
        $session = \Stripe\Checkout\Session::create($sessionParams);
        
        rsa_jsonResponse([
            'sessionId' => $session->id,
            'url' => $session->url,
        ]);
    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log('Stripe checkout error: ' . $e->getMessage());
        rsa_jsonResponse(['error' => 'Failed to create checkout session: ' . $e->getMessage()], 500);
    } catch (Exception $e) {
        error_log('Checkout error: ' . $e->getMessage());
        rsa_jsonResponse(['error' => 'Checkout error: ' . $e->getMessage()], 500);
    }
}

/**
 * Create a Stripe Customer Portal session for subscription management
 */
function handleCreatePortalSession($pdo) {
    $auth = rsa_requireAuth();
    
    // Get user's Stripe customer ID
    $stmt = $pdo->prepare("SELECT stripe_customer_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user || !$user['stripe_customer_id']) {
        rsa_jsonResponse(['error' => 'No subscription found. Please subscribe first.'], 400);
    }
    
    try {
        $session = \Stripe\BillingPortal\Session::create([
            'customer' => $user['stripe_customer_id'],
            'return_url' => FRONTEND_URL . '/account',
        ]);
        
        rsa_jsonResponse([
            'url' => $session->url,
        ]);
    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log('Stripe portal error: ' . $e->getMessage());
        rsa_jsonResponse(['error' => 'Failed to create portal session'], 500);
    }
}

/**
 * Get current subscription status for authenticated user
 */
function handleSubscriptionStatus($pdo) {
    $auth = rsa_requireAuth();
    
    // Get user - handle both legacy and Clerk users
    $user = getOrCreateUser($pdo, $auth);
    
    // Fetch subscription data for this user
    $stmt = $pdo->prepare("
        SELECT subscription_plan, subscription_status, subscription_period_end, stripe_customer_id, products
        FROM users WHERE id = ?
    ");
    $stmt->execute([$user['id']]);
    $userData = $stmt->fetch();
    
    if (!$userData) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }
    
    rsa_jsonResponse([
        'subscription' => [
            'plan' => $userData['subscription_plan'],
            'status' => $userData['subscription_status'] ?? 'none',
            'periodEnd' => $userData['subscription_period_end'],
            'hasStripeCustomer' => !empty($userData['stripe_customer_id']),
        ],
        'products' => json_decode($userData['products'] ?? '[]', true),
    ]);
}

/**
 * Get available prices (public endpoint)
 */
function handleGetPrices() {
    rsa_jsonResponse([
        'prices' => [
            'racer' => [
                'monthly' => STRIPE_PRICE_RACER_MONTHLY,
                'yearly' => STRIPE_PRICE_RACER_YEARLY,
            ],
            'pro' => [
                'monthly' => STRIPE_PRICE_PRO_MONTHLY,
                'yearly' => STRIPE_PRICE_PRO_YEARLY,
            ],
            'team' => [
                'monthly' => STRIPE_PRICE_TEAM_MONTHLY,
                'yearly' => STRIPE_PRICE_TEAM_YEARLY,
            ],
        ],
    ]);
}

/**
 * Map plan ID and billing period to Stripe price ID
 */
function getPriceIdForPlan($planId, $billingPeriod) {
    $prices = [
        'racer' => [
            'monthly' => STRIPE_PRICE_RACER_MONTHLY,
            'yearly' => STRIPE_PRICE_RACER_YEARLY,
        ],
        'pro' => [
            'monthly' => STRIPE_PRICE_PRO_MONTHLY,
            'yearly' => STRIPE_PRICE_PRO_YEARLY,
        ],
        'team' => [
            'monthly' => STRIPE_PRICE_TEAM_MONTHLY,
            'yearly' => STRIPE_PRICE_TEAM_YEARLY,
        ],
    ];
    
    return $prices[$planId][$billingPeriod] ?? null;
}

/**
 * Map Stripe price ID to plan ID
 */
function getPlanIdFromPrice($priceId) {
    $mapping = [
        STRIPE_PRICE_RACER_MONTHLY => 'racer',
        STRIPE_PRICE_RACER_YEARLY => 'racer',
        STRIPE_PRICE_PRO_MONTHLY => 'pro',
        STRIPE_PRICE_PRO_YEARLY => 'pro',
        STRIPE_PRICE_TEAM_MONTHLY => 'team',
        STRIPE_PRICE_TEAM_YEARLY => 'team',
    ];
    
    return $mapping[$priceId] ?? null;
}

/**
 * Map plan ID to RSA products
 */
function getProductsForPlan($planId) {
    $products = [
        'racer' => ['quarter_jr'],
        'pro' => ['quarter_pro', 'bonneville_pro'],
        'team' => ['quarter_pro', 'bonneville_pro', 'engine_pro', 'clutch_pro', 'suspension_pro'],
    ];
    
    return $products[$planId] ?? [];
}

/**
 * Get or create a user record for Clerk or legacy users
 */
function getOrCreateUser($pdo, $auth) {
    $userId = $auth['user_id'];
    $email = $auth['email'] ?? '';
    $clerkUserId = $auth['clerk_user_id'] ?? null;
    
    // Check if this is a Clerk user (ID starts with 'clerk_')
    if ($clerkUserId || strpos($userId, 'clerk_') === 0) {
        $clerkId = $clerkUserId ?: str_replace('clerk_', '', $userId);
        
        // Try to find by clerk_user_id first
        $stmt = $pdo->prepare("SELECT id, email, stripe_customer_id FROM users WHERE clerk_user_id = ?");
        $stmt->execute([$clerkId]);
        $user = $stmt->fetch();
        
        if ($user) {
            return $user;
        }
        
        // Try to find by email
        if ($email) {
            $stmt = $pdo->prepare("SELECT id, email, stripe_customer_id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if ($user) {
                // Update with clerk_user_id
                $stmt = $pdo->prepare("UPDATE users SET clerk_user_id = ? WHERE id = ?");
                $stmt->execute([$clerkId, $user['id']]);
                return $user;
            }
        }
        
        // Create new user for Clerk
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password_hash, name, role, clerk_user_id, products)
            VALUES (?, '', ?, 'user', ?, '[]')
        ");
        $name = explode('@', $email)[0] ?? 'User';
        $stmt->execute([$email, $name, $clerkId]);
        
        return [
            'id' => $pdo->lastInsertId(),
            'email' => $email,
            'stripe_customer_id' => null,
        ];
    }
    
    // Legacy user - look up by ID
    $stmt = $pdo->prepare("SELECT id, email, stripe_customer_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }
    
    return $user;
}
