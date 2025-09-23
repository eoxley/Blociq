// app/api/addin/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, emailContext, source } = body;

        console.log('📧 Outlook Add-in chat request received:', {
            message: message.substring(0, 100),
            hasEmailContext: !!emailContext,
            source
        });

        // Validate required fields
        if (!message) {
            return NextResponse.json({
                success: false,
                error: 'Missing message'
            }, { status: 400 });
        }

        // Forward request to the shared Ask BlocIQ endpoint
        const askBlocIQResponse = await forwardToAskBlocIQ(request, message, emailContext, source);

        return askBlocIQResponse;

    } catch (error) {
        console.error('Error in chat API:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to process chat message'
        }, { status: 500 });
    }
}

/**
 * Forward Outlook Add-in requests to the shared Ask BlocIQ endpoint
 * This ensures consistency between web and add-in AI responses
 */
async function forwardToAskBlocIQ(
    originalRequest: NextRequest,
    message: string,
    emailContext?: any,
    source?: string
): Promise<NextResponse> {
    try {
        // Construct the Ask BlocIQ request payload matching main ask-ai endpoint format
        // IMPORTANT: Use 'general' context to ensure chat responses, NOT email formatting
        const askBlocIQPayload = {
            message: message,
            context_type: 'general', // Always use general for chat responses
            tone: 'Professional',
            source: source || 'outlook_chat_addin',
            is_public: false, // Ensure authenticated access for full functionality
            intent: 'general', // Explicitly set to avoid email reply formatting
            // Include email context as additional context without triggering email formatting
            manual_context: emailContext ? `Current email context (for reference only):
Subject: ${emailContext.subject || 'No subject'}
From: ${emailContext.from || 'Unknown sender'}
Item Type: ${emailContext.itemType || 'Email'}

Note: This is a chat conversation, provide conversational responses.` : undefined
        };

        console.log('🔄 Forwarding to Ask BlocIQ for CHAT response:', {
            context_type: askBlocIQPayload.context_type,
            intent: askBlocIQPayload.intent,
            hasEmailContext: !!emailContext,
            hasManualContext: !!askBlocIQPayload.manual_context,
            source: askBlocIQPayload.source
        });

        // Get the base URL for the internal request
        const protocol = originalRequest.headers.get('x-forwarded-proto') || 'http';
        const host = originalRequest.headers.get('host') || 'localhost:3001';
        const askBlocIQUrl = `${protocol}://${host}/api/ask-ai`;

        // Forward the request to Ask BlocIQ endpoint with authentication
        const response = await fetch(askBlocIQUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward auth headers to maintain session
                'Authorization': originalRequest.headers.get('authorization') || '',
                'Cookie': originalRequest.headers.get('cookie') || '',
                'User-Agent': originalRequest.headers.get('user-agent') || 'Outlook-Add-in'
            },
            body: JSON.stringify(askBlocIQPayload)
        });

        if (!response.ok) {
            throw new Error(`Ask BlocIQ responded with ${response.status}`);
        }

        const askBlocIQResult = await response.json();

        // Transform Ask BlocIQ response to match add-in expected format
        if (askBlocIQResult.success) {
            return NextResponse.json({
                success: true,
                response: askBlocIQResult.response,
                metadata: askBlocIQResult.metadata,
                timestamp: new Date().toISOString(),
                source: 'ask_blociq'
            }, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            });
        } else {
            throw new Error(askBlocIQResult.error || 'Ask BlocIQ request failed');
        }

    } catch (error) {
        console.error('❌ Error forwarding to Ask BlocIQ:', error);

        // Fallback to basic response if Ask BlocIQ is unavailable
        return NextResponse.json({
            success: true,
            response: "I'm currently experiencing connectivity issues with the main AI system. Please try again in a moment, or use the web interface for full functionality.",
            timestamp: new Date().toISOString(),
            source: 'fallback'
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
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

