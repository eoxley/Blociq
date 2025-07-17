import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import OpenAI from 'openai';

interface GenerateDraftRequest {
  templateName: string;
  buildingName: string;
  leaseholderCount: number;
  category: string;
  purpose: string;
  tags?: string[];
  buildingType?: string;
  buildingAge?: string;
  specialFeatures?: string[];
  complianceIssues?: string[];
  maintenanceHistory?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      templateName, 
      buildingName, 
      leaseholderCount, 
      category, 
      purpose,
      tags = [],
      buildingType,
      buildingAge,
      specialFeatures = [],
      complianceIssues = [],
      maintenanceHistory
    }: GenerateDraftRequest = await req.json();
    
    if (!templateName || !buildingName || !purpose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context-aware prompts based on tags and building information
    const tagContext = buildTagContext(tags);
    const buildingContext = buildBuildingContext(buildingName, buildingType, buildingAge, specialFeatures);
    const complianceContext = buildComplianceContext(complianceIssues);
    const maintenanceContext = buildMaintenanceContext(maintenanceHistory);

    // Create the enhanced prompt for AI draft generation
    const systemPrompt = `You are a professional property management communication specialist with expertise in UK property law and building management. 
    Create clear, professional, and legally appropriate communications for leaseholders.
    
${tagContext}
${buildingContext}
${complianceContext}
${maintenanceContext}

    Guidelines:
    - Use a professional but approachable tone appropriate for the context
    - Be clear, concise, and actionable
    - Include relevant merge tags like {{leaseholder_name}}, {{building_name}}, {{unit_number}}, {{current_date}}, {{management_company}}
    - Structure the message logically with proper paragraphs
    - End with a professional closing
    - Reference relevant regulations or policies when applicable
    - Provide specific timelines and next steps when relevant
    - Consider the building's characteristics and history in your advice`;

    const userPrompt = `Create a ${category} communication template for:
    
    Template Name: ${templateName}
    Building: ${buildingName}
    Number of leaseholders: ${leaseholderCount}
    Purpose: ${purpose}
    ${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}
    ${buildingType ? `Building Type: ${buildingType}` : ''}
    ${buildingAge ? `Building Age: ${buildingAge}` : ''}
    ${specialFeatures.length > 0 ? `Special Features: ${specialFeatures.join(', ')}` : ''}
    ${complianceIssues.length > 0 ? `Compliance Issues: ${complianceIssues.join(', ')}` : ''}
    ${maintenanceHistory ? `Maintenance History: ${maintenanceHistory}` : ''}
    
    Please generate a professional message that:
    1. Addresses the specific purpose mentioned with appropriate urgency
    2. Uses relevant merge tags for personalization ({{leaseholder_name}}, {{building_name}}, {{unit_number}}, {{current_date}}, {{management_company}})
    3. Maintains a professional tone appropriate for the context and tags
    4. Is clear, actionable, and provides specific next steps
    5. Includes a proper greeting and closing
    6. References relevant building characteristics or compliance requirements when applicable
    7. Provides realistic timelines based on the building's context
    
    Return only the message content, no additional formatting or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    if (!generatedContent) {
      return NextResponse.json({ error: 'Failed to generate draft content' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      context: {
        tags,
        buildingType,
        buildingAge,
        specialFeatures,
        complianceIssues,
        maintenanceHistory,
        category,
        purpose
      }
    });

  } catch (error: any) {
    console.error('Error in generate-draft:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to build context based on tags
function buildTagContext(tags: string[]): string {
  if (tags.length === 0) return '';
  
  const contextParts = [];
  
  if (tags.includes('Urgent')) {
    contextParts.push('- This is an URGENT matter requiring immediate attention and quick response.');
  }
  
  if (tags.includes('Compliance')) {
    contextParts.push('- This involves compliance or regulatory matters. Reference relevant UK property regulations and safety standards.');
  }
  
  if (tags.includes('Leaseholder')) {
    contextParts.push('- This is a leaseholder concern. Be empathetic and provide clear guidance on lease-related matters and rights.');
  }
  
  if (tags.includes('Maintenance')) {
    contextParts.push('- This is a maintenance request. Provide clear timeline, contractor information, and next steps for resolution.');
  }
  
  if (tags.includes('Financial')) {
    contextParts.push('- This involves financial matters. Be precise with numbers, payment terms, and reference relevant lease clauses.');
  }
  
  if (tags.includes('Legal')) {
    contextParts.push('- This involves legal matters. Be careful with language and suggest professional consultation if needed.');
  }
  
  if (tags.includes('Emergency')) {
    contextParts.push('- This is an EMERGENCY situation. Prioritize safety and immediate action protocols.');
  }
  
  if (tags.includes('Routine')) {
    contextParts.push('- This is a routine matter. Provide standard information and procedures.');
  }
  
  return contextParts.length > 0 
    ? `Context based on tags:\n${contextParts.join('\n')}`
    : '';
}

// Helper function to build building-specific context
function buildBuildingContext(buildingName: string, buildingType?: string, buildingAge?: string, specialFeatures?: string[]): string {
  const contextParts = [];
  
  if (buildingType) {
    contextParts.push(`Building Type: ${buildingType}`);
  }
  
  if (buildingAge) {
    contextParts.push(`Building Age: ${buildingAge}`);
  }
  
  if (specialFeatures && specialFeatures.length > 0) {
    contextParts.push(`Special Features: ${specialFeatures.join(', ')}`);
  }
  
  return contextParts.length > 0 
    ? `Building Information:\n- ${contextParts.join('\n- ')}`
    : '';
}

// Helper function to build compliance context
function buildComplianceContext(complianceIssues: string[]): string {
  if (complianceIssues.length === 0) return '';
  
  return `Compliance Considerations:\n- ${complianceIssues.join('\n- ')}`;
}

// Helper function to build maintenance context
function buildMaintenanceContext(maintenanceHistory?: string): string {
  if (!maintenanceHistory) return '';
  
  return `Maintenance History:\n- ${maintenanceHistory}`;
}
