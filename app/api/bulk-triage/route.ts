import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = "nodejs";

interface BulkTriageRequest {
  emails: Array<{
    id: string;
    subject: string | null;
    body: string | null;
    from: string | null;
    receivedAt: string | null;
    buildingId?: string | null;
  }>;
}

interface TriageResult {
  emailId: string;
  success: boolean;
  draftCreated: boolean;
  error?: string;
  replySubject?: string;
  replyBody?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails }: BulkTriageRequest = await req.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    console.log(`🔄 Starting bulk triage (AI reply generation) for ${emails.length} emails`);

    const results: TriageResult[] = [];

    // Process emails in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      // Process batch concurrently
      const batchPromises = batch.map(async (email) => {
        try {
          console.log(`🔄 Generating reply for email ${email.id} from ${email.from}`);

          // Call the AI generate reply endpoint for each email
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const host = req.headers.get('host') || 'localhost:3001';
          const generateReplyUrl = `${protocol}://${host}/api/addin/generate-reply`;

          const generateReplyResponse = await fetch(generateReplyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || '',
              'Cookie': req.headers.get('Cookie') || ''
            },
            body: JSON.stringify({
              originalSubject: email.subject,
              originalSender: email.from,
              originalBody: email.body,
              context: `Bulk triage processing for email ID: ${email.id}`,
              senderEmail: email.from,
              subject: email.subject,
              bodyPreview: email.body,
              conversationId: `bulk-triage-${email.id}`
            })
          });

          if (!generateReplyResponse.ok) {
            throw new Error(`Generate reply API failed with status ${generateReplyResponse.status}`);
          }

          const replyResult = await generateReplyResponse.json();

          if (!replyResult.success) {
            throw new Error(replyResult.error || 'Failed to generate reply');
          }

          // Create draft in user's Outlook drafts folder
          const draftResponse = await fetch(`${protocol}://${host}/api/outlook/v2/messages/draft`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || '',
              'Cookie': req.headers.get('Cookie') || ''
            },
            body: JSON.stringify({
              subject: replyResult.subjectSuggestion || `Re: ${email.subject}`,
              body: replyResult.reply,
              toRecipients: [{ emailAddress: { address: email.from, name: '' } }],
              saveToSentItems: false
            })
          });

          let draftCreated = false;
          if (draftResponse.ok) {
            const draftData = await draftResponse.json();
            draftCreated = draftData.success || false;
            console.log(`✅ Draft created for email ${email.id}: ${draftCreated}`);
          } else {
            console.warn(`⚠️ Failed to create draft for email ${email.id}: ${draftResponse.status}`);
          }

          return {
            emailId: email.id,
            success: true,
            draftCreated,
            replySubject: replyResult.subjectSuggestion,
            replyBody: replyResult.reply
          };

        } catch (error) {
          console.error(`❌ Error processing email ${email.id}:`, error);
          return {
            emailId: email.id,
            success: false,
            draftCreated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Log the bulk triage operation
    try {
      const successCount = results.filter(r => r.success).length;
      const draftsCreated = results.filter(r => r.draftCreated).length;

      await supabase
        .from('ai_logs')
        .insert({
          user_id: user.id,
          question: `Bulk triage (AI reply generation) for ${emails.length} emails`,
          response: `Generated ${successCount} replies successfully. Created ${draftsCreated} drafts in Outlook.`,
          timestamp: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
      // Don't fail the request if logging fails
    }

    const successCount = results.filter(r => r.success).length;
    const draftsCreated = results.filter(r => r.draftCreated).length;

    console.log(`🎉 Bulk triage completed: ${successCount}/${results.length} replies generated, ${draftsCreated} drafts created`);

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      successfulReplies: successCount,
      draftsCreated: draftsCreated,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk Triage error:', error);
    return NextResponse.json({
      error: 'Failed to process bulk triage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

 