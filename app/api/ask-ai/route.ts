import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EnhancedAskAI } from '@/lib/ai/enhanced-ask-ai';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { 
      prompt, 
      building_id, 
      contextType, 
      emailContext, 
      is_outlook_addin,
      includeIndustryKnowledge = true, // Default to true for enhanced responses
      knowledgeCategories 
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 3. Use enhanced Ask AI with industry knowledge
    const enhancedAI = new EnhancedAskAI();
    const response = await enhancedAI.generateResponse({
      prompt,
      building_id,
      contextType,
      emailContext,
      is_outlook_addin,
      includeIndustryKnowledge,
      knowledgeCategories,
    });

    // 4. Log usage analytics (optional - can be added later)
    // For now, we'll skip this since we don't have the industry_knowledge_usage table
    // You can add this later if you want to track usage

    // 5. Return enhanced response
    return NextResponse.json({
      response: response.response,
      sources: response.sources,
      confidence: response.confidence,
      knowledgeUsed: response.knowledgeUsed,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Ask AI failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return knowledge base statistics for admin users
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      const enhancedAI = new EnhancedAskAI();
      const stats = await enhancedAI.getKnowledgeStats();
      const categories = await enhancedAI.getKnowledgeCategories();

      return NextResponse.json({
        stats,
        categories,
        message: 'Industry knowledge base is active and enhancing AI responses'
      });
    }

    return NextResponse.json({
      message: 'Ask AI endpoint is active with industry knowledge integration'
    });

  } catch (error) {
    console.error('Failed to get Ask AI info:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve information'
    }, { status: 500 });
  }
} 