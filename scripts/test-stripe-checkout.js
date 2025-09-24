#!/usr/bin/env node

/**
 * Test script to create a Stripe checkout session for debugging
 * Run with: node scripts/test-stripe-checkout.js
 */

require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testCheckoutCreation() {
  console.log('🧪 Testing Stripe checkout session creation...');

  try {
    // First check if price exists
    const priceId = 'price_1SAuvE2MJXtvDEif4tjlcyrS';
    console.log('📋 Checking if price exists...');

    const price = await stripe.prices.retrieve(priceId);
    console.log('✅ Price found:', {
      id: price.id,
      amount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring
    });

    // Create a test customer
    console.log('👤 Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      metadata: { test: 'true' }
    });
    console.log('✅ Test customer created:', customer.id);

    // Create checkout session
    console.log('🛒 Creating checkout session...');
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
      success_url: 'https://www.blociq.co.uk/outlook-subscription/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.blociq.co.uk/outlook-subscription',
      allow_promotion_codes: true,
      metadata: {
        customer_email: 'test@example.com',
        product_type: 'outlook_addon'
      },
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          customer_email: 'test@example.com',
          product_type: 'outlook_addon',
          trial_period_days: '30'
        }
      }
    });

    console.log('✅ Checkout session created successfully!');
    console.log('Session details:', {
      id: session.id,
      url: session.url,
      success_url: session.success_url,
      customer: session.customer,
      mode: session.mode,
      payment_status: session.payment_status
    });

    // Clean up - delete test customer
    await stripe.customers.del(customer.id);
    console.log('🧹 Test customer deleted');

    console.log('\n🎉 Checkout session creation test passed!');
    console.log('🔗 Test checkout URL:', session.url);
    console.log('📋 Session ID to test with:', session.id);

  } catch (error) {
    console.error('❌ Checkout session test failed:', error.message);
    if (error.type) {
      console.error('Error type:', error.type);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testCheckoutCreation();