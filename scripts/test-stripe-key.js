#!/usr/bin/env node

/**
 * Script to test if Stripe API key is valid
 * Run with: node scripts/test-stripe-key.js
 */

const stripe = require('stripe');

async function testStripeKey() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    console.error('❌ STRIPE_SECRET_KEY environment variable not set');
    console.log('💡 Run: export STRIPE_SECRET_KEY=sk_live_[your_stripe_secret_key]');
    process.exit(1);
  }

  console.log('🔍 Testing Stripe API key...');
  console.log(`Key starts with: ${apiKey.substring(0, 20)}...`);
  console.log(`Key length: ${apiKey.length} characters`);

  try {
    const stripeClient = stripe(apiKey, {
      apiVersion: '2024-06-20',
    });

    // Test the key by fetching account info
    const account = await stripeClient.accounts.retrieve();

    console.log('✅ Stripe API key is valid!');
    console.log(`Account ID: ${account.id}`);
    console.log(`Business type: ${account.business_type || 'Not set'}`);
    console.log(`Country: ${account.country}`);
    console.log(`Charges enabled: ${account.charges_enabled}`);
    console.log(`Payouts enabled: ${account.payouts_enabled}`);

    // Test creating a customer (to verify write permissions)
    console.log('\n🧪 Testing customer creation...');
    const testCustomer = await stripeClient.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      metadata: { test: 'true' }
    });

    console.log('✅ Customer creation successful!');
    console.log(`Test customer ID: ${testCustomer.id}`);

    // Clean up - delete the test customer
    await stripeClient.customers.del(testCustomer.id);
    console.log('🧹 Test customer deleted');

    console.log('\n🎉 All tests passed! Your Stripe API key is working correctly.');

  } catch (error) {
    console.error('❌ Stripe API key test failed:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Authentication error suggestions:');
      console.log('  1. Check that your API key is correct');
      console.log('  2. Make sure you\'re using the live key (starts with sk_live_)');
      console.log('  3. Verify the key hasn\'t been revoked in Stripe dashboard');
    } else if (error.type === 'StripePermissionError') {
      console.log('\n💡 Permission error suggestions:');
      console.log('  1. Check your Stripe account permissions');
      console.log('  2. Make sure your account is fully activated');
    }

    process.exit(1);
  }
}

// Check if Stripe module is available
try {
  require('stripe');
} catch (error) {
  console.error('❌ Stripe module not found. Install it with:');
  console.error('   npm install stripe');
  process.exit(1);
}

testStripeKey();