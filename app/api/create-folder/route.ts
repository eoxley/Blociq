// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for folder name
// - Supabase query with proper user_id filter
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.error('❌ Invalid folder name provided');
      return NextResponse.json({ error: 'Valid folder name is required' }, { status: 400 });
    }

    const folderName = name.trim();

    console.log('📁 Creating folder:', folderName, 'for user:', user.id);

    // Check if folder already exists for this user
    const { data: existingFolder } = await supabase
      .from('email_folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', folderName)
      .single();

    if (existingFolder) {
      console.error('❌ Folder already exists');
      return NextResponse.json({ error: 'Folder with this name already exists' }, { status: 409 });
    }

    // Create the folder
    const { data: folder, error: createError } = await supabase
      .from('email_folders')
      .insert({
        name: folderName,
        user_id: user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create folder:', createError.message);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log('✅ Folder created successfully:', folder.id);
    return NextResponse.json({ 
      success: true, 
      folder: {
        id: folder.id,
        name: folder.name,
        created_at: folder.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error in create-folder route:', error);
    return NextResponse.json({ 
      error: 'Failed to create folder',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 