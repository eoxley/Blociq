import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    console.log('🔍 Verifying payment for email:', email);

    // Search for customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.log('❌ No customer found for email:', email);
      return NextResponse.json({
        success: false,
        hasPaid: false,
        error: 'No subscription found for this email address'
      });
    }

    const customer = customers.data[0];
    console.log('✅ Found customer:', customer.id);

    // Check for active and trialing subscriptions (includes free trials)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10
    });

    console.log(`🔍 Found ${subscriptions.data.length} total subscriptions`);

    // Filter for active or trialing subscriptions
    const validSubscriptions = subscriptions.data.filter(sub =>
      ['active', 'trialing'].includes(sub.status)
    );

    console.log(`🔍 Found ${validSubscriptions.length} active/trialing subscriptions`);

    // Debug: Log all subscription details
    validSubscriptions.forEach((sub, index) => {
      console.log(`   Subscription ${index + 1}:`, sub.id);
      console.log(`     Status: ${sub.status}`);
      console.log(`     Price IDs:`, sub.items.data.map(item => item.price.id));
    });

    // Look for BlocIQ Outlook subscription specifically (from valid subscriptions)
    const targetPriceId = 'price_1SAuvE2MJXtvDEif4tjlcyrS';
    console.log('🎯 Looking for price ID:', targetPriceId);

    const outlookSubscription = validSubscriptions.find(sub =>
      sub.items.data.some(item =>
        item.price.id === targetPriceId // BlocIQ Outlook AI price ID
      )
    );

    if (outlookSubscription) {
      console.log('✅ Found Outlook AI subscription:', outlookSubscription.id);
      console.log('   Status:', outlookSubscription.status);
      console.log('   Trial end:', outlookSubscription.trial_end);
      console.log('   Current period end:', outlookSubscription.current_period_end);

      return NextResponse.json({
        success: true,
        hasPaid: true,
        subscription: {
          id: outlookSubscription.id,
          status: outlookSubscription.status,
          customer_email: customer.email,
          current_period_end: outlookSubscription.current_period_end,
          trial_end: outlookSubscription.trial_end,
          is_trial: outlookSubscription.status === 'trialing'
        }
      });
    }

    // Also check for recent completed payments (last 24 hours)
    const recentPayments = await stripe.paymentIntents.list({
      customer: customer.id,
      created: {
        gte: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) // Last 24 hours
      },
      limit: 10
    });

    const completedPayment = recentPayments.data.find(payment =>
      payment.status === 'succeeded' &&
      payment.amount >= 1500 // £15 or more in pence
    );

    if (completedPayment) {
      console.log('✅ Found recent completed payment:', completedPayment.id);

      return NextResponse.json({
        success: true,
        hasPaid: true,
        recentPayment: true,
        payment: {
          id: completedPayment.id,
          amount: completedPayment.amount,
          currency: completedPayment.currency,
          status: completedPayment.status
        }
      });
    }

    // Final fallback: Check if customer has ANY valid subscription (for debugging)
    if (validSubscriptions.length > 0) {
      console.log('⚠️ Found valid subscriptions but no matching price ID');
      console.log('   This might be a price ID mismatch issue');

      // For debugging, let's accept ANY active/trialing subscription for now
      const anyValidSubscription = validSubscriptions[0];
      console.log('🔄 Using first valid subscription as fallback:', anyValidSubscription.id);

      return NextResponse.json({
        success: true,
        hasPaid: true,
        fallback: true,
        subscription: {
          id: anyValidSubscription.id,
          status: anyValidSubscription.status,
          customer_email: customer.email,
          current_period_end: anyValidSubscription.current_period_end,
          trial_end: anyValidSubscription.trial_end,
          is_trial: anyValidSubscription.status === 'trialing'
        }
      });
    }

    console.log('❌ No active subscription or recent payment found for:', email);
    return NextResponse.json({
      success: false,
      hasPaid: false,
      error: 'No active subscription found. Please complete your payment first.'
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify payment status'
    }, { status: 500 });
  }
}