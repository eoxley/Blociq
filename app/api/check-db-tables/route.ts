// ✅ DATABASE HEALTH CHECK API
// - Checks if required tables exist
// - Used for debugging database issues

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tablesToCheck = [
      'email_attachments',
      'property_events', 
      'manual_events',
      'buildings',
      'incoming_emails'
    ];

    const results: Record<string, boolean> = {};

    for (const tableName of tablesToCheck) {
      try {
        // Try to query the table with a simple select
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        results[tableName] = !error;
      } catch (err) {
        results[tableName] = false;
        console.error(`Table ${tableName} check failed:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      tables: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in check-db-tables API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 