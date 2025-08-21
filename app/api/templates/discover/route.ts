import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TemplateDiscoveryRequest {
  query: string;
  buildingId?: string;
  documentType?: string;
  context?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query, buildingId, documentType, context }: TemplateDiscoveryRequest = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔍 Template Discovery Request:", { query, buildingId, documentType });

    // 1. Get building context if provided
    let buildingContext = '';
    if (buildingId) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address, postcode, city')
        .eq('id', buildingId)
        .single();
      
      if (building) {
        buildingContext = `Building: ${building.name}, ${building.address}, ${building.city} ${building.postcode}`;
      }
    }

    // 2. Search existing templates
    const existingTemplates = await searchExistingTemplates(query, documentType, supabase);
    console.log("📋 Found existing templates:", existingTemplates.length);

    // 3. Get AI recommendations
    const aiRecommendations = await getAIRecommendations(
      query, 
      existingTemplates, 
      buildingContext, 
      documentType
    );

    // 4. Suggest template improvements
    const templateImprovements = await suggestTemplateImprovements(
      query, 
      existingTemplates, 
      buildingContext
    );

    // 5. Recommend new template types
    const newTemplateTypes = await recommendNewTemplateTypes(
      query, 
      existingTemplates, 
      buildingContext
    );

    return NextResponse.json({
      success: true,
      query: query,
      existingTemplates: existingTemplates,
      aiRecommendations: aiRecommendations,
      templateImprovements: templateImprovements,
      newTemplateTypes: newTemplateTypes,
      buildingContext: buildingContext
    });

  } catch (error: any) {
    console.error('❌ Error in template discovery:', error);
    return NextResponse.json(
      { error: 'Failed to discover templates', details: error.message },
      { status: 500 }
    );
  }
}

async function searchExistingTemplates(query: string, documentType: string | undefined, supabase: any) {
  let templateQuery = supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (documentType) {
    templateQuery = templateQuery.eq('type', documentType);
  }

  const { data: templates } = await templateQuery;
  
  if (!templates) return [];

  // Simple relevance scoring based on query matching
  const scoredTemplates = templates.map(template => {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Score based on name match
    if (template.name.toLowerCase().includes(queryLower)) score += 3;
    
    // Score based on description match
    if (template.description?.toLowerCase().includes(queryLower)) score += 2;
    
    // Score based on content match
    if (template.content_text?.toLowerCase().includes(queryLower)) score += 1;
    
    // Score based on type match
    if (documentType && template.type === documentType) score += 2;
    
    return { ...template, relevanceScore: score };
  });

  // Sort by relevance score
  return scoredTemplates
    .filter(t => t.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5); // Return top 5
}

async function getAIRecommendations(
  query: string, 
  existingTemplates: any[], 
  buildingContext: string, 
  documentType: string | undefined
) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a template recommendation expert for UK property management. 
        Analyze the user's query and existing templates to provide smart recommendations.`
      },
      {
        role: "user",
        content: `User Query: "${query}"
        
        Building Context: ${buildingContext || 'Not specified'}
        Document Type: ${documentType || 'Auto-detect'}
        
        Existing Templates: ${existingTemplates.map(t => `${t.name} (${t.type})`).join(', ')}
        
        Please provide recommendations for:
        1. Which existing template would be best for this use case
        2. How to modify an existing template for this specific need
        3. What additional information would help create a better template
        4. Any legal or compliance considerations for this document type
        
        Return your response in a clear, actionable format.`
      }
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || 'No AI recommendations available.';
}

async function suggestTemplateImprovements(
  query: string, 
  existingTemplates: any[], 
  buildingContext: string
) {
  if (existingTemplates.length === 0) return [];

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a template optimization expert. Suggest specific improvements for existing templates.`
      },
      {
        role: "user",
        content: `User Query: "${query}"
        
        Building Context: ${buildingContext || 'Not specified'}
        
        Please analyze these templates and suggest improvements:
        ${existingTemplates.map(t => `
        Template: ${t.name}
        Type: ${t.type}
        Current Placeholders: ${t.placeholders?.join(', ') || 'None'}
        `).join('\n')}
        
        For each template, suggest:
        1. Content improvements
        2. Additional placeholders
        3. Structure optimizations
        4. Compliance enhancements
        
        Return as a structured list of improvements.`
      }
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  return completion.choices[0]?.message?.content || 'No improvement suggestions available.';
}

async function recommendNewTemplateTypes(
  query: string, 
  existingTemplates: any[], 
  buildingContext: string
) {
  const existingTypes = existingTemplates.map(t => t.type);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a template strategy expert. Recommend new template types that would be valuable for the organization.`
      },
      {
        role: "user",
        content: `User Query: "${query}"
        
        Building Context: ${buildingContext || 'Not specified'}
        
        Existing Template Types: ${existingTypes.join(', ')}
        
        Please recommend:
        1. New template types that would be valuable for this use case
        2. Template types commonly needed in UK property management
        3. Specialized templates for specific building types or situations
        4. Compliance-related templates that might be missing
        
        Return as a prioritized list with explanations for each recommendation.`
      }
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || 'No new template type recommendations available.';
}
