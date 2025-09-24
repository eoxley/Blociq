import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    })

    const { email, priceId, successUrl, cancelUrl } = await request.json()

    if (!email || !priceId) {
      return NextResponse.json({
        error: 'Email and priceId are required'
      }, { status: 400 })
    }

    // Create or retrieve Stripe customer
    let customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          product: 'outlook_addon'
        }
      })
    }

    // Create checkout session for subscription with 30-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${request.headers.get('origin')}/outlook-subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.headers.get('origin')}/outlook-subscription`,
      allow_promotion_codes: true,
      metadata: {
        customer_email: email,
        product_type: 'outlook_addon'
      },
      subscription_data: {
        trial_period_days: 30, // 30-day free trial
        metadata: {
          customer_email: email,
          product_type: 'outlook_addon',
          trial_period_days: '30'
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      customerId: customer.id
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    }, { status: 500 })
  }
}

// Handle successful subscription creation
export async function GET(request: NextRequest) {
  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    })

    // Initialize Supabase
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({
        error: 'Session ID required'
      }, { status: 400 })
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    })

    if (!session.subscription || typeof session.subscription === 'string') {
      return NextResponse.json({
        error: 'No subscription found for this session'
      }, { status: 400 })
    }

    const subscription = session.subscription as Stripe.Subscription
    const customerEmail = session.metadata?.customer_email || session.customer_details?.email

    if (!customerEmail) {
      return NextResponse.json({
        error: 'Customer email not found'
      }, { status: 400 })
    }

    // Determine subscription status and usage limit
    const isTrialing = subscription.status === 'trialing'
    const usageLimit = isTrialing ? 999999 : 5000 // Unlimited during trial, then 5000

    // Create subscription record in our database
    const { error: dbError } = await serviceSupabase
      .from('outlook_subscriptions')
      .upsert({
        email: customerEmail,
        subscription_status: isTrialing ? 'trialing' : 'active',
        subscription_type: 'outlook_addon',
        stripe_subscription_id: subscription.id,
        stripe_customer_id: session.customer as string,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        monthly_usage_limit: usageLimit,
        monthly_usage_count: 0,
        metadata: {
          stripe_session_id: sessionId,
          price_id: subscription.items.data[0]?.price.id,
          created_from: 'stripe_checkout',
          trial_period_days: subscription.trial_end ? '30' : null
        }
      }, {
        onConflict: 'email'
      })

    if (dbError) {
      console.error('Error saving subscription to database:', dbError)
      return NextResponse.json({
        error: 'Failed to save subscription'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        customer: customerEmail,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      }
    })

  } catch (error) {
    console.error('Error retrieving session:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to retrieve session'
    }, { status: 500 })
  }
}