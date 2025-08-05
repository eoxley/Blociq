// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for emailId
// - Supabase query with proper .eq() filter
// - Microsoft Graph API integration for Outlook deletion to deleted items
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const { emailId } = body;

    if (!emailId) {
      console.error('❌ No email ID provided in request');
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    console.log('🗑️ Deleting email:', emailId);

    // Get the email details first
    const { data: email, error: fetchError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (fetchError || !email) {
      console.error('❌ Failed to fetch email:', fetchError?.message);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Find or create "deleted items" folder for the user
    let deletedItemsFolder;
    const { data: existingFolder } = await supabase
      .from('email_folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', 'Deleted Items')
      .single();

    if (existingFolder) {
      deletedItemsFolder = existingFolder;
    } else {
              // Create deleted items folder if it doesn't exist
        const { data: newFolder, error: createError } = await supabase
          .from('email_folders')
          .insert({
            user_id: user.id,
            name: 'Deleted Items'
          })
          .select()
          .single();

      if (createError) {
        console.error('❌ Failed to create deleted items folder:', createError.message);
        return NextResponse.json({ error: 'Failed to create deleted items folder' }, { status: 500 });
      }
      deletedItemsFolder = newFolder;
    }

    // Move email to deleted items folder instead of deleting
    const { error: moveError } = await supabase
      .from('incoming_emails')
      .update({ 
        folder_id: deletedItemsFolder.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailId);

    if (moveError) {
      console.error('❌ Failed to move email to deleted items:', moveError.message);
      return NextResponse.json({ error: moveError.message }, { status: 500 });
    }

    // Try to move to Outlook deleted items folder
    if (email.message_id) {
      try {
        // Get the latest Outlook token
        const { data: tokens } = await supabase
          .from('outlook_tokens')
          .select('*')
          .eq('user_id', email.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokens?.access_token) {
          try {
            // First, try to move to deleted items folder
            const moveResponse = await fetch(
              `https://graph.microsoft.com/v1.0/me/messages/${email.message_id}/move`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${tokens.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  destinationId: 'deleteditems' // Standard Outlook deleted items folder
                }),
              }
            );

            if (moveResponse.ok) {
              console.log('✅ Email moved to Outlook deleted items successfully');
            } else {
              // If move fails, try direct deletion
              const deleteResponse = await fetch(
                `https://graph.microsoft.com/v1.0/me/messages/${email.message_id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (deleteResponse.ok) {
                console.log('✅ Email deleted from Outlook successfully');
              } else {
                const errorText = await deleteResponse.text();
                console.warn('⚠️ Failed to delete from Outlook:', deleteResponse.status, errorText);
                
                // Check if it's a permissions issue
                if (deleteResponse.status === 403) {
                  console.error('❌ Insufficient permissions for Mail.ReadWrite or Mail.ReadWrite.Shared');
                }
              }
            }
          } catch (graphError) {
            console.error('❌ Graph API error:', graphError);
          }
        } else {
          console.warn('⚠️ No valid Outlook access token found');
        }
      } catch (outlookError) {
        console.warn('⚠️ Outlook deletion failed:', outlookError);
        // Don't fail the request if Outlook deletion fails
      }
    }

    console.log('✅ Email moved to deleted items successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Email moved to deleted items'
    });

  } catch (error) {
    console.error('❌ Error in delete-email route:', error);
    return NextResponse.json({ 
      error: 'Failed to delete email',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 