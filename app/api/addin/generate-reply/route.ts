// app/api/addin/generate-reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { detectTone } from '@/lib/addin/tone';

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

        // Step 1: Enrich context using new system
        const enrichResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/outlook/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderEmail: emailSender,
                subject: emailSubject,
                bodyPreview: emailBody,
                conversationId: conversationId || ''
            })
        });

        if (!enrichResponse.ok) {
            console.error('Enrichment failed, falling back to basic reply');
            return generateBasicReply(emailSender, emailSubject, emailBody);
        }

        const enrichResult = await enrichResponse.json();
        if (!enrichResult.success) {
            console.error('Enrichment error:', enrichResult.error);
            return generateBasicReply(emailSender, emailSubject, emailBody);
        }

        // Step 2: Detect tone
        const toneResult = detectTone(emailBody);

        // Step 3: Generate draft using new system
        const draftResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/outlook/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                enrichment: enrichResult.data,
                tone: toneResult.label,
                rawEmailBody: emailBody
            })
        });

        if (!draftResponse.ok) {
            console.error('Draft generation failed, falling back to basic reply');
            return generateBasicReply(emailSender, emailSubject, emailBody);
        }

        const draftResult = await draftResponse.json();
        if (!draftResult.success) {
            console.error('Draft error:', draftResult.error);
            return generateBasicReply(emailSender, emailSubject, emailBody);
        }

        // Return in the format expected by Outlook add-in
        return NextResponse.json({
            success: true,
            reply: draftResult.data.bodyHtml,
            subjectSuggestion: `Re: ${emailSubject}`,
            usedFacts: draftResult.data.usedFacts || [],
            sources: [],
            timestamp: new Date().toISOString(),
            buildingContext: enrichResult.data.building ? {
                building: enrichResult.data.building.name,
                unit: enrichResult.data.unitLabel
            } : null,
            tone: toneResult.label,
            template: draftResult.data.template
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
    // Extract first name from sender for proper salutation and closing
    const senderName = extractFirstNameFromSender(sender);
    const salutation = senderName ? `Dear ${senderName}` : 'Dear Resident';

    const basicReply = `${salutation},

Thank you for your email regarding ${subject}.

We have received your enquiry and will respond within 2 working days.

If this is an emergency, please contact our emergency line immediately.

Kind regards,
BlocIQ`;

    return NextResponse.json({
        success: true,
        reply: basicReply,
        subjectSuggestion: `Re: ${subject}`,
        usedFacts: [],
        sources: [],
        timestamp: new Date().toISOString(),
        buildingContext: null,
        tone: 'neutral',
        template: 'basic_fallback'
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

