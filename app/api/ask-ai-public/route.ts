// Public Ask BlocIQ API - Full AI System without Building/Agency Data
// This endpoint provides the full BlocIQ AI experience but in public mode
// Uses the main /api/ask-ai system with is_public=true to avoid building/agency data
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Handle both FormData and JSON requests
    const contentType = req.headers.get('content-type') || '';
    console.log('🌐 Public Ask BlocIQ request - content-type:', contentType);

    let prompt: string;
    let sessionId: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData from homepage
      console.log('✅ Processing FormData request from homepage');
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      sessionId = formData.get('sessionId') as string || undefined;

      // Files are ignored for security - no OCR processing in public route
      const uploadedFiles = formData.getAll('files') as File[];
      if (uploadedFiles.length > 0) {
        console.log(`⚠️ Files ignored for security: ${uploadedFiles.length} files received`);
      }

    } else {
      // Handle JSON requests
      console.log('✅ Processing JSON request');
      const body = await req.json();
      prompt = body.prompt;
      sessionId = body.sessionId;
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🌐 PUBLIC: Processing prompt with main AI system:', prompt.substring(0, 100) + '...');

    // Forward to the main Ask BlocIQ system with PUBLIC ACCESS mode
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3001';
    const askBlocIQUrl = `${protocol}://${host}/api/ask-ai`;

    const mainAIPayload = {
      message: prompt,
      context_type: 'public', // Use public context for general knowledge
      tone: 'Professional',
      source: 'public_landing_page',
      is_public: true, // CRITICAL: Force public access to avoid building/agency data
      intent: 'general',
      // Add session context without building/agency access
      manual_context: sessionId ? `Public chat session (general property management guidance only). IMPORTANT: You are a senior property management expert responding to queries from fellow block managers. The user IS a block manager seeking professional colleague advice. Use language like "In my experience...", "I typically handle this by...", "What I've found works well is...". Never suggest contacting property managers - they ARE property managers seeking expert guidance from a colleague.` : `IMPORTANT: You are a senior property management expert responding to queries from fellow block managers. The user IS a block manager seeking professional colleague advice. Use language like "In my experience...", "I typically handle this by...", "What I've found works well is...". Never suggest contacting property managers - they ARE property managers seeking expert guidance from a colleague.`
    };

    console.log('🔄 Forwarding to main AI system with PUBLIC access:', {
      context_type: mainAIPayload.context_type,
      is_public: mainAIPayload.is_public,
      source: mainAIPayload.source
    });

    // Call the main Ask BlocIQ system
    const response = await fetch(askBlocIQUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward relevant headers but not auth headers (public access)
        'User-Agent': req.headers.get('user-agent') || 'Public-Ask-BlocIQ'
      },
      body: JSON.stringify(mainAIPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🤖 Main AI system error:', response.status, errorText);
      throw new Error(`Main AI system error: ${response.status}`);
    }

    const aiResult = await response.json();

    // Return the response from the main AI system
    if (aiResult.success) {
      return NextResponse.json({
        response: aiResult.response || aiResult.result,
        success: true,
        metadata: {
          source: 'main_ai_system_public',
          context_type: 'public',
          has_building_data: false,
          has_agency_data: false
        }
      });
    } else {
      throw new Error(aiResult.error || 'Main AI system request failed');
    }

  } catch (error) {
    console.error('💥 Public Ask BlocIQ error:', error);

    // Fallback to basic response if main system is unavailable
    return NextResponse.json({
      response: "I'm currently experiencing connectivity issues. Please try again in a moment. I can help with general UK property management questions, compliance guidance, and industry best practices.",
      success: true,
      metadata: {
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
} 