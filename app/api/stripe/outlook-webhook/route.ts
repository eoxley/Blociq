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
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

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

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🎉 Processing new subscription:', subscription.id);

  try {
    // Get customer details from Stripe
    const customer = await stripe!.customers.retrieve(subscription.customer as string);
    const customerEmail = (customer as Stripe.Customer).email;

    if (!customerEmail) {
      console.error('❌ No customer email found for subscription:', subscription.id);
      return;
    }

    console.log('✅ New Outlook subscription created:', {
      email: customerEmail,
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0]?.price?.id,
      amount: subscription.items.data[0]?.price?.unit_amount,
      currency: subscription.items.data[0]?.price?.currency
    });

    // Send notification to admin/support team
    await sendNewSubscriptionNotification({
      customerEmail,
      customerName: (customer as Stripe.Customer).name || 'N/A',
      subscriptionId: subscription.id,
      status: subscription.status,
      amount: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.items.data[0]?.price?.currency || 'usd',
      createdAt: new Date(subscription.created * 1000).toISOString()
    });

    // Send welcome email to customer
    await sendWelcomeEmail(customerEmail, subscription);

    // Log the subscription creation event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: null, // We may not have user_id yet
        event_type: 'created',
        event_data: {
          stripe_subscription_id: subscription.id,
          customer_email: customerEmail,
          status: subscription.status,
          created_at: new Date(subscription.created * 1000).toISOString(),
          amount: subscription.items.data[0]?.price?.unit_amount || 0,
          currency: subscription.items.data[0]?.price?.currency || 'usd'
        }
      });

    console.log('✅ New subscription notifications sent for:', customerEmail);

  } catch (error) {
    console.error('❌ Error processing new subscription:', error);
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

interface NewSubscriptionData {
  customerEmail: string;
  customerName: string;
  subscriptionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

async function sendNewSubscriptionNotification(data: NewSubscriptionData) {
  console.log('📧 Sending new subscription notification to admin');

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'support@blociq.co.uk';

  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  try {
    const formattedAmount = (data.amount / 100).toFixed(2);
    const currency = data.currency.toUpperCase();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@blociq.co.uk',
        to: [ADMIN_EMAIL],
        subject: `🎉 New BlocIQ Outlook Subscription - ${data.customerEmail}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>New Subscription Alert</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
                    🎉 New Outlook Subscription!
                  </h1>
                  <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">
                    A new customer has subscribed to BlocIQ Outlook AI
                  </p>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">
                  <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #059669; margin-top: 0; font-size: 18px;">📊 Subscription Details</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #047857;">
                      <li><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</li>
                      <li><strong>Subscription ID:</strong> ${data.subscriptionId}</li>
                      <li><strong>Status:</strong> ${data.status.toUpperCase()}</li>
                      <li><strong>Amount:</strong> ${currency} ${formattedAmount}</li>
                      <li><strong>Created:</strong> ${new Date(data.createdAt).toLocaleString()}</li>
                    </ul>
                  </div>

                  <div style="background-color: #ddd6fe; border: 1px solid #a78bfa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #7c3aed; margin-top: 0; font-size: 18px;">📋 Next Steps</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #6d28d9;">
                      <li>Customer will receive welcome email with setup instructions</li>
                      <li>Add-in manifests are available for download</li>
                      <li>Monitor usage in the admin dashboard</li>
                      <li>Ensure customer has smooth onboarding experience</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blociq.co.uk'}/admin/outlook-monitoring"
                       style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                      📊 View Admin Dashboard
                    </a>
                    <a href="https://dashboard.stripe.com/subscriptions/${data.subscriptionId}"
                       style="display: inline-block; background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      💳 View in Stripe
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
                    This is an automated notification from the BlocIQ Outlook Subscription System
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
          🎉 New BlocIQ Outlook Subscription

          Customer: ${data.customerName} (${data.customerEmail})
          Subscription ID: ${data.subscriptionId}
          Status: ${data.status.toUpperCase()}
          Amount: ${currency} ${formattedAmount}
          Created: ${new Date(data.createdAt).toLocaleString()}

          Next Steps:
          - Customer will receive welcome email with setup instructions
          - Add-in manifests are available for download
          - Monitor usage in the admin dashboard
          - Ensure customer has smooth onboarding experience

          View Admin Dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blociq.co.uk'}/admin/outlook-monitoring
          View in Stripe: https://dashboard.stripe.com/subscriptions/${data.subscriptionId}

          ---
          This is an automated notification from the BlocIQ Outlook Subscription System
        `,
        tags: [
          { name: 'category', value: 'new-subscription' },
          { name: 'product', value: 'outlook-ai' },
          { name: 'customer_email', value: data.customerEmail }
        ]
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ New subscription notification sent to admin:`, result.id);
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send new subscription notification:`, error);
    }
  } catch (error) {
    console.error('❌ Error sending new subscription notification:', error);
  }
}

