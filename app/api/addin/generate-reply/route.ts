// app/api/addin/generate-reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { originalSubject, originalSender, originalBody, context, senderEmail, subject, bodyPreview, conversationId } = body;

        console.log('🔄 BlocIQ Add-in reply generation (upgraded):', {
            subject: originalSubject || subject,
            sender: originalSender || senderEmail,
            bodyLength: (originalBody || bodyPreview)?.length || 0,
            context
        });

        // Support both old and new API formats
        const emailSender = senderEmail || originalSender;
        const emailSubject = subject || originalSubject;
        const emailBody = bodyPreview || originalBody;

        // Validate required fields
        if (!emailBody && !emailSubject) {
            return NextResponse.json({
                success: false,
                error: 'Missing email content'
            }, { status: 400 });
        }

        if (!emailSender) {
            return NextResponse.json({
                success: false,
                error: 'Missing sender email'
            }, { status: 400 });
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Use unified Ask BlocIQ system with email_reply system prompt
        const askResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ask-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('Authorization') || '',
                'Cookie': request.headers.get('Cookie') || ''
            },
            body: JSON.stringify({
                message: `Generate a professional email reply to this message:

Subject: ${emailSubject}
From: ${emailSender}
Body: ${emailBody}

Please provide a context-aware, professional response following BlocIQ standards.`,
                emailContext: {
                    subject: emailSubject,
                    sender: emailSender,
                    body: emailBody,
                    conversationId: conversationId || ''
                },
                systemPrompt: 'email_reply',
                source: 'outlook_addin_reply'
            })
        });

        if (!askResponse.ok) {
            console.error('Ask BlocIQ failed, falling back to basic reply');
            return generateBasicReply(emailSender, emailSubject, emailBody);
        }

        const askResult = await askResponse.json();
        if (!askResult.success) {
            console.error('Ask BlocIQ error:', askResult.error);
            return generateBasicReply(emailSender, emailSubject, emailBody);
        }

        // Parse the structured response from Ask BlocIQ
        const response = askResult.response;
        let reply = response;
        let usedFacts = [];
        let buildingContext = null;

        // Extract metadata if available
        if (askResult.metadata) {
            usedFacts = askResult.metadata.usedFacts || [];
            buildingContext = askResult.metadata.buildingContext || null;
        }

        // Return in the format expected by Outlook add-in
        return NextResponse.json({
            success: true,
            reply: reply,
            subjectSuggestion: `Re: ${emailSubject}`,
            usedFacts: usedFacts,
            sources: [],
            timestamp: new Date().toISOString(),
            buildingContext: buildingContext,
            tone: 'professional',
            template: 'unified_system'
        });

    } catch (error) {
        console.error('❌ Error generating BlocIQ reply:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate reply'
        }, { status: 500 });
    }
}

// Fallback function for basic replies when new system fails
async function generateBasicReply(sender: string, subject: string, body: string) {
    // Extract first name from sender for proper salutation
    const senderName = extractFirstNameFromSender(sender);
    const salutation = senderName ? `Dear ${senderName}` : 'Dear Resident';

    // Follow the new 7-step structure even in fallback
    const basicReply = `Subject: Re: ${subject}

${salutation},

Thank you for reaching out to us regarding your enquiry.

We have received your message and will review it carefully. Our team will respond within 2 working days with a detailed response.

If this matter is urgent or concerns an emergency, please contact our emergency line immediately for immediate assistance.

Thank you for your patience.

Kind regards,
BlocIQ Property Management Team`;

    return NextResponse.json({
        success: true,
        reply: basicReply,
        subjectSuggestion: `Re: ${subject}`,
        usedFacts: [],
        sources: [],
        timestamp: new Date().toISOString(),
        buildingContext: null,
        tone: 'professional',
        template: 'structured_fallback'
    });
}

// Helper function to extract first name from sender email or display name
function extractFirstNameFromSender(sender: string): string | null {
    if (!sender) return null;

    // Remove email address if present
    let name = sender.replace(/<[^>]*>/g, '').replace(/[""]/g, '').trim();

    // If it's just an email address, extract the part before @
    if (name.includes('@') && !name.includes(' ')) {
        name = name.split('@')[0].replace(/[._]/g, ' ');
    }

    // Split into parts and return first part if it looks like a name
    const nameParts = name.split(/\s+/).filter(part => part.length > 0);

    if (nameParts.length > 0 && nameParts[0].length > 1 && /^[A-Z][a-z]+$/.test(nameParts[0])) {
        return nameParts[0];
    }

    return null;
}

// CORS headers for Outlook add-in
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

