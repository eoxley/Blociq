import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe and Supabase
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_OUTLOOK_WEBHOOK_SECRET!
    );

    console.log('🎣 Stripe Outlook webhook received:', event.type);

    switch (event.type) {
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialEnding(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  console.log('🚫 Processing subscription cancellation:', subscription.id);

  try {
    // Get customer email from Stripe
    const customer = await stripe!.customers.retrieve(subscription.customer as string);
    const customerEmail = (customer as Stripe.Customer).email;

    if (!customerEmail) {
      console.error('❌ No customer email found for subscription:', subscription.id);
      return;
    }

    // Find user in our database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (!user) {
      console.error('❌ User not found for email:', customerEmail);
      return;
    }

    // Update subscription status immediately - REVOKE ACCESS
    const { error: updateError } = await supabaseAdmin
      .from('outlook_subscriptions')
      .update({
        status: 'cancelled',
        stripe_subscription_id: subscription.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'stripe_cancellation',
        usage_remaining: 0, // ⚠️ IMMEDIATE ACCESS REVOCATION
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Failed to update subscription:', updateError);
      return;
    }

    // Log the cancellation event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: user.id,
        event_type: 'cancelled',
        event_data: {
          stripe_subscription_id: subscription.id,
          cancelled_at: new Date().toISOString(),
          reason: 'user_cancellation',
          automatic: true
        }
      });

    // Send cancellation confirmation email
    await sendCancellationEmail(customerEmail, subscription);

    console.log('✅ Subscription cancelled and access revoked for:', customerEmail);

  } catch (error) {
    console.error('❌ Error processing subscription cancellation:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Processing subscription update:', subscription.id);

  const customer = await stripe!.customers.retrieve(subscription.customer as string);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) return;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (!user) return;

  // Handle different subscription statuses
  let newStatus = 'active';
  let usageRemaining = 100; // Default monthly limit

  switch (subscription.status) {
    case 'canceled':
      newStatus = 'cancelled';
      usageRemaining = 0;
      break;
    case 'unpaid':
    case 'past_due':
      newStatus = 'suspended';
      usageRemaining = 0;
      break;
    case 'paused':
      newStatus = 'paused';
      usageRemaining = 0;
      break;
    case 'active':
    case 'trialing':
      newStatus = 'active';
      // Reset usage at start of new billing cycle
      if (subscription.current_period_start * 1000 > Date.now() - 86400000) { // Last 24h
        usageRemaining = 100;
      }
      break;
  }

  await supabaseAdmin
    .from('outlook_subscriptions')
    .update({
      status: newStatus,
      stripe_subscription_id: subscription.id,
      stripe_status: subscription.status,
      usage_remaining: usageRemaining,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  console.log(`✅ Subscription updated for ${customerEmail}: ${newStatus} (usage: ${usageRemaining})`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💳 Processing payment failure:', invoice.id);

  if (invoice.subscription) {
    const subscription = await stripe!.subscriptions.retrieve(invoice.subscription as string);
    const customer = await stripe!.customers.retrieve(subscription.customer as string);
    const customerEmail = (customer as Stripe.Customer).email;

    if (!customerEmail) return;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (!user) return;

    // Suspend access after payment failure
    await supabaseAdmin
      .from('outlook_subscriptions')
      .update({
        status: 'payment_failed',
        usage_remaining: 0, // ⚠️ SUSPEND ACCESS
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    // Log payment failure
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: user.id,
        event_type: 'payment_failed',
        event_data: {
          invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count
        }
      });

    // Send payment failure email
    await sendPaymentFailureEmail(customerEmail, invoice);

    console.log('✅ Access suspended due to payment failure for:', customerEmail);
  }
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  console.log('⏰ Processing trial ending:', subscription.id);

  const customer = await stripe!.customers.retrieve(subscription.customer as string);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) return;

  // Send trial ending email
  await sendTrialEndingEmail(customerEmail, subscription);

  console.log('✅ Trial ending notification sent to:', customerEmail);
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  console.log('⏸️ Processing subscription pause:', subscription.id);

  const customer = await stripe!.customers.retrieve(subscription.customer as string);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) return;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (!user) return;

  // Pause access
  await supabaseAdmin
    .from('outlook_subscriptions')
    .update({
      status: 'paused',
      usage_remaining: 0, // ⚠️ SUSPEND ACCESS
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  console.log('✅ Subscription paused for:', customerEmail);
}

async function sendCancellationEmail(email: string, subscription: Stripe.Subscription) {
  console.log('📧 Sending cancellation email to:', email);
  // Implement your email service here
  // await emailService.send({
  //   to: email,
  //   subject: 'BlocIQ Outlook Add-in Subscription Cancelled',
  //   template: 'outlook-subscription-cancelled',
  //   data: {
  //     subscription_id: subscription.id,
  //     cancelled_at: new Date().toISOString()
  //   }
  // });
}

async function sendPaymentFailureEmail(email: string, invoice: Stripe.Invoice) {
  console.log('📧 Sending payment failure email to:', email);
  // Implement your email service here
}

async function sendTrialEndingEmail(email: string, subscription: Stripe.Subscription) {
  console.log('📧 Sending trial ending email to:', email);
  // Implement your email service here
}