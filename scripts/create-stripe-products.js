#!/usr/bin/env node

/**
 * Script to create Stripe products and prices for BlocIQ Outlook Add-in
 * Run with: node scripts/create-stripe-products.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
  console.log('🚀 Creating Stripe products for BlocIQ Outlook Add-in...\n');

  try {
    // Define the product and pricing (single plan with 30-day trial)
    const products = [
      {
        name: 'BlocIQ Outlook AI',
        description: '30-day free trial, then £15/month for 5,000 AI replies with advanced property management features',
        price: 1500, // £15.00 in pence
        usageLimit: 5000,
        trialDays: 30,
        metadata: {
          plan_type: 'professional',
          usage_limit: '5000',
          trial_period_days: '30',
          features: 'advanced_analysis,building_context,compliance_checking,professional_templates,email_support'
        }
      }
    ];

    const createdProducts = [];

    for (const productData of products) {
      console.log(`📦 Creating product: ${productData.name}`);

      // Create the product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: productData.metadata
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create the recurring price
      const price = await stripe.prices.create({
        unit_amount: productData.price,
        currency: 'gbp',
        recurring: {
          interval: 'month',
        },
        product: product.id,
        metadata: {
          ...productData.metadata,
          usage_limit: productData.usageLimit.toString()
        }
      });

      console.log(`💰 Price created: ${price.id}`);

      createdProducts.push({
        product: product,
        price: price,
        planType: productData.metadata.plan_type,
        usageLimit: productData.usageLimit
      });

      console.log('---\n');
    }

    // Display summary
    console.log('🎉 BlocIQ Outlook AI product created successfully!\n');
    console.log('📋 IMPORTANT: Update your application with this price ID:\n');

    createdProducts.forEach((item) => {
      console.log(`${item.planType.toUpperCase()} Plan (£15/month with 30-day free trial):`);
      console.log(`  Product ID: ${item.product.id}`);
      console.log(`  Price ID: ${item.price.id}`);
      console.log(`  Usage Limit: ${item.usageLimit.toLocaleString()} replies/month (after trial)`);
      console.log(`  Trial Period: 30 days (unlimited during trial)`);
      console.log('');
    });

    console.log('🔧 Update the following files with this price ID:');
    console.log('  - app/outlook-subscription/page.tsx');
    console.log('  - app/api/stripe/webhook-outlook/route.ts');
    console.log('');

    console.log('💡 Don\'t forget to:');
    console.log('  1. Update your Stripe webhook endpoint URL');
    console.log('  2. Set the STRIPE_WEBHOOK_SECRET_OUTLOOK environment variable');
    console.log('  3. Test the subscription flow in development mode first');
    console.log('  4. Run the database migration: supabase/migrations/20250101000001_update_outlook_subscription_trial.sql');
    console.log('');

    // Generate replacement string for easy copy-paste
    console.log('📝 Copy-paste replacement:');
    console.log('');

    const professional = createdProducts.find(p => p.planType === 'professional');
    if (professional) {
      console.log(`Replace 'price_1S4FGI2MJXtvDEifOutlookAI15' with '${professional.price.id}'`);
      console.log('');
      console.log('This single price ID should be used in:');
      console.log('- app/outlook-subscription/page.tsx (line ~15)');
      console.log('- app/api/stripe/webhook-outlook/route.ts (if you need specific price handling)');
    }

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error.message);

    if (error.code === 'api_key_invalid') {
      console.error('\n💡 Make sure you have set the STRIPE_SECRET_KEY environment variable');
      console.error('   Run: export STRIPE_SECRET_KEY=sk_live_...');
    }

    process.exit(1);
  }
}

// Check if Stripe key is provided
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  console.error('💡 Run: export STRIPE_SECRET_KEY=sk_live_[your_stripe_secret_key]');
  console.error('   Then run: node scripts/create-stripe-products.js');
  process.exit(1);
}

// Run the script
createStripeProducts();