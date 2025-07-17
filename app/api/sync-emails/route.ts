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

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID) {
    return NextResponse.json(
      {
        error:
          "Missing Azure credentials: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, or AZURE_TENANT_ID",
      },
      { status: 500 }
    );
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

    // If no messages are returned, insert static dummy messages
    if (emails.length === 0) {
      const dummyEmails = [
        {
          from_email: "tenant@example.com",
          subject: "Maintenance Request - Unit 101",
          body_preview: "Hi, there's a leak in the bathroom. Can someone please check it out?",
          received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          handled: false,
          unread: true,
          flag_status: 'notFlagged',
          categories: ['Maintenance'],
        },
        {
          from_email: "property@example.com",
          subject: "Lease Renewal Notice",
          body_preview: "Your lease is due for renewal. Please contact us to discuss terms.",
          received_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          handled: false,
          unread: false,
          flag_status: 'flagged',
          categories: ['Urgent', 'Leaseholder'],
        },
        {
          from_email: "maintenance@example.com",
          subject: "Scheduled Building Inspection",
          body_preview: "We will be conducting our monthly building inspection tomorrow.",
          received_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          handled: false,
          unread: true,
          flag_status: 'notFlagged',
          categories: ['Compliance'],
        }
      ];

      // Insert dummy emails into Supabase with handled = false
      const { data: insertedEmails, error: insertError } = await supabase
        .from('incoming_emails')
        .upsert(dummyEmails, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (insertError) {
        console.error('Error inserting dummy emails:', insertError);
        return NextResponse.json(
          { error: "Failed to insert dummy emails", details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "No emails found in inbox, inserted dummy data",
        emailsInserted: insertedEmails?.length || 0,
        dummyEmails: true
      });
    }

    // Process real emails and insert into Supabase with enhanced fields
    const processedEmails = emails.map((email: any) => ({
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
      dummyEmails: false
    });

  } catch (error: any) {
    console.error('Sync emails error:', error);
    return NextResponse.json(
      {
        error: "Failed to sync emails",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
