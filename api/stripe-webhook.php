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
require_once __DIR__ . '/lib/audit.php';
require_once __DIR__ . '/lib/plans.php';

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

// Log the event for debugging (no secrets — only event type + id)
$webhookStartMs = hrtime(true);
error_log("Stripe webhook received: type={$event->type} id={$event->id}");

// ── Idempotency: skip if we've already processed this event ─────────
try {
    $idempStmt = $pdo->prepare(
        "INSERT IGNORE INTO webhook_events (stripe_event_id, event_type, payload) VALUES (?, ?, ?)"
    );
    $idempStmt->execute([$event->id, $event->type, $payload]);
    if ($idempStmt->rowCount() === 0) {
        // Already processed — return 200 immediately
        error_log("Stripe webhook: duplicate event {$event->id}, skipping");
        http_response_code(200);
        echo json_encode(['received' => true, 'duplicate' => true]);
        exit;
    }
} catch (PDOException $e) {
    // webhook_events table may not exist yet (pre-migration) — log and continue
    error_log("Stripe webhook: idempotency check failed (table may not exist): " . $e->getMessage());
}

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
    
    $elapsedMs = round((hrtime(true) - $webhookStartMs) / 1e6, 1);
    error_log("Stripe webhook OK: type={$event->type} id={$event->id} elapsed={$elapsedMs}ms");
    http_response_code(200);
    echo json_encode(['received' => true]);
} catch (Exception $e) {
    $elapsedMs = round((hrtime(true) - $webhookStartMs) / 1e6, 1);
    error_log("Stripe webhook FAIL: type={$event->type} id={$event->id} elapsed={$elapsedMs}ms error=" . $e->getMessage());
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
    $planId = rsa_getPlanIdFromPrice($priceId);
    
    // Update user in database (legacy columns)
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
    
    $products = json_encode(rsa_getProductsForPlan($planId));
    
    $stmt->execute([
        $customerId,
        $subscriptionId,
        $planId,
        $subscription->status,
        $subscription->current_period_end,
        $products,
        $rsaUserId,
    ]);
    
    // Upsert into subscriptions table (authoritative)
    rsa_upsertSubscription($pdo, (int)$rsaUserId, $subscription, $planId, $priceId);
    
    error_log("User $rsaUserId subscribed to $planId plan");
    
    // Bump capability_version so client refreshes
    try {
        $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$rsaUserId]);
    } catch (PDOException $e) { /* column may not exist pre-migration */ }
    
    // Audit log
    rsa_auditLog($pdo, null, AUDIT_SUBSCRIPTION_CREATED, (int)$rsaUserId, [
        'plan' => $planId,
        'stripe_subscription_id' => $subscriptionId,
        'stripe_customer_id' => $customerId,
    ]);
    
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
    $planId = rsa_getPlanIdFromPrice($priceId);
    
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
    
    // Update subscription info (legacy columns)
    $stmt = $pdo->prepare("
        UPDATE users SET 
            subscription_id = ?,
            subscription_plan = ?,
            subscription_status = ?,
            subscription_period_end = FROM_UNIXTIME(?),
            products = ?
        WHERE id = ?
    ");
    
    $products = json_encode(rsa_getProductsForPlan($planId));
    
    $stmt->execute([
        $subscription->id,
        $planId,
        $subscription->status,
        $subscription->current_period_end,
        $products,
        $user['id'],
    ]);
    
    // Upsert into subscriptions table (authoritative)
    rsa_upsertSubscription($pdo, (int)$user['id'], $subscription, $planId, $priceId);
    
    error_log("User {$user['id']} subscription updated to $planId ({$subscription->status})");
    
    // Bump capability_version so client refreshes
    try {
        $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$user['id']]);
    } catch (PDOException $e) { /* column may not exist pre-migration */ }
    
    // Audit log
    rsa_auditLog($pdo, null, AUDIT_SUBSCRIPTION_UPDATED, (int)$user['id'], [
        'plan' => $planId,
        'status' => $subscription->status,
        'stripe_subscription_id' => $subscription->id,
    ]);
    
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
    
    // Update subscriptions table
    try {
        $pdo->prepare("
            UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 0
            WHERE user_id = ? AND stripe_subscription_id = ?
        ")->execute([$user['id'], $subscription->id]);
    } catch (PDOException $e) { /* table may not exist */ }
    
    error_log("User {$user['id']} subscription canceled");
    
    // Bump capability_version so client refreshes
    try {
        $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$user['id']]);
    } catch (PDOException $e) { /* column may not exist pre-migration */ }
    
    // Audit log
    rsa_auditLog($pdo, null, AUDIT_SUBSCRIPTION_CANCELED, (int)$user['id'], [
        'stripe_subscription_id' => $subscription->id,
        'stripe_customer_id' => $customerId,
    ]);
    
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
    
    $customerId = $invoice->customer;
    
    // If user was past_due, restore to active and bump capability_version
    try {
        $stmt = $pdo->prepare("
            UPDATE users SET subscription_status = 'active'
            WHERE stripe_customer_id = ? AND subscription_status = 'past_due'
        ");
        $stmt->execute([$customerId]);
        
        if ($stmt->rowCount() > 0) {
            // Status changed — bump capability_version so client refreshes
            $userStmt = $pdo->prepare("SELECT id FROM users WHERE stripe_customer_id = ?");
            $userStmt->execute([$customerId]);
            $paidUser = $userStmt->fetch();
            if ($paidUser) {
                try {
                    $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$paidUser['id']]);
                } catch (PDOException $e) { /* pre-migration */ }
                
                // Also restore subscriptions table
                try {
                    $pdo->prepare("UPDATE subscriptions SET status = 'active' WHERE user_id = ? AND status = 'past_due'")->execute([$paidUser['id']]);
                } catch (PDOException $e) { /* table may not exist */ }
                
                rsa_auditLog($pdo, null, AUDIT_SUBSCRIPTION_RENEWED, (int)$paidUser['id'], [
                    'stripe_subscription_id' => $invoice->subscription,
                    'restored_from' => 'past_due',
                ]);
            }
        }
    } catch (PDOException $e) {
        error_log("handlePaymentSucceeded error: " . $e->getMessage());
    }
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
    
    // Update subscriptions table
    try {
        $pdo->prepare("
            UPDATE subscriptions SET status = 'past_due'
            WHERE stripe_customer_id = ? AND stripe_subscription_id = ?
        ")->execute([$customerId, $invoice->subscription]);
    } catch (PDOException $e) { /* table may not exist */ }
    
    // Bump capability_version + audit log
    try {
        $userStmt = $pdo->prepare("SELECT id FROM users WHERE stripe_customer_id = ?");
        $userStmt->execute([$customerId]);
        $failedUser = $userStmt->fetch();
        if ($failedUser) {
            $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$failedUser['id']]);
            rsa_auditLog($pdo, null, AUDIT_PAYMENT_FAILED, (int)$failedUser['id'], [
                'stripe_subscription_id' => $invoice->subscription,
            ]);
        }
    } catch (PDOException $e) { /* pre-migration fallback */ }
    
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

