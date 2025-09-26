// Test script to verify webhook email notifications are working
// Run this to simulate a new subscription event and test email delivery

const fetch = require('node-fetch');
require('dotenv').config({ path: './.env.local' });

async function testEmailNotification() {
  console.log('🧪 Testing webhook email notifications...\n');

  // Check required environment variables
  const requiredVars = {
    'RESEND_API_KEY': process.env.RESEND_API_KEY,
    'ADMIN_EMAIL': process.env.ADMIN_EMAIL,
    'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL
  };

  console.log('📋 Environment Variable Check:');
  let hasAllVars = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    const status = value && !value.includes('[') && !value.includes('your_') ? '✅' : '❌';
    console.log(`${status} ${key}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'NOT SET'}`);
    if (status === '❌') hasAllVars = false;
  }

  if (!hasAllVars) {
    console.log('\n❌ Missing or invalid environment variables. Please update your .env.local file with:');
    console.log('- RESEND_API_KEY: Get this from https://resend.com/');
    console.log('- ADMIN_EMAIL: Your email address to receive notifications');
    console.log('- NEXT_PUBLIC_SITE_URL: Should be https://www.blociq.co.uk for production');
    return;
  }

  console.log('\n✅ All environment variables look good!\n');

  // Test Resend API directly
  console.log('📧 Testing Resend API connection...');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@blociq.co.uk',
        to: [process.env.ADMIN_EMAIL || 'support@blociq.co.uk'],
        subject: '🧪 BlocIQ Webhook Test - New Subscription Notification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">🧪 Test: New Subscription Alert</h1>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669;">📊 Test Subscription Details</h3>
              <ul>
                <li><strong>Customer:</strong> Test Customer (test@example.com)</li>
                <li><strong>Subscription ID:</strong> sub_test123456789</li>
                <li><strong>Status:</strong> ACTIVE</li>
                <li><strong>Amount:</strong> GBP 29.00</li>
                <li><strong>Created:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p>This is a test email to verify your webhook email notifications are working correctly.</p>
            <p><strong>Next steps:</strong></p>
            <ol>
              <li>If you received this email, your notification system is working! 🎉</li>
              <li>Update your Stripe webhook endpoint to include customer.subscription.created</li>
              <li>Test with a real subscription to confirm end-to-end functionality</li>
            </ol>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is a test notification from BlocIQ Webhook Email System<br>
              Generated: ${new Date().toISOString()}
            </p>
          </div>
        `,
        text: `
🧪 Test: New Subscription Alert

Test Subscription Details:
- Customer: Test Customer (test@example.com)
- Subscription ID: sub_test123456789
- Status: ACTIVE
- Amount: GBP 29.00
- Created: ${new Date().toLocaleString()}

This is a test email to verify your webhook email notifications are working correctly.

Next steps:
1. If you received this email, your notification system is working! 🎉
2. Update your Stripe webhook endpoint to include customer.subscription.created
3. Test with a real subscription to confirm end-to-end functionality

---
This is a test notification from BlocIQ Webhook Email System
Generated: ${new Date().toISOString()}
        `,
        tags: [
          { name: 'category', value: 'test-notification' },
          { name: 'product', value: 'webhook-test' }
        ]
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test email sent successfully!');
      console.log(`📧 Email ID: ${result.id}`);
      console.log(`📬 Sent to: ${process.env.ADMIN_EMAIL || 'support@blociq.co.uk'}`);
      console.log('\n🎉 Check your inbox! If you receive the test email, your notification system is working.');
    } else {
      const error = await response.text();
      console.error('❌ Failed to send test email:', error);
      console.log('\n💡 Common issues:');
      console.log('- Invalid RESEND_API_KEY');
      console.log('- Domain not verified in Resend');
      console.log('- Sender email domain (blociq.co.uk) not added to Resend');
    }
  } catch (error) {
    console.error('❌ Error testing email:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. If the test email worked, update your production environment variables');
  console.log('2. Ensure your webhook endpoint is configured in Stripe');
  console.log('3. Test with a real subscription to confirm everything works');
}

testEmailNotification();