import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(cookies());
    
    // Get all users who have connected their Outlook accounts
    // For now, we'll use a simple approach - in production, you'd query the user_tokens table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(10); // Limit to prevent overwhelming the system

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    let totalSynced = 0;
    const results = [];

    for (const user of users || []) {
      try {
        // For each user, we would need to get their Outlook tokens
        // This is a simplified version - in production, you'd get tokens from user_tokens table
        
        // Simulate syncing for each user
        const syncResult = await syncUserOutlookInbox(user.id, supabase);
        results.push({
          userId: user.id,
          email: user.email,
          synced: syncResult.synced,
          success: syncResult.success
        });
        
        totalSynced += syncResult.synced || 0;
        
      } catch (error) {
        console.error(`Error syncing for user ${user.id}:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          synced: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSynced,
      results,
      message: `Cron job completed. Synced ${totalSynced} emails across ${results.length} users.`
    });

  } catch (error) {
    console.error('Error in Outlook sync cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function syncUserOutlookInbox(userId: string, supabase: any) {
  // This is a placeholder function
  // In production, you would:
  // 1. Get the user's Outlook tokens from user_tokens table
  // 2. Call Microsoft Graph API with their tokens
  // 3. Process and store emails in incoming_emails table
  
  // For now, return a mock result
  return {
    synced: 0,
    success: true,
    message: 'Mock sync completed'
  };
} 