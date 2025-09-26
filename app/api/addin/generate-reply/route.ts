// app/api/addin/generate-reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withOutlookSubscription } from '@/lib/outlook-subscription-middleware';

// 📋 LEGAL DOCUMENT & STAGE RECOGNITION
function analyzeDocumentStage(emailContent: string, subject: string, body: string) {
    const analysis = {
        documentType: null,
        stage: null,
        hasReceived: false,
        actionRequired: null,
        timeline: null,
        legalImplications: []
    };

    // Section 20 Analysis
    if (/section\s*20|s20|notice of intention|noi|notice of estimate/i.test(emailContent)) {
        analysis.documentType = 'section_20';

        if (/received|got|sent|issued/i.test(emailContent)) {
            analysis.hasReceived = true;

            if (/notice of intention|noi/i.test(emailContent)) {
                analysis.stage = 'notice_of_intention_received';
                analysis.actionRequired = 'respond_to_consultation';
                analysis.timeline = '30 days to respond';
                analysis.legalImplications.push('Right to make observations on proposed works');
                analysis.legalImplications.push('Right to nominate contractors');
            } else if (/notice of estimate|estimates/i.test(emailContent)) {
                analysis.stage = 'estimates_received';
                analysis.actionRequired = 'review_estimates';
                analysis.timeline = '30 days to respond';
                analysis.legalImplications.push('Right to comment on contractor selection');
            }
        }
    }

    // Right to Manage (RTM)
    if (/right to manage|rtm|rtm company|take over management/i.test(emailContent)) {
        analysis.documentType = 'rtm';
        if (/received|served|notice/i.test(emailContent)) {
            analysis.hasReceived = true;
            analysis.stage = 'rtm_notice_served';
            analysis.actionRequired = 'respond_to_rtm_claim';
            analysis.timeline = 'Strict statutory timeframes apply';
            analysis.legalImplications.push('Right to challenge RTM claim');
            analysis.legalImplications.push('Transfer of management responsibilities');
        }
    }

    // Service Charge Demands
    if (/service charge|demand|bill|invoice/i.test(emailContent)) {
        analysis.documentType = 'service_charge';
        if (/received|bill|demand/i.test(emailContent)) {
            analysis.hasReceived = true;
            analysis.stage = 'demand_received';
            analysis.actionRequired = 'review_charges';
            analysis.timeline = 'Payment due as specified in demand';
            analysis.legalImplications.push('Right to challenge reasonableness');
            analysis.legalImplications.push('Right to request supporting documentation');
        }
    }

    // Lease Extension/Enfranchisement
    if (/lease extension|enfranchise|freehold purchase|section 42|section 13/i.test(emailContent)) {
        analysis.documentType = 'lease_extension';
        if (/served|notice/i.test(emailContent)) {
            analysis.hasReceived = true;
            analysis.stage = 'formal_notice_served';
            analysis.actionRequired = 'respond_to_notice';
            analysis.timeline = 'Strict statutory deadlines apply';
            analysis.legalImplications.push('Valuation and premium calculation');
            analysis.legalImplications.push('Right to tribunal if disputed');
        }
    }

    // Building Safety/Fire Safety
    if (/building safety|fire safety|evacuation|alarm test|fire risk assessment|building safety act/i.test(emailContent)) {
        analysis.documentType = 'building_safety';
        analysis.legalImplications.push('Building Safety Act 2022 obligations');
        analysis.legalImplications.push('Fire Safety (England) Regulations compliance');
    }

    return analysis;
}

// 🎯 PROPERTY MANAGEMENT CONTEXT DETECTION
function analyzePropertyContext(emailContent: string) {
    const context = {
        urgency: 'routine',
        category: 'general',
        maintenanceType: null,
        legalArea: null,
        respondentType: 'leaseholder'
    };

    // Urgency Detection
    if (/urgent|emergency|immediate|asap|water|leak|gas|electrical|safety/i.test(emailContent)) {
        context.urgency = 'urgent';
    } else if (/soon|quickly|important|concern/i.test(emailContent)) {
        context.urgency = 'priority';
    }

    // Category Detection
    if (/repair|maintenance|broken|fault|damage/i.test(emailContent)) {
        context.category = 'maintenance';

        if (/water|leak|plumbing|pipe/i.test(emailContent)) {
            context.maintenanceType = 'plumbing';
        } else if (/electrical|power|light|socket/i.test(emailContent)) {
            context.maintenanceType = 'electrical';
        } else if (/heating|boiler|radiator|hot water/i.test(emailContent)) {
            context.maintenanceType = 'heating';
        } else if (/window|door|lock|glass/i.test(emailContent)) {
            context.maintenanceType = 'structural';
        }
    } else if (/service charge|bill|cost|payment|money/i.test(emailContent)) {
        context.category = 'financial';
    } else if (/noise|neighbour|complaint|antisocial/i.test(emailContent)) {
        context.category = 'neighbour_dispute';
    } else if (/lease|tenancy|sublet|pets|alteration/i.test(emailContent)) {
        context.category = 'lease_query';
    }

    // Legal Area Detection
    if (/section 20|major works|consultation/i.test(emailContent)) {
        context.legalArea = 'section_20_lta1985';
    } else if (/service charge|reasonableness|tribunal/i.test(emailContent)) {
        context.legalArea = 'service_charges_lta1985';
    } else if (/right to manage|rtm/i.test(emailContent)) {
        context.legalArea = 'rtm_clra2002';
    } else if (/lease extension|enfranchise/i.test(emailContent)) {
        context.legalArea = 'enfranchisement';
    } else if (/building safety|fire safety/i.test(emailContent)) {
        context.legalArea = 'building_safety_act';
    }

    return context;
}

