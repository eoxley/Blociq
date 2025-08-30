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
  limit?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { query, buildingId, documentType, limit = 5 }: TemplateDiscoveryRequest = await req.json();
    
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

    // Step 1: Analyze the query using AI
    const queryAnalysis = await analyzeQuery(query);
    console.log("🎯 Query Analysis:", queryAnalysis);

    // Step 2: Search for relevant templates
    const relevantTemplates = await searchRelevantTemplates(queryAnalysis, buildingId, documentType, limit, supabase);
    console.log("📋 Found Templates:", relevantTemplates.length);

    // Step 3: Generate AI recommendations
    const aiRecommendations = await generateAIRecommendations(query, relevantTemplates, queryAnalysis, supabase);
    console.log("🤖 AI Recommendations Generated");

    // Step 4: Suggest template improvements
    const templateSuggestions = await suggestTemplateImprovements(query, relevantTemplates, queryAnalysis, supabase);

    return NextResponse.json({
      success: true,
      query: query,
      analysis: queryAnalysis,
      templates: relevantTemplates,
      recommendations: aiRecommendations,
      suggestions: templateSuggestions
    });

  } catch (error: any) {
    console.error('❌ Error in Template Discovery:', error);
    return NextResponse.json(
      { error: 'Failed to discover templates', details: error.message },
      { status: 500 }
    );
  }
}

async function analyzeQuery(query: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a template discovery expert for a UK property management system. Analyze the user's query and extract key information to help find relevant templates.
        
        Return a JSON object with:
        {
          "intent": "what the user is trying to accomplish",
          "documentType": "section_20|welcome_letter|notice|form|invoice|legal_notice|letter|unknown",
          "keyTopics": ["list", "of", "main", "topics"],
          "urgency": "high|medium|low",
          "complexity": "simple|moderate|complex",
          "buildingSpecific": boolean,
          "requiresLegal": boolean,
          "suggestedTemplates": ["list", "of", "template", "types", "that", "might", "help"]
        }`
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.1,
    max_tokens: 500
  });

  try {
    const content = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse query analysis:', error);
    return {
      intent: 'general document creation',
      documentType: 'unknown',
      keyTopics: [],
      urgency: 'medium',
      complexity: 'moderate',
      buildingSpecific: false,
      requiresLegal: false,
      suggestedTemplates: ['letter', 'notice']
    };
  }
}

async function searchRelevantTemplates(
  queryAnalysis: any,
  buildingId: string | undefined,
  documentType: string | undefined,
  limit: number,
  supabase: any
) {
  let templateQuery = supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by document type if specified or detected
  if (documentType || queryAnalysis.documentType !== 'unknown') {
    const targetType = documentType || queryAnalysis.documentType;
    templateQuery = templateQuery.eq('type', targetType);
  }

  // Filter by building specificity if needed
  if (queryAnalysis.buildingSpecific) {
    templateQuery = templateQuery.eq('is_building_specific', true);
  }

  // Get templates
  const { data: templates, error } = await templateQuery.limit(limit * 2); // Get more for filtering

  if (error || !templates) {
    console.error('Failed to fetch templates:', error);
    return [];
  }

  // Use AI to rank templates by relevance
  const rankedTemplates = await rankTemplatesByRelevance(templates, queryAnalysis);
  
  return rankedTemplates.slice(0, limit);
}

async function rankTemplatesByRelevance(templates: any[], queryAnalysis: any) {
  if (templates.length === 0) return [];

  const rankingPrompt = `Rank these templates by relevance to the user's query. Consider:
  
  Query Analysis: ${JSON.stringify(queryAnalysis)}
  
  Templates to rank:
  ${templates.map((t, i) => `${i + 1}. ${t.name} (${t.type}) - ${t.description || 'No description'}`).join('\n')}
  
  Return a JSON array with template indices in order of relevance (most relevant first):
  [2, 0, 1, 3, ...]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a template ranking expert. Return only a JSON array of indices in relevance order."
        },
        {
          role: "user",
          content: rankingPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    const content = completion.choices[0]?.message?.content || '[]';
    const rankedIndices = JSON.parse(content);
    
    // Reorder templates based on AI ranking
    return rankedIndices.map((index: number) => templates[index]).filter(Boolean);
  } catch (error) {
    console.error('Failed to rank templates, using original order:', error);
    return templates;
  }
}

async function generateAIRecommendations(
  query: string,
  templates: any[],
  queryAnalysis: any,
  supabase: any
) {
  const recommendationsPrompt = `Based on the user's query and available templates, provide recommendations.
  
  User Query: "${query}"
  
  Query Analysis: ${JSON.stringify(queryAnalysis)}
  
  Available Templates: ${templates.map(t => `${t.name} (${t.type})`).join(', ')}
  
  Provide recommendations in this JSON format:
  {
    "bestTemplate": "template_name_or_id",
    "reasoning": "why this template is the best choice",
    "alternativeTemplates": ["other", "good", "options"],
    "customizationNeeded": "what modifications might be needed",
    "nextSteps": ["step1", "step2", "step3"]
  }`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a template recommendation expert. Provide helpful, specific recommendations."
        },
        {
          role: "user",
          content: recommendationsPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to generate AI recommendations:', error);
    return {
      bestTemplate: templates[0]?.name || 'No template found',
      reasoning: 'Unable to generate recommendations',
      alternativeTemplates: [],
      customizationNeeded: 'Unknown',
      nextSteps: ['Select a template', 'Customize as needed', 'Generate document']
    };
  }
}

async function suggestTemplateImprovements(
  query: string,
  templates: any[],
  queryAnalysis: any,
  supabase: any
) {
  if (templates.length === 0) return [];

  const improvementsPrompt = `Analyze these templates and suggest improvements based on the user's query.
  
  User Query: "${query}"
  
  Query Analysis: ${JSON.stringify(queryAnalysis)}
  
  Templates to analyze:
  ${templates.map(t => `${t.name}: ${t.content_text?.substring(0, 200)}...`).join('\n\n')}
  
  Provide improvement suggestions in this JSON format:
  [
    {
      "templateId": "template_id",
      "templateName": "template_name",
      "suggestions": ["suggestion1", "suggestion2"],
      "priority": "high|medium|low"
    }
  ]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a template improvement expert. Provide specific, actionable suggestions."
        },
        {
          role: "user",
          content: improvementsPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = completion.choices[0]?.message?.content || '[]';
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to generate template improvements:', error);
    return [];
  }
}