async function sendWelcomeEmail(email: string, subscription: Stripe.Subscription) {
  console.log('📧 Sending welcome email to:', email);

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured, skipping welcome email');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@blociq.co.uk',
        to: [email],
        subject: '🎉 Welcome to BlocIQ Outlook AI - Get Started Now!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Welcome to BlocIQ Outlook AI</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
                    🎉 Welcome to BlocIQ Outlook AI!
                  </h1>
                  <p style="margin: 10px 0 0; opacity: 0.9; font-size: 18px;">
                    Your subscription is active and ready to use
                  </p>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">
                  <p style="font-size: 16px; margin-top: 0;">Hi there,</p>

                  <p style="font-size: 16px;">
                    Thank you for subscribing to BlocIQ Outlook AI! Your subscription is now active and you can start transforming your property management emails with AI-powered assistance.
                  </p>

                  <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #059669; margin-top: 0; font-size: 18px;">🚀 What You Get</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #047857;">
                      <li><strong>Ask AI:</strong> Chat sidebar for property management guidance</li>
                      <li><strong>Generate Reply:</strong> Professional email responses with context</li>
                      <li><strong>Inbox Triage:</strong> Bulk email processing and drafts</li>
                      <li><strong>UK Compliance:</strong> Industry knowledge and best practices</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blociq.co.uk'}/outlook-subscription/install"
                       style="display: inline-block; background-color: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 18px;">
                      📥 Download Add-ins & Get Started
                    </a>
                  </div>

                  <div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #1d4ed8; margin-top: 0; font-size: 18px;">📋 Quick Setup Steps</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #1e40af;">
                      <li>Click the button above to download your manifest files</li>
                      <li>Open Outlook → Home → Get Add-ins → My add-ins</li>
                      <li>Click "Add a custom add-in" → "Add from file"</li>
                      <li>Upload each manifest file and install</li>
                      <li>Start using BlocIQ AI buttons in your emails!</li>
                    </ol>
                  </div>

                  <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      💡 <strong>Need Help?</strong> Our setup guide includes detailed instructions for desktop and web versions of Outlook.
                      Contact support@blociq.co.uk if you need assistance.
                    </p>
                  </div>

                  <p style="font-size: 16px; margin-bottom: 0; margin-top: 30px;">
                    Welcome to the future of property management communication!<br><br>
                    Best regards,<br>
                    The BlocIQ Team
                  </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    BlocIQ Outlook AI Subscription<br>
                    Subscription ID: ${subscription.id}
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
          🎉 Welcome to BlocIQ Outlook AI!

          Hi there,

          Thank you for subscribing to BlocIQ Outlook AI! Your subscription is now active and you can start transforming your property management emails with AI-powered assistance.

          What You Get:
          - Ask AI: Chat sidebar for property management guidance
          - Generate Reply: Professional email responses with context
          - Inbox Triage: Bulk email processing and drafts
          - UK Compliance: Industry knowledge and best practices

          Quick Setup Steps:
          1. Visit: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blociq.co.uk'}/outlook-subscription/install
          2. Download your manifest files
          3. Open Outlook → Home → Get Add-ins → My add-ins
          4. Click "Add a custom add-in" → "Add from file"
          5. Upload each manifest file and install
          6. Start using BlocIQ AI buttons in your emails!

          Need Help? Our setup guide includes detailed instructions for desktop and web versions of Outlook.
          Contact support@blociq.co.uk if you need assistance.

          Welcome to the future of property management communication!

          Best regards,
          The BlocIQ Team

          ---
          BlocIQ Outlook AI Subscription
          Subscription ID: ${subscription.id}
        `,
        tags: [
          { name: 'category', value: 'welcome-email' },
          { name: 'product', value: 'outlook-ai' },
          { name: 'subscription_id', value: subscription.id }
        ]
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Welcome email sent to ${email}:`, result.id);
    } else {
      const error = await response.text();
      console.error(`❌ Failed to send welcome email to ${email}:`, error);
    }
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
}