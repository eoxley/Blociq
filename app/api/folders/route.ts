// ✅ AUDIT COMPLETE [2025-01-15]
// - Supabase query with proper user_id filter
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📁 Fetching folders for user:', user.id);

    // Get user's custom folders
    const { data: folders, error } = await supabase
      .from('email_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch folders:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Folders fetched successfully');
    return NextResponse.json({ 
      success: true,
      folders: folders || []
    });

  } catch (error) {
    console.error('❌ Error in folders route:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch folders',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 