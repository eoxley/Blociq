import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Initialize Stripe and services
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  })

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_OUTLOOK!

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log('🎣 Stripe Outlook webhook received:', event.type)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`🤷‍♂️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json({
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Updating subscription:', subscription.id)

  // Get customer email
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const email = (customer as Stripe.Customer).email

  if (!email) {
    console.error('❌ No email found for customer:', subscription.customer)
    return
  }

  // Determine subscription status
  let status: string
  switch (subscription.status) {
    case 'active':
      status = 'active'
      break
    case 'trialing':
      status = 'trialing'
      break
    case 'canceled':
    case 'unpaid':
      status = 'cancelled'
      break
    case 'past_due':
      status = 'suspended'
      break
    default:
      status = 'suspended'
  }

  // Get usage limit based on subscription status and price
  let monthlyUsageLimit = 5000 // Default £15/month plan
  const priceId = subscription.items.data[0]?.price.id
  const isTrialing = subscription.status === 'trialing'

  // Unlimited during trial, then 5000 after
  if (isTrialing) {
    monthlyUsageLimit = 999999 // Unlimited during trial
  } else {
    monthlyUsageLimit = 5000 // £15/month plan limit
  }

  const { error } = await serviceSupabase
    .from('outlook_subscriptions')
    .upsert({
      email,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      monthly_usage_limit: monthlyUsageLimit,
      metadata: {
        stripe_subscription_status: subscription.status,
        price_id: priceId,
        last_webhook_event: 'subscription.updated'
      }
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (error) {
    console.error('❌ Error updating subscription in database:', error)
    throw error
  }

  console.log('✅ Subscription updated successfully for:', email)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Subscription cancelled:', subscription.id)

  const { error } = await serviceSupabase
    .from('outlook_subscriptions')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
      metadata: {
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'stripe_subscription_deleted',
        last_webhook_event: 'subscription.deleted'
      }
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('❌ Error cancelling subscription:', error)
    throw error
  }

  console.log('✅ Subscription cancelled successfully')
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💳 Payment succeeded for subscription:', invoice.subscription)

  if (!invoice.subscription) return

  // Reset monthly usage on successful payment
  const { error } = await serviceSupabase
    .from('outlook_subscriptions')
    .update({
      monthly_usage_count: 0,
      usage_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Reset in 30 days
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
      metadata: {
        last_payment_date: new Date().toISOString(),
        last_invoice_id: invoice.id,
        last_webhook_event: 'payment.succeeded'
      }
    })
    .eq('stripe_subscription_id', invoice.subscription as string)

  if (error) {
    console.error('❌ Error resetting usage after payment:', error)
    throw error
  }

  console.log('✅ Usage reset after successful payment')
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Payment failed for subscription:', invoice.subscription)

  if (!invoice.subscription) return

  const { error } = await serviceSupabase
    .from('outlook_subscriptions')
    .update({
      subscription_status: 'suspended',
      updated_at: new Date().toISOString(),
      metadata: {
        payment_failed_date: new Date().toISOString(),
        failed_invoice_id: invoice.id,
        last_webhook_event: 'payment.failed'
      }
    })
    .eq('stripe_subscription_id', invoice.subscription as string)

  if (error) {
    console.error('❌ Error suspending subscription after failed payment:', error)
    throw error
  }

  console.log('✅ Subscription suspended due to payment failure')
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('⏰ Trial ending soon for subscription:', subscription.id)

  // Get customer email for notification
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  const email = (customer as Stripe.Customer).email

  if (email) {
    // Log this event for potential email notifications
    const { error } = await serviceSupabase
      .from('outlook_subscriptions')
      .update({
        metadata: {
          trial_ending_notification_sent: new Date().toISOString(),
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          last_webhook_event: 'trial.will_end'
        }
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('❌ Error updating trial end notification:', error)
    } else {
      console.log('✅ Trial end notification logged for:', email)
    }

    // Here you could trigger an email notification to the customer
    // about their trial ending soon
  }
}