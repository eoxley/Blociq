#!/usr/bin/env node

/**
 * Debug script to understand the session flow issue
 * Run with: node scripts/debug-session-flow.js [session_id]
 */

require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_live_example');

async function debugSessionFlow() {
  console.log('🔍 Debugging session flow...');

  // Use the session ID from the previous test or command line argument
  const sessionId = process.argv[2] || 'cs_live_b1KmhrJthFEnXxHmaEzI7IzE5v9Rz909FPt6VnomUU5I5PqAIkWF8G9mmd';

  console.log('📋 Session ID to debug:', sessionId);

  try {
    // Try to retrieve the session
    console.log('1. Retrieving session...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('Session details:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      subscription: session.subscription,
      customer: session.customer,
      mode: session.mode,
      success_url: session.success_url,
      metadata: session.metadata
    });

    // Try to expand subscription
    if (session.subscription) {
      console.log('2. Subscription found, retrieving details...');
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      console.log('Subscription details:', {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end
      });
    } else {
      console.log('2. ❌ No subscription attached to this session');
      console.log('   This could be because:');
      console.log('   - The checkout was not completed');
      console.log('   - The session is still in progress');
      console.log('   - There was an error during subscription creation');
    }

    // Try to get customer details
    if (session.customer) {
      console.log('3. Retrieving customer details...');
      const customer = await stripe.customers.retrieve(session.customer);
      console.log('Customer details:', {
        id: customer.id,
        email: customer.email,
        created: customer.created
      });
    } else {
      console.log('3. ❌ No customer attached to this session');
    }

  } catch (error) {
    console.error('❌ Error debugging session:', error.message);
    if (error.type) {
      console.error('Error type:', error.type);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }

    if (error.type === 'StripeInvalidRequestError' && error.message.includes('No such checkout.session')) {
      console.log('\n💡 Suggestions:');
      console.log('   - The session ID might be expired or invalid');
      console.log('   - Try with a session ID from a recent checkout attempt');
      console.log('   - Check if the session ID was copied correctly');
    }
  }
}

debugSessionFlow();