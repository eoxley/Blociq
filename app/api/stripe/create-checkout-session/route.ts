import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get('product');

    if (!product) {
      return NextResponse.json({ error: 'Product parameter is required' }, { status: 400 });
    }

    // Define product configurations
    const productConfigs = {
      'outlook-addin-trial': {
        name: 'BlocIQ Outlook Add-in - 30 Day Trial',
        description: 'Experience AI-powered property management directly in your Outlook inbox. 30-day free trial with full access to all features.',
        price: 0, // Free trial
        trialPeriodDays: 30,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/outlook-trial-success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
      },
      'outlook-addin-monthly': {
        name: 'BlocIQ Outlook Add-in - Monthly',
        description: 'Monthly subscription to BlocIQ Outlook Add-in with AI-powered property management features.',
        price: 2900, // £29.00 in pence
        trialPeriodDays: 30,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/outlook-subscription-success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
      },
      'outlook-addin-annual': {
        name: 'BlocIQ Outlook Add-in - Annual',
        description: 'Annual subscription to BlocIQ Outlook Add-in with AI-powered property management features. Save 20% with annual billing.',
        price: 27840, // £278.40 in pence (20% discount)
        trialPeriodDays: 30,
        successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/outlook-subscription-success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
      }
    };

    const config = productConfigs[product as keyof typeof productConfigs];
    if (!config) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: config.name,
              description: config.description,
            },
            unit_amount: config.price,
            recurring: product === 'outlook-addin-trial' ? undefined : {
              interval: product === 'outlook-addin-annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: product === 'outlook-addin-trial' ? 'payment' : 'subscription',
      success_url: config.successUrl,
      cancel_url: config.cancelUrl,
      metadata: {
        product: product,
        trial_days: config.trialPeriodDays.toString(),
      },
      // For trial, we'll handle the trial period in our webhook
      subscription_data: product !== 'outlook-addin-trial' ? {
        trial_period_days: config.trialPeriodDays,
        metadata: {
          product: product,
        },
      } : undefined,
      // Allow promotion codes
      allow_promotion_codes: true,
      // Customer information
      customer_creation: 'always',
      // Billing address collection
      billing_address_collection: 'required',
      // For trial, collect payment method but don't charge
      payment_intent_data: product === 'outlook-addin-trial' ? {
        setup_future_usage: 'off_session',
      } : undefined,
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
