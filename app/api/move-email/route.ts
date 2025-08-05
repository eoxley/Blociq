// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for emailId and folderId
// - Supabase query with proper .eq() filter
// - Microsoft Graph API integration for Outlook folder moves
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
    const { emailId, folderId } = body;

    if (!emailId) {
      console.error('❌ No email ID provided in request');
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    console.log('📁 Moving email:', emailId, 'to folder:', folderId);

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

    // If folderId is provided, verify it exists and belongs to the user
    if (folderId) {
      const { data: folder, error: folderError } = await supabase
        .from('email_folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .single();

      if (folderError || !folder) {
        console.error('❌ Folder not found or access denied');
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    // Update the email's folder_id
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({ 
        folder_id: folderId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailId);

    if (updateError) {
      console.error('❌ Failed to move email:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Try to move in Outlook if we have the message ID and folder mapping
    if (email.message_id && folderId) {
      try {
        // Get the latest Outlook token
        const { data: tokens } = await supabase
          .from('outlook_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokens?.access_token) {
          // Get the folder details to see if it maps to an Outlook folder
          const { data: folder } = await supabase
            .from('email_folders')
            .select('*')
            .eq('id', folderId)
            .single();

          if (folder) {
            // First, get all mail folders from Outlook
            const foldersResponse = await fetch(
              'https://graph.microsoft.com/v1.0/me/mailFolders',
              {
                headers: {
                  'Authorization': `Bearer ${tokens.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (foldersResponse.ok) {
              const foldersData = await foldersResponse.json();
              const outlookFolder = foldersData.value?.find((f: any) => 
                f.displayName?.toLowerCase() === folder.name.toLowerCase()
              );

              if (outlookFolder) {
                // Move email to existing Outlook folder
                const moveResponse = await fetch(
                  `https://graph.microsoft.com/v1.0/me/messages/${email.message_id}/move`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${tokens.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      destinationId: outlookFolder.id
                    }),
                  }
                );

                if (moveResponse.ok) {
                  console.log('✅ Email moved in Outlook successfully');
                } else {
                  const errorData = await moveResponse.text();
                  console.warn('⚠️ Failed to move in Outlook:', moveResponse.status, errorData);
                }
              } else {
                // Create the folder in Outlook if it doesn't exist
                const createFolderResponse = await fetch(
                  'https://graph.microsoft.com/v1.0/me/mailFolders',
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${tokens.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      displayName: folder.name,
                      parentFolderId: 'msgfolderroot'
                    }),
                  }
                );

                if (createFolderResponse.ok) {
                  const newFolder = await createFolderResponse.json();
                  
                  // Now move the email to the newly created folder
                  const moveResponse = await fetch(
                    `https://graph.microsoft.com/v1.0/me/messages/${email.message_id}/move`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        destinationId: newFolder.id
                      }),
                    }
                  );

                  if (moveResponse.ok) {
                    console.log('✅ Email moved to newly created Outlook folder');
                  } else {
                    const errorData = await moveResponse.text();
                    console.warn('⚠️ Failed to move to new Outlook folder:', moveResponse.status, errorData);
                  }
                } else {
                  const errorData = await createFolderResponse.text();
                  console.warn('⚠️ Failed to create Outlook folder:', createFolderResponse.status, errorData);
                }
              }
            } else {
              console.warn('⚠️ Failed to fetch Outlook folders');
            }
          }
        } else {
          console.warn('⚠️ No valid Outlook access token found');
        }
      } catch (outlookError) {
        console.warn('⚠️ Outlook move failed:', outlookError);
        // Don't fail the request if Outlook move fails
      }
    }

    console.log('✅ Email moved successfully');
    return NextResponse.json({ 
      success: true,
      folder_id: folderId
    });

  } catch (error) {
    console.error('❌ Error in move-email route:', error);
    return NextResponse.json({ 
      error: 'Failed to move email',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 