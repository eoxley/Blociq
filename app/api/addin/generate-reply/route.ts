// app/api/addin/generate-reply/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { originalSubject, originalSender, originalBody, context } = body;

        console.log('Generate reply request received:', {
            subject: originalSubject,
            sender: originalSender,
            bodyLength: originalBody?.length || 0,
            context
        });

        // Validate required fields
        if (!originalBody && !originalSubject) {
            return NextResponse.json({
                success: false,
                error: 'Missing email content'
            }, { status: 400 });
        }

        // Generate reply using your AI service
        // Replace this with your actual BlocIQ AI API call
        const reply = await generateAIReply({
            subject: originalSubject,
            sender: originalSender,
            body: originalBody
        });

        return NextResponse.json({
            success: true,
            reply: reply,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating reply:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to generate reply'
        }, { status: 500 });
    }
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

async function generateAIReply(emailData: {
    subject: string;
    sender: string;
    body: string;
}) {
    // This is where you'd integrate with your actual AI service
    // For now, I'll provide a template-based response
    
    const { subject, sender, body } = emailData;
    
    // Simple AI reply generation logic
    // Replace this with your actual BlocIQ AI API call
    
    let replyTemplate = '';
    
    // Detect email type and generate appropriate response
    if (body.toLowerCase().includes('property') || body.toLowerCase().includes('rent')) {
        replyTemplate = `Thank you for your inquiry regarding the property matter.

I've reviewed your message and will address your concerns promptly. Based on the information provided, I'll need to:

• Review the relevant property details
• Check current regulations and requirements  
• Prepare a comprehensive response with next steps

I'll get back to you within 24 hours with a detailed update.

Best regards`;
        
    } else if (body.toLowerCase().includes('urgent') || body.toLowerCase().includes('asap')) {
        replyTemplate = `Thank you for reaching out with this urgent matter.

I understand the time-sensitive nature of your request and will prioritize this accordingly. I'm currently reviewing the details you've provided and will respond with a full update within the next few hours.

In the meantime, please don't hesitate to call if you need immediate assistance.

Best regards`;
        
    } else if (body.toLowerCase().includes('meeting') || body.toLowerCase().includes('schedule')) {
        replyTemplate = `Thank you for your message regarding scheduling.

I'd be happy to arrange a meeting to discuss this further. Based on your availability mentioned, I can offer the following time slots:

• [Time slot 1]
• [Time slot 2] 
• [Time slot 3]

Please let me know which works best for you, or suggest alternative times if none of these are suitable.

Best regards`;
        
    } else {
        replyTemplate = `Thank you for your email.

I've received your message and will review the details carefully. I'll provide you with a comprehensive response addressing all your points within 24 hours.

If you need any immediate assistance or have additional questions in the meantime, please don't hesitate to reach out.

Best regards`;
    }
    
    return replyTemplate;
}

// Alternative: Integration with your actual AI service
async function generateAIReplyWithService(emailData: {
    subject: string;
    sender: string;
    body: string;
}) {
    // Example integration with your AI service
    try {
        const response = await fetch('https://api.blociq.co.uk/ai/generate-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BLOCIQ_AI_API_KEY}`,
            },
            body: JSON.stringify({
                prompt: `Generate a professional email reply for this property management email:
                
Subject: ${emailData.subject}
From: ${emailData.sender}
Message: ${emailData.body}

Generate a helpful, professional reply that addresses the sender's needs.`,
                maxTokens: 200,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('AI service failed');
        }

        const result = await response.json();
        return result.generatedText || 'Thank you for your email. I will review and respond shortly.';
        
    } catch (error) {
        console.error('AI service error:', error);
        // Fallback to template
        return 'Thank you for your email. I will review and respond shortly.';
    }
}