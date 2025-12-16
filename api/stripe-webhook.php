<?php
/**
 * Stripe Webhook Handler
 * 
 * This endpoint receives events from Stripe and updates user subscriptions.
 * 
 * Configure webhook in Stripe Dashboard:
 * URL: https://racingsystemsanalysis.com/api/stripe-webhook.php
 * Events to listen for:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 */

require_once 'config.php';
require_once 'functions.php';
require_once __DIR__ . '/vendor/autoload.php';

// Stripe webhook doesn't use CORS - it's server-to-server
header('Content-Type: application/json');

// Get the raw POST body
$payload = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// Verify webhook signature
try {
    $event = \Stripe\Webhook::constructEvent(
        $payload,
        $sigHeader,
        STRIPE_WEBHOOK_SECRET
    );
} catch (\UnexpectedValueException $e) {
    error_log('Stripe webhook: Invalid payload');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    error_log('Stripe webhook: Invalid signature');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Initialize Stripe for API calls
\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

$pdo = getDB();

// Log the event for debugging
error_log("Stripe webhook received: {$event->type}");

// Handle the event
try {
    switch ($event->type) {
        case 'checkout.session.completed':
            handleCheckoutCompleted($pdo, $event->data->object);
            break;
            
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            handleSubscriptionUpdated($pdo, $event->data->object);
            break;
            
        case 'customer.subscription.deleted':
            handleSubscriptionDeleted($pdo, $event->data->object);
            break;
            
        case 'invoice.payment_succeeded':
            handlePaymentSucceeded($pdo, $event->data->object);
            break;
            
        case 'invoice.payment_failed':
            handlePaymentFailed($pdo, $event->data->object);
            break;
            
        default:
            error_log("Stripe webhook: Unhandled event type {$event->type}");
    }
    
    http_response_code(200);
    echo json_encode(['received' => true]);
} catch (Exception $e) {
    error_log("Stripe webhook error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Webhook handler failed']);
}

/**
 * Handle checkout.session.completed
 * This fires when a customer completes checkout
 */
function handleCheckoutCompleted($pdo, $session) {
    error_log("Checkout completed for session: {$session->id}");
    
    // Get RSA user ID from client_reference_id or metadata
    $rsaUserId = $session->client_reference_id ?? $session->metadata->rsa_user_id ?? null;
    
    if (!$rsaUserId) {
        error_log("Checkout completed but no RSA user ID found");
        return;
    }
    
    // Get the subscription from the session
    $subscriptionId = $session->subscription;
    $customerId = $session->customer;
    
    if (!$subscriptionId || !$customerId) {
        error_log("Checkout completed but missing subscription or customer ID");
        return;
    }
    
    // Fetch the subscription to get plan details
    $subscription = \Stripe\Subscription::retrieve($subscriptionId);
    $priceId = $subscription->items->data[0]->price->id ?? null;
    $planId = getPlanIdFromPrice($priceId);
    
    // Update user in database
    $stmt = $pdo->prepare("
        UPDATE users SET 
            stripe_customer_id = ?,
            subscription_id = ?,
            subscription_plan = ?,
            subscription_status = ?,
            subscription_period_end = FROM_UNIXTIME(?),
            products = ?
        WHERE id = ?
    ");
    
    $products = json_encode(getProductsForPlan($planId));
    
    $stmt->execute([
        $customerId,
        $subscriptionId,
        $planId,
        $subscription->status,
        $subscription->current_period_end,
        $products,
        $rsaUserId,
    ]);
    
    error_log("User $rsaUserId subscribed to $planId plan");
    
    // Optionally sync to Clerk
    syncSubscriptionToClerk($pdo, $rsaUserId, $planId, $subscription->status);
}

/**
 * Handle subscription updates (plan changes, renewals, etc.)
 */
function handleSubscriptionUpdated($pdo, $subscription) {
    error_log("Subscription updated: {$subscription->id}");
    
    $customerId = $subscription->customer;
    $priceId = $subscription->items->data[0]->price->id ?? null;
    $planId = getPlanIdFromPrice($priceId);
    
    // Find user by Stripe customer ID
    $stmt = $pdo->prepare("SELECT id FROM users WHERE stripe_customer_id = ?");
    $stmt->execute([$customerId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        // Try to find by subscription metadata
        $rsaUserId = $subscription->metadata->rsa_user_id ?? null;
        if ($rsaUserId) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$rsaUserId]);
            $user = $stmt->fetch();
        }
    }
    
    if (!$user) {
        error_log("Subscription updated but user not found for customer: $customerId");
        return;
    }
    
    // Update subscription info
    $stmt = $pdo->prepare("
        UPDATE users SET 
            subscription_id = ?,
            subscription_plan = ?,
            subscription_status = ?,
            subscription_period_end = FROM_UNIXTIME(?),
            products = ?
        WHERE id = ?
    ");
    
    $products = json_encode(getProductsForPlan($planId));
    
    $stmt->execute([
        $subscription->id,
        $planId,
        $subscription->status,
        $subscription->current_period_end,
        $products,
        $user['id'],
    ]);
    
    error_log("User {$user['id']} subscription updated to $planId ({$subscription->status})");
    
    // Sync to Clerk
    syncSubscriptionToClerk($pdo, $user['id'], $planId, $subscription->status);
}

/**
 * Handle subscription cancellation
 */
function handleSubscriptionDeleted($pdo, $subscription) {
    error_log("Subscription deleted: {$subscription->id}");
    
    $customerId = $subscription->customer;
    
    // Find user by Stripe customer ID
    $stmt = $pdo->prepare("SELECT id FROM users WHERE stripe_customer_id = ?");
    $stmt->execute([$customerId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        error_log("Subscription deleted but user not found for customer: $customerId");
        return;
    }
    
    // Clear subscription but keep customer ID for future purchases
    $stmt = $pdo->prepare("
        UPDATE users SET 
            subscription_id = NULL,
            subscription_plan = NULL,
            subscription_status = 'canceled',
            subscription_period_end = NULL,
            products = '[]'
        WHERE id = ?
    ");
    $stmt->execute([$user['id']]);
    
    error_log("User {$user['id']} subscription canceled");
    
    // Sync to Clerk
    syncSubscriptionToClerk($pdo, $user['id'], null, 'canceled');
}

/**
 * Handle successful payment (subscription renewal)
 */
function handlePaymentSucceeded($pdo, $invoice) {
    // Only handle subscription invoices
    if (!$invoice->subscription) {
        return;
    }
    
    error_log("Payment succeeded for subscription: {$invoice->subscription}");
    
    // The subscription.updated event will handle the actual update
    // This is just for logging/notifications
}

/**
 * Handle failed payment
 */
function handlePaymentFailed($pdo, $invoice) {
    if (!$invoice->subscription) {
        return;
    }
    
    error_log("Payment failed for subscription: {$invoice->subscription}");
    
    $customerId = $invoice->customer;
    
    // Find user and update status
    $stmt = $pdo->prepare("
        UPDATE users SET subscription_status = 'past_due'
        WHERE stripe_customer_id = ?
    ");
    $stmt->execute([$customerId]);
    
    // TODO: Send email notification to user about failed payment
}

/**
 * Sync subscription status to Clerk user metadata
 * This allows the frontend to read subscription from Clerk without hitting our API
 */
function syncSubscriptionToClerk($pdo, $rsaUserId, $planId, $status) {
    // Check if Clerk is configured
    if (!defined('CLERK_SECRET_KEY') || CLERK_SECRET_KEY === 'sk_test_xxx') {
        return;
    }
    
    // Get user's Clerk ID
    $stmt = $pdo->prepare("SELECT clerk_user_id FROM users WHERE id = ?");
    $stmt->execute([$rsaUserId]);
    $user = $stmt->fetch();
    
    if (!$user || !$user['clerk_user_id']) {
        error_log("Cannot sync to Clerk: No clerk_user_id for RSA user $rsaUserId");
        return;
    }
    
    $clerkUserId = $user['clerk_user_id'];
    
    // Update Clerk user metadata via API
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "https://api.clerk.com/v1/users/{$clerkUserId}/metadata",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . CLERK_SECRET_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'public_metadata' => [
                'subscription' => $planId,
                'subscriptionStatus' => $status,
            ],
        ]),
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 300) {
        error_log("Synced subscription to Clerk for user $clerkUserId");
    } else {
        error_log("Failed to sync to Clerk: HTTP $httpCode - $response");
    }
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
