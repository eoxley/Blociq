import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
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

// Admin API for managing Outlook subscriptions
export async function GET(req: NextRequest) {
  try {
    // Check admin authorization (implement your auth logic)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userEmail = searchParams.get('email');
    const status = searchParams.get('status'); // active, cancelled, suspended
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (action) {
      case 'list':
        return await listSubscriptions(page, limit, status);
      case 'get':
        if (!userEmail) {
          return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }
        return await getSubscription(userEmail);
      case 'usage':
        return await getUsageStats();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin subscription API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, email, reason, effective_date } = body;

    switch (action) {
      case 'revoke':
        return await revokeSubscription(email, reason, effective_date);
      case 'suspend':
        return await suspendSubscription(email, reason);
      case 'reactivate':
        return await reactivateSubscription(email);
      case 'bulk_revoke':
        return await bulkRevokeSubscriptions(body.emails, reason);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin subscription action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function listSubscriptions(page: number, limit: number, status?: string) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('outlook_subscriptions')
    .select(`
      *,
      users!inner(email, first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: subscriptions, error } = await query;

  if (error) throw error;

  // Get total count for pagination
  const { count } = await supabaseAdmin
    .from('outlook_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq(status ? 'status' : 'id', status || 'not_null');

  return NextResponse.json({
    subscriptions,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}

async function getSubscription(email: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: subscription, error } = await supabaseAdmin
    .from('outlook_subscriptions')
    .select(`
      *,
      users!inner(email, first_name, last_name)
    `)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  // Get usage history
  const { data: usage } = await supabaseAdmin
    .from('email_interactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('source', 'outlook_reply_generator')
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({
    subscription,
    usage_history: usage || [],
    usage_count: usage?.length || 0
  });
}

async function getUsageStats() {
  const { data: stats } = await supabaseAdmin
    .rpc('get_outlook_subscription_stats');

  return NextResponse.json({ stats: stats || {} });
}

async function revokeSubscription(email: string, reason: string, effectiveDate?: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const effective = effectiveDate ? new Date(effectiveDate) : new Date();

  // Update subscription status
  const { error: updateError } = await supabaseAdmin
    .from('outlook_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: effective.toISOString(),
      cancellation_reason: reason,
      usage_remaining: 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (updateError) throw updateError;

  // Log the revocation
  await supabaseAdmin
    .from('subscription_events')
    .insert({
      user_id: user.id,
      event_type: 'revoked',
      event_data: {
        reason,
        effective_date: effective.toISOString(),
        admin_action: true
      }
    });

  // Send notification email (implement your email service)
  await notifyUserOfCancellation(email, reason, effective);

  return NextResponse.json({
    success: true,
    message: 'Subscription revoked successfully',
    effective_date: effective.toISOString()
  });
}

async function suspendSubscription(email: string, reason: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('outlook_subscriptions')
    .update({
      status: 'suspended',
      suspension_reason: reason,
      usage_remaining: 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (error) throw error;

  await supabaseAdmin
    .from('subscription_events')
    .insert({
      user_id: user.id,
      event_type: 'suspended',
      event_data: { reason, admin_action: true }
    });

  return NextResponse.json({ success: true, message: 'Subscription suspended' });
}

async function reactivateSubscription(email: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('outlook_subscriptions')
    .update({
      status: 'active',
      suspension_reason: null,
      usage_remaining: 100, // Reset to default
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (error) throw error;

  await supabaseAdmin
    .from('subscription_events')
    .insert({
      user_id: user.id,
      event_type: 'reactivated',
      event_data: { admin_action: true }
    });

  return NextResponse.json({ success: true, message: 'Subscription reactivated' });
}

async function bulkRevokeSubscriptions(emails: string[], reason: string) {
  const results = [];

  for (const email of emails) {
    try {
      await revokeSubscription(email, reason);
      results.push({ email, success: true });
    } catch (error) {
      results.push({
        email,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${emails.length} subscriptions`,
    results
  });
}

async function notifyUserOfCancellation(email: string, reason: string, effectiveDate: Date) {
  // Implement your email notification service here
  console.log(`📧 Notifying ${email} of subscription cancellation: ${reason}, effective: ${effectiveDate}`);

  // Example with your email service:
  // await sendEmail({
  //   to: email,
  //   subject: 'BlocIQ Outlook Add-in Subscription Cancelled',
  //   template: 'outlook-subscription-cancelled',
  //   data: { reason, effectiveDate }
  // });
}