#!/usr/bin/env node

/**
 * BlocIQ Outlook Subscription Management CLI Tool
 *
 * Quick command-line tool for managing Outlook add-in subscriptions
 *
 * Usage:
 *   node scripts/manage-outlook-subscriptions.js --help
 *   node scripts/manage-outlook-subscriptions.js list --status=active
 *   node scripts/manage-outlook-subscriptions.js revoke --email=user@example.com --reason="User requested cancellation"
 *   node scripts/manage-outlook-subscriptions.js bulk-revoke --file=emails.txt --reason="Service discontinuation"
 *   node scripts/manage-outlook-subscriptions.js stats
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const commands = {
  list: async (options) => {
    console.log('📋 Fetching Outlook subscriptions...\n');

    let query = supabase
      .from('outlook_subscriptions')
      .select(`
        *,
        users!inner(email, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.limit) {
      query = query.limit(parseInt(options.limit));
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('❌ Error fetching subscriptions:', error.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found.');
      return;
    }

    console.log(`Found ${subscriptions.length} subscription(s):\n`);

    subscriptions.forEach(sub => {
      const userName = `${sub.users.first_name || ''} ${sub.users.last_name || ''}`.trim() || 'N/A';
      const createdAt = new Date(sub.created_at).toLocaleDateString();
      const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at).toLocaleDateString() : 'N/A';

      console.log(`👤 ${userName} (${sub.users.email})`);
      console.log(`   Status: ${sub.status.toUpperCase()}`);
      console.log(`   Usage Remaining: ${sub.usage_remaining}`);
      console.log(`   Created: ${createdAt}`);
      console.log(`   Cancelled: ${cancelledAt}`);
      if (sub.stripe_subscription_id) {
        console.log(`   Stripe ID: ${sub.stripe_subscription_id}`);
      }
      console.log('');
    });
  },

  revoke: async (options) => {
    if (!options.email) {
      console.error('❌ Email is required for revoke command');
      console.log('Usage: node scripts/manage-outlook-subscriptions.js revoke --email=user@example.com --reason="Optional reason"');
      return;
    }

    const reason = options.reason || 'Administrative revocation';

    console.log(`🚫 Revoking subscription for: ${options.email}`);
    console.log(`   Reason: ${reason}\n`);

    const { data, error } = await supabase
      .rpc('revoke_outlook_subscription', {
        target_email: options.email,
        revocation_reason: reason,
        effective_immediately: true
      });

    if (error) {
      console.error('❌ Error revoking subscription:', error.message);
      return;
    }

    if (data.success) {
      console.log('✅ Subscription revoked successfully!');
      console.log(`   User: ${data.user_email}`);
      console.log(`   Previous Status: ${data.previous_status}`);
      console.log(`   Revoked At: ${new Date(data.revoked_at).toLocaleString()}`);
    } else {
      console.error('❌ Failed to revoke subscription:', data.error);
    }
  },

  'bulk-revoke': async (options) => {
    let emails = [];

    if (options.file) {
      // Read emails from file
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      emails = fileContent
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0 && email.includes('@'));

      console.log(`📂 Loaded ${emails.length} emails from ${options.file}`);
    } else if (options.emails) {
      // Emails provided as comma-separated string
      emails = options.emails.split(',').map(email => email.trim());
    } else {
      console.error('❌ Either --file or --emails is required for bulk-revoke');
      console.log('Usage: node scripts/manage-outlook-subscriptions.js bulk-revoke --file=emails.txt --reason="Optional reason"');
      console.log('   or: node scripts/manage-outlook-subscriptions.js bulk-revoke --emails="user1@example.com,user2@example.com" --reason="Optional reason"');
      return;
    }

    if (emails.length === 0) {
      console.error('❌ No valid email addresses found');
      return;
    }

    const reason = options.reason || 'Bulk administrative revocation';

    console.log(`🚫 Bulk revoking ${emails.length} subscriptions...`);
    console.log(`   Reason: ${reason}\n`);

    // Confirm action
    if (!options.force) {
      console.log('⚠️  This will immediately revoke access for all specified users.');
      console.log('   Add --force flag to skip this confirmation.');
      console.log('\n   Emails to be revoked:');
      emails.forEach(email => console.log(`   - ${email}`));
      console.log('\n   Press Ctrl+C to cancel or add --force flag to proceed automatically.');
      return;
    }

    const { data, error } = await supabase
      .rpc('bulk_revoke_outlook_subscriptions', {
        target_emails: emails,
        revocation_reason: reason
      });

    if (error) {
      console.error('❌ Error performing bulk revocation:', error.message);
      return;
    }

    console.log('✅ Bulk revocation completed!');
    console.log(`   Processed: ${data.processed}`);
    console.log(`   Successful: ${data.successful}`);
    console.log(`   Failed: ${data.failed}\n`);

    if (data.details && data.failed > 0) {
      console.log('📋 Detailed Results:');
      data.details.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.email}: ${result.message}`);
      });
    }
  },

  stats: async () => {
    console.log('📊 Fetching subscription statistics...\n');

    const { data: stats, error } = await supabase
      .rpc('get_outlook_subscription_stats');

    if (error) {
      console.error('❌ Error fetching stats:', error.message);
      return;
    }

    console.log('📈 Outlook Subscription Statistics:');
    console.log(`   Total Subscriptions: ${stats.total_subscriptions}`);
    console.log(`   Active: ${stats.active_subscriptions}`);
    console.log(`   Cancelled: ${stats.cancelled_subscriptions}`);
    console.log(`   Suspended: ${stats.suspended_subscriptions}`);
    console.log(`   Trial: ${stats.trial_subscriptions}`);
    console.log(`   Payment Failed: ${stats.payment_failed_subscriptions}`);
    console.log(`   Usage This Month: ${Math.round(stats.total_usage_this_month)}`);
    console.log(`   Avg Usage Per Active User: ${Math.round(stats.average_usage_per_user)}`);
  },

  maintenance: async () => {
    console.log('🔧 Running subscription maintenance...\n');

    const { error } = await supabase
      .rpc('scheduled_subscription_maintenance');

    if (error) {
      console.error('❌ Error running maintenance:', error.message);
      return;
    }

    console.log('✅ Subscription maintenance completed successfully!');
    console.log('   - Usage limits reset for new billing cycles');
    console.log('   - Expired trials cancelled');
    console.log('   - Old events cleaned up');
  },

  help: () => {
    console.log(`
🚀 BlocIQ Outlook Subscription Management CLI

Commands:
  list [options]                List subscriptions
    --status=<status>            Filter by status (active, cancelled, suspended, etc.)
    --limit=<number>             Limit number of results

  revoke [options]              Revoke a single subscription
    --email=<email>              User email (required)
    --reason=<reason>            Reason for revocation

  bulk-revoke [options]         Revoke multiple subscriptions
    --file=<path>                Path to file with emails (one per line)
    --emails=<emails>            Comma-separated email addresses
    --reason=<reason>            Reason for revocation
    --force                      Skip confirmation prompt

  stats                         Show subscription statistics

  maintenance                   Run subscription maintenance tasks

  help                          Show this help message

Examples:
  node scripts/manage-outlook-subscriptions.js list --status=active --limit=10
  node scripts/manage-outlook-subscriptions.js revoke --email=user@example.com --reason="User requested"
  node scripts/manage-outlook-subscriptions.js bulk-revoke --file=cancel-list.txt --reason="Service discontinued" --force
  node scripts/manage-outlook-subscriptions.js stats
`);
  }
};

// Parse command line arguments
function parseArgs(args) {
  const command = args[2];
  const options = {};

  args.slice(3).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    }
  });

  return { command, options };
}

// Main execution
async function main() {
  const { command, options } = parseArgs(process.argv);

  if (!command || command === 'help' || !commands[command]) {
    commands.help();
    return;
  }

  try {
    await commands[command](options);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { commands };