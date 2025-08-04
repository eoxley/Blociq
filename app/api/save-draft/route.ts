// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for draft data
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
    const { 
      subject, 
      body: emailBody, 
      to_emails, 
      cc_emails, 
      bcc_emails, 
      reply_to_email_id,
      draft_id 
    } = body;

    if (!subject || !emailBody) {
      console.error('❌ Subject and body are required');
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    console.log('💾 Saving draft for user:', user.id);

    const draftData = {
      user_id: user.id,
      subject: subject.trim(),
      body: emailBody,
      to_emails: to_emails || [],
      cc_emails: cc_emails || [],
      bcc_emails: bcc_emails || [],
      reply_to_email_id: reply_to_email_id || null,
      status: 'draft',
      updated_at: new Date().toISOString()
    };

    let result;

    if (draft_id) {
      // Update existing draft
      const { data: draft, error: updateError } = await supabase
        .from('email_drafts')
        .update(draftData)
        .eq('id', draft_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update draft:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      result = draft;
    } else {
      // Create new draft
      const { data: draft, error: createError } = await supabase
        .from('email_drafts')
        .insert({
          ...draftData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create draft:', createError.message);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      result = draft;
    }

    console.log('✅ Draft saved successfully:', result.id);
    return NextResponse.json({ 
      success: true, 
      draft: {
        id: result.id,
        subject: result.subject,
        status: result.status,
        created_at: result.created_at,
        updated_at: result.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error in save-draft route:', error);
    return NextResponse.json({ 
      error: 'Failed to save draft',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 