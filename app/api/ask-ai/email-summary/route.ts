import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view email summary'
      }, { status: 401 });
    }

    const user = session.user;

    // Get the user's Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json({ 
        summary: "Connect Outlook to see email summary",
        connected: false,
        message: "Outlook not connected. Please connect your Outlook account to view email summaries."
      });
    }

    // Check if token is expired and refresh if necessary
    let accessToken = tokens.access_token;
    const now = new Date();
    const tokenExpiresAt = new Date(tokens.expires_at);
    const isExpired = tokenExpiresAt <= now;

    if (isExpired) {
      try {
        console.log('Outlook token expired, attempting to refresh...');
        const tenantId = process.env.AZURE_TENANT_ID || process.env.OUTLOOK_TENANT_ID || 'common';
        const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: tokens.refresh_token,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI || process.env.OUTLOOK_REDIRECT_URI!,
          }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token');
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        // Update tokens in database
        await supabase
          .from('outlook_tokens')
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token || tokens.refresh_token,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          })
          .eq('user_id', user.id);

        console.log('Token refreshed successfully');
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return NextResponse.json({ 
          summary: "Outlook session expired. Please reconnect your account.",
          connected: false,
          message: "Your Outlook session has expired. Please reconnect your account."
        });
      }
    }

    // Fetch recent emails from Microsoft Graph API
    const graphBaseUrl = process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com/v1.0';
    const response = await fetch(
      `${graphBaseUrl}/me/messages?$top=50&$orderby=receivedDateTime desc&$select=subject,receivedDateTime,isRead,flag,bodyPreview,from,toRecipients`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch emails:', response.status, response.statusText);
      return NextResponse.json({ 
        summary: "Unable to fetch emails. Please try again later.",
        connected: true,
        error: `Failed to fetch emails: ${response.status}`
      });
    }

    const emailData = await response.json();
    const emails = emailData.value || [];

    // Analyze emails
    const analysis = analyzeEmails(emails);

    // Generate AI summary
    const summary = await generateEmailSummary(analysis);

    return NextResponse.json({
      summary,
      connected: true,
      analysis: {
        totalEmails: emails.length,
        unreadCount: analysis.unreadCount,
        flaggedCount: analysis.flaggedCount,
        leakMentions: analysis.leakMentions,
        invoiceMentions: analysis.invoiceMentions,
        contractorMentions: analysis.contractorMentions,
        approvalMentions: analysis.approvalMentions,
        complaintMentions: analysis.complaintMentions,
        topBuildings: analysis.topBuildings
      }
    });

  } catch (error) {
    console.error('Email summary error:', error);
    return NextResponse.json({ 
      summary: "Unable to generate email summary. Please try again later.",
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function analyzeEmails(emails: any[]) {
  const analysis = {
    unreadCount: 0,
    flaggedCount: 0,
    leakMentions: 0,
    invoiceMentions: 0,
    contractorMentions: 0,
    approvalMentions: 0,
    complaintMentions: 0,
    topBuildings: [] as { name: string; count: number }[],
    buildingMentions: {} as Record<string, number>
  };

  // Common building names to look for
  const buildingKeywords = [
    'ashwood', 'house', 'court', 'manor', 'place', 'square', 'gardens', 'park', 'view', 'heights',
    'tower', 'building', 'apartment', 'flat', 'block', 'estate', 'residence', 'chambers'
  ];

  emails.forEach(email => {
    const subject = (email.subject || '').toLowerCase();
    const bodyPreview = (email.bodyPreview || '').toLowerCase();
    const content = `${subject} ${bodyPreview}`;

    // Count unread emails
    if (!email.isRead) {
      analysis.unreadCount++;
    }

    // Count flagged emails
    if (email.flag && email.flag.flagStatus !== 'notFlagged') {
      analysis.flaggedCount++;
    }

    // Count mentions of specific topics
    if (content.includes('leak') || content.includes('water') || content.includes('damp')) {
      analysis.leakMentions++;
    }
    if (content.includes('invoice') || content.includes('bill') || content.includes('payment')) {
      analysis.invoiceMentions++;
    }
    if (content.includes('contractor') || content.includes('maintenance') || content.includes('repair')) {
      analysis.contractorMentions++;
    }
    if (content.includes('approval') || content.includes('approve') || content.includes('authorise')) {
      analysis.approvalMentions++;
    }
    if (content.includes('complaint') || content.includes('issue') || content.includes('problem')) {
      analysis.complaintMentions++;
    }

    // Extract building names
    buildingKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        // Try to extract the full building name
        const regex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          matches.forEach(match => {
            const buildingName = match.trim();
            if (buildingName.length > 3) { // Avoid very short matches
              analysis.buildingMentions[buildingName] = (analysis.buildingMentions[buildingName] || 0) + 1;
            }
          });
        }
      }
    });
  });

  // Get top buildings
  analysis.topBuildings = Object.entries(analysis.buildingMentions)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return analysis;
}

async function generateEmailSummary(analysis: any): Promise<string> {
  try {
    const prompt = `Summarise the user's recent unread emails for a property management dashboard.

Email Analysis:
- Total emails: ${analysis.totalEmails}
- Unread emails: ${analysis.unreadCount}
- Flagged emails: ${analysis.flaggedCount}
- Leak mentions: ${analysis.leakMentions}
- Invoice mentions: ${analysis.invoiceMentions}
- Contractor mentions: ${analysis.contractorMentions}
- Approval mentions: ${analysis.approvalMentions}
- Complaint mentions: ${analysis.complaintMentions}
- Top buildings mentioned: ${analysis.topBuildings.map(b => `${b.name} (${b.count})`).join(', ')}

Create a helpful, concise summary that highlights:
1. How many unread emails there are
2. Any urgent issues (leaks, complaints, flagged emails)
3. Financial matters (invoices, approvals)
4. Maintenance/contractor follow-ups
5. Most active buildings

Keep it natural, actionable, and under 150 words. Use a friendly, professional tone.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful property management assistant. Generate concise, actionable email summaries for property managers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API failed: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    return openaiResult.choices[0]?.message?.content || 'Unable to generate summary at this time.';

  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    
    // Fallback summary
    const parts = [];
    
    if (analysis.unreadCount > 0) {
      parts.push(`You have ${analysis.unreadCount} unread email${analysis.unreadCount !== 1 ? 's' : ''}`);
    }
    
    if (analysis.flaggedCount > 0) {
      parts.push(`${analysis.flaggedCount} flagged for attention`);
    }
    
    if (analysis.leakMentions > 0) {
      parts.push(`${analysis.leakMentions} mention${analysis.leakMentions !== 1 ? 's' : ''} of leaks or water issues`);
    }
    
    if (analysis.invoiceMentions > 0) {
      parts.push(`${analysis.invoiceMentions} invoice or payment related`);
    }
    
    if (analysis.contractorMentions > 0) {
      parts.push(`${analysis.contractorMentions} contractor or maintenance related`);
    }
    
    if (analysis.complaintMentions > 0) {
      parts.push(`${analysis.complaintMentions} complaint${analysis.complaintMentions !== 1 ? 's' : ''}`);
    }
    
    if (analysis.topBuildings.length > 0) {
      parts.push(`Most active: ${analysis.topBuildings.slice(0, 2).map(b => b.name).join(', ')}`);
    }
    
    return parts.length > 0 ? parts.join('. ') + '.' : 'No recent email activity to report.';
  }
}
