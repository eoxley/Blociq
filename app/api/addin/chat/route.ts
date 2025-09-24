// app/api/addin/chat/route.ts
// BlocIQ Outlook Add-in Chat API
//
// This endpoint provides AI chat functionality for Outlook add-in users.
// IMPORTANT: Uses PUBLIC ACCESS mode - no building or agency-specific data
// This ensures add-in-only users get general property management assistance
// without access to sensitive building/agency information.
//
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
        // Construct the Ask BlocIQ request payload for PUBLIC ACCESS (no building/agency data)
        // IMPORTANT: Use 'public' context to ensure general knowledge responses without agency data
        const askBlocIQPayload = {
            message: message,
            context_type: 'public', // Use public for general property management advice
            tone: 'Professional',
            source: source || 'outlook_chat_addin',
            is_public: true, // CRITICAL: Force public access to avoid agency data access
            intent: 'general', // Explicitly set to avoid email reply formatting
            // Include email context as additional context without triggering email formatting
            manual_context: emailContext ? `Current email context (for reference only):
Subject: ${emailContext.subject || 'No subject'}
From: ${emailContext.from || 'Unknown sender'}
Item Type: ${emailContext.itemType || 'Email'}

Note: This is a chat conversation about general property management. Provide helpful advice based on UK property management best practices, but do not reference specific building or agency data.` : undefined
        };

        console.log('🔄 Forwarding to Ask BlocIQ for PUBLIC CHAT response (no agency data):', {
            context_type: askBlocIQPayload.context_type,
            intent: askBlocIQPayload.intent,
            is_public: askBlocIQPayload.is_public,
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
            response: "I'm currently experiencing connectivity issues. Please try again in a moment. I can help with general UK property management questions, compliance guidance, and industry best practices.",
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

