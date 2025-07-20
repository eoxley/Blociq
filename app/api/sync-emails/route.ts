import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'
import { Client } from '@microsoft/microsoft-graph-client'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  // ✅ Lazy load MSAL to avoid triggering it during build
  const { ConfidentialClientApplication } = await import("@azure/msal-node");

  const {
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET,
    AZURE_TENANT_ID,
  } = process.env;

  // Get the first building ID to associate emails with
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id')
    .limit(1);

  const buildingId = buildings?.[0]?.id || 1; // Default to building ID 1 if none exists

  // Check if Azure credentials are configured
  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID) {
    console.log('⚠️ Azure credentials not configured, using dummy data');
    
    // Insert dummy emails if no real emails exist
    const { data: existingEmails } = await supabase
      .from('incoming_emails')
      .select('id')
      .limit(1);

    if (!existingEmails || existingEmails.length === 0) {
      // Remove dummy data - return empty state instead
      return NextResponse.json({
        message: "Azure credentials not configured, no emails available",
        emailsInserted: 0,
        dummyEmails: false,
        configStatus: "missing_credentials"
      });
    }

    return NextResponse.json({
      message: "Azure credentials not configured, using existing data",
      emailsSynced: 0,
      dummyEmails: false,
      configStatus: "missing_credentials"
    });
  }

  const clientApp = new ConfidentialClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      clientSecret: AZURE_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    },
  });

  try {
    // Get access token
    const result = await clientApp.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    if (!result?.accessToken) {
      console.error('❌ No access token received from Microsoft Graph');
      return NextResponse.json(
        { error: "No token result received from Microsoft Graph" },
        { status: 500 }
      );
    }

    // Create Graph client
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, result.accessToken);
      },
    });

    // Query emails using graphClient.messages.list() with enhanced fields
    const messages = await graphClient
      .api('/users/testbloc@blociq.co.uk/messages')
      .top(50)
      .orderby('receivedDateTime DESC')
      .select('id,subject,body,bodyPreview,from,receivedDateTime,isRead,flag,categories,conversationId')
      .get();

    const emails = messages.value || [];

    // If no messages are returned, return empty state instead of dummy data
    if (emails.length === 0) {
      console.log('📧 No emails found in Microsoft Graph');
      
      return NextResponse.json({
        message: "No emails found in inbox",
        emailsInserted: 0,
        dummyEmails: false,
        configStatus: "no_emails_found"
      });
    }

    // Process real emails and insert into Supabase with enhanced fields
    const processedEmails = await Promise.all(emails.map(async (email: any) => {
      const baseEmail = {
        building_id: buildingId,
        from_email: email.from?.emailAddress?.address || email.from?.emailAddress?.name || 'unknown@example.com',
        subject: email.subject || 'No Subject',
        body_preview: email.bodyPreview || email.body?.content || 'No preview available',
        received_at: email.receivedDateTime || new Date().toISOString(),
        message_id: email.id,
        unread: !email.isRead,
        thread_id: email.conversationId,
        handled: false, // Ensure all emails are saved with handled = false
        // Enhanced fields from Microsoft Graph
        flag_status: email.flag?.flagStatus || 'notFlagged',
        categories: email.categories || [],
        // Additional fields for better email management
        pinned: false, // Can be set manually
        tag: null, // Can be set manually for custom tagging
      };

      // AI Classification for new emails (only if we have subject or body content)
      if ((email.subject || email.bodyPreview) && !email.categories?.length) {
        try {
          const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai-classify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: email.subject || '',
              body: email.bodyPreview || email.body?.content || ''
            })
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            
            if (aiResult.success && aiResult.tags?.length > 0) {
              // Merge AI tags with existing categories, avoiding duplicates
              const existingCategories = email.categories || [];
              const aiTags = aiResult.tags || [];
              const mergedCategories = [...new Set([...existingCategories, ...aiTags])];
              
              baseEmail.categories = mergedCategories;
              
              // Auto-flag if AI has high confidence and suggests flagging
              if (aiResult.confidence >= 80 && aiResult.flag_status === 'flagged') {
                baseEmail.flag_status = 'flagged';
              }
              
              console.log(`AI classified email "${email.subject}":`, {
                tags: aiResult.tags,
                flag_status: aiResult.flag_status,
                confidence: aiResult.confidence,
                reasoning: aiResult.reasoning
              });
            }
          }
        } catch (aiError) {
          console.error('AI classification failed for email:', email.subject, aiError);
          // Continue with original email data if AI fails
        }
      }

      return baseEmail;
    }));

    // Upsert emails into Supabase
    const { data: insertedEmails, error: insertError } = await supabase
      .from('incoming_emails')
      .upsert(processedEmails, { 
        onConflict: 'message_id',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Error inserting emails:', insertError);
      return NextResponse.json(
        { error: "Failed to insert emails", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Successfully synced emails from Microsoft Graph",
      emailsSynced: insertedEmails?.length || 0,
      totalEmails: emails.length,
      dummyEmails: false,
      configStatus: "success"
    });

  } catch (error: any) {
    console.error('Sync emails error:', error);
    return NextResponse.json(
      {
        error: "Failed to sync emails",
        details: error.message,
        configStatus: "error"
      },
      { status: 500 }
    );
  }
}