// Plan mapping functions are now in api/lib/plans.php:
//   rsa_getPlanIdFromPrice(), rsa_getProductsForPlan(), rsa_getBillingPeriodFromPrice()

/**
 * Upsert a row in the subscriptions table.
 * This is the authoritative subscription record (the users table columns are legacy).
 */
function rsa_upsertSubscription(PDO $pdo, int $userId, $subscription, ?string $planId, ?string $priceId): void {
    try {
        $billingPeriod = $priceId ? rsa_getBillingPeriodFromPrice($priceId) : 'monthly';
        $cancelAtEnd = $subscription->cancel_at_period_end ? 1 : 0;

        $stmt = $pdo->prepare("
            INSERT INTO subscriptions
                (user_id, stripe_subscription_id, stripe_customer_id, plan_id, price_id,
                 billing_period, status, current_period_start, current_period_end, cancel_at_period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), ?)
            ON DUPLICATE KEY UPDATE
                plan_id              = VALUES(plan_id),
                price_id             = VALUES(price_id),
                billing_period       = VALUES(billing_period),
                status               = VALUES(status),
                current_period_start = VALUES(current_period_start),
                current_period_end   = VALUES(current_period_end),
                cancel_at_period_end = VALUES(cancel_at_period_end)
        ");
        $stmt->execute([
            $userId,
            $subscription->id,
            $subscription->customer,
            $planId,
            $priceId,
            $billingPeriod,
            $subscription->status,
            $subscription->current_period_start,
            $subscription->current_period_end,
            $cancelAtEnd,
        ]);
    } catch (PDOException $e) {
        // subscriptions table may not exist yet (pre-migration) — log and continue
        error_log("rsa_upsertSubscription failed (table may not exist): " . $e->getMessage());
    }
}
