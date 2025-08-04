// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for emailId
// - Supabase query with proper .eq() filter
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Validate request body
    const body = await req.json();
    const { emailId } = body;

    if (!emailId) {
      console.error('❌ No email ID provided in request');
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    console.log('📧 Marking email as read:', emailId);

    const { error } = await supabase
      .from('incoming_emails')
      .update({ 
        unread: false,
        is_read: true 
      })
      .eq('id', emailId);

    if (error) {
      console.error('❌ Failed to mark as read:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email marked as read successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error in mark-read route:', error);
    return NextResponse.json({ 
      error: 'Failed to mark email as read',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}