// 📝 ENHANCED SYSTEM PROMPT BUILDER
function buildEnhancedPrompt(documentStage: any, propertyContext: any) {
    let prompt = `You are a qualified UK property management professional generating a professional email reply.

📌 ENHANCED REPLY GUIDELINES:
- Read the user's message carefully and identify whether an action has already happened (e.g. "I received a notice" = consultation has started)
- Avoid defaulting to generic explanations unless clearly being requested
- Use reasoning based on UK leasehold law and best practice (TPI, RICS, BSA, LTA 1985)
- Include realistic next steps (timelines, who to contact, what to expect)
- Don't assume internal data like notice dates, contractor names, or building roles unless mentioned
- If the user references a legal document or statutory notice, acknowledge what stage that implies
- Use correct legal terminology (Notice of Intention, demised premises, major works, RTM, qualifying works)
- Remain neutral and professional — never guess or speculate if unclear

🧾 FORMAT REQUIREMENTS:
- Clear and direct, written in British English
- Suitable for professional email reply
- Short paragraphs or numbered steps where helpful
- Sign off with: "Kind regards, BlocIQ Property Management Assistant"

`;

    // Add document-specific guidance
    if (documentStage.documentType) {
        prompt += `\n📋 DOCUMENT CONTEXT DETECTED:
Document Type: ${documentStage.documentType}
Stage: ${documentStage.stage || 'Not determined'}
User has received document: ${documentStage.hasReceived ? 'YES' : 'NO'}
Action Required: ${documentStage.actionRequired || 'None specified'}
Timeline: ${documentStage.timeline || 'Standard timeframes apply'}
Legal Implications: ${documentStage.legalImplications.join(', ') || 'Standard property law applies'}

`;
    }

    // Add property context
    prompt += `\n🎯 PROPERTY CONTEXT:
Urgency: ${propertyContext.urgency}
Category: ${propertyContext.category}
Legal Area: ${propertyContext.legalArea || 'General property management'}
${propertyContext.maintenanceType ? `Maintenance Type: ${propertyContext.maintenanceType}` : ''}

`;

    return prompt;
}

async function handleGenerateReply(request: NextRequest) {
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

        // 🏢 ENHANCED UK PROPERTY MANAGEMENT ANALYSIS
        const emailContent = `${emailSubject} ${emailBody}`.toLowerCase();

        // 📋 LEGAL DOCUMENT & STAGE RECOGNITION
        const documentStageAnalysis = analyzeDocumentStage(emailContent, emailSubject, emailBody);

        // 🎯 PROPERTY MANAGEMENT CONTEXT DETECTION
        const propertyContext = analyzePropertyContext(emailContent);

        // 📝 ENHANCED SYSTEM PROMPT WITH UK LEGAL CONTEXT
        const enhancedPrompt = buildEnhancedPrompt(documentStageAnalysis, propertyContext);

        // Use unified Ask BlocIQ system with enhanced property management prompt
        const askResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ask-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('Authorization') || '',
                'Cookie': request.headers.get('Cookie') || ''
            },
            body: JSON.stringify({
                message: `${enhancedPrompt}

ORIGINAL EMAIL TO REPLY TO:
Subject: ${emailSubject}
From: ${emailSender}
Body: ${emailBody}

ANALYSIS CONTEXT:
${JSON.stringify({
    documentStage: documentStageAnalysis,
    propertyContext: propertyContext
}, null, 2)}`,
                emailContext: {
                    subject: emailSubject,
                    sender: emailSender,
                    body: emailBody,
                    conversationId: conversationId || '',
                    documentStage: documentStageAnalysis,
                    propertyContext: propertyContext
                },
                systemPrompt: 'email_reply',
                source: 'outlook_addin_reply_enhanced'
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

// Export the wrapped handler with subscription middleware
export const POST = withOutlookSubscription(handleGenerateReply, {
    requestType: 'generate_reply',
    tokensRequired: 3, // Reply generation is medium cost
    includeBuildings: false
});

