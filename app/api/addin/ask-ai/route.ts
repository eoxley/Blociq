import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 Add-in AI request received...');
    
    const supabase = createClient(cookies());
    
    // Check authentication (optional for add-in)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Parse request body (handle both FormData and JSON)
    let prompt = '';
    let buildingId = null;
    let emailContext = null;
    let files: File[] = [];

    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with files)
      const formData = await request.formData();
      prompt = formData.get('prompt') as string;
      buildingId = formData.get('building_id') as string;
      
      const emailContextStr = formData.get('email_context') as string;
      if (emailContextStr) {
        try {
          emailContext = JSON.parse(emailContextStr);
        } catch (e) {
          console.warn('Failed to parse email context from FormData');
        }
      }

      // Handle files
      const fileEntries = formData.getAll('file');
      files = fileEntries.filter(entry => entry instanceof File) as File[];
      
    } else {
      // Handle JSON
      const body = await request.json();
      prompt = body.prompt;
      buildingId = body.building_id;
      emailContext = body.email_context;
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 });
    }

    console.log(`📧 Email context: ${emailContext ? 'Yes' : 'No'}`);
    console.log(`📎 Files attached: ${files.length}`);

    // Enhance prompt with email context
    let enhancedPrompt = prompt;
    if (emailContext) {
      enhancedPrompt = `I'm working on an email from ${emailContext.senderName} (${emailContext.sender}) with subject "${emailContext.subject}". 

Email content preview: "${emailContext.body.substring(0, 500)}${emailContext.body.length > 500 ? '...' : ''}"

User question: ${prompt}

Please help me with this email-related request.`;
    }

    // Call the same AI endpoint as homepage but with enhanced context
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ask-ai-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authentication if available
        ...(user ? { 'Authorization': `Bearer ${user.id}` } : {})
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        building_id: buildingId,
        is_public: !user, // Public if no user authenticated
        context: {
          source: 'outlook_addin',
          email_context: emailContext,
          user_authenticated: !!user
        }
      }),
    });

    const aiData = await aiResponse.json();

    if (aiData.success) {
      console.log('✅ AI response received successfully');
      
      // Format response for add-in
      return NextResponse.json({
        success: true,
        result: aiData.result || aiData.response,
        context_type: 'email_assistant',
        email_subject: emailContext?.subject,
        has_email_context: !!emailContext
      });
    } else {
      console.error('❌ AI request failed:', aiData);
      return NextResponse.json({
        success: false,
        error: aiData.error || 'AI request failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Add-in AI error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle preflight CORS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
