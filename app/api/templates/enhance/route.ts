import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TemplateEnhancementRequest {
  templateId: string;
  enhancementPrompt: string;
  buildingId?: string;
  action: 'enhance_content' | 'add_placeholders' | 'optimize_structure' | 'rewrite';
}

export async function POST(req: NextRequest) {
  try {
    const { templateId, enhancementPrompt, buildingId, action }: TemplateEnhancementRequest = await req.json();
    
    if (!templateId || !enhancementPrompt || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔧 Template Enhancement Request:", { templateId, action, enhancementPrompt });

    // 1. Get current template
    const { data: currentTemplate, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !currentTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // 2. Get building context if provided
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

    // 3. Enhance template using AI
    const enhancedTemplate = await enhanceTemplateWithAI(
      currentTemplate, 
      enhancementPrompt, 
      action, 
      buildingContext
    );

    // 4. Create new version
    const { data: newVersion, error: versionError } = await supabase
      .from('templates')
      .insert({
        name: `${currentTemplate.name} (Enhanced)`,
        type: currentTemplate.type,
        description: `${currentTemplate.description}\n\nEnhanced: ${enhancementPrompt}`,
        storage_path: currentTemplate.storage_path,
        content_text: enhancedTemplate.content,
        placeholders: enhancedTemplate.placeholders,
        parent_template_id: templateId,
        is_ai_generated: true,
        ai_prompt: enhancementPrompt,
        version: (currentTemplate.version || 1) + 1
      })
      .select()
      .single();

    if (versionError) {
      console.error('Failed to create template version:', versionError);
      return NextResponse.json({ error: 'Failed to create enhanced template' }, { status: 500 });
    }

    console.log("✅ Template enhanced successfully");

    return NextResponse.json({
      success: true,
      originalTemplate: currentTemplate,
      enhancedTemplate: newVersion,
      changes: {
        content: enhancedTemplate.content !== currentTemplate.content_text,
        placeholders: enhancedTemplate.placeholders.length !== currentTemplate.placeholders.length,
        action: action
      }
    });

  } catch (error: any) {
    console.error('❌ Error in template enhancement:', error);
    return NextResponse.json(
      { error: 'Failed to enhance template', details: error.message },
      { status: 500 }
    );
  }
}

async function enhanceTemplateWithAI(
  template: any, 
  prompt: string, 
  action: string, 
  buildingContext: string
) {
  let systemPrompt = '';
  let userPrompt = '';

  switch (action) {
    case 'enhance_content':
      systemPrompt = `You are a professional document template enhancer for UK property management. 
      Enhance the existing template content while maintaining its structure and professional tone.`;
      userPrompt = `Enhance this template content: "${template.content_text}"
      
      Enhancement request: "${prompt}"
      ${buildingContext ? `Building context: ${buildingContext}` : ''}
      
      Please enhance the content while:
      1. Maintaining the professional UK business tone
      2. Keeping the same structure and placeholders
      3. Improving clarity and professionalism
      4. Adding relevant details where appropriate`;
      break;

    case 'add_placeholders':
      systemPrompt = `You are a template optimization expert. Add relevant placeholders to make the template more dynamic and reusable.`;
      userPrompt = `Add relevant placeholders to this template: "${template.content_text}"
      
      Enhancement request: "${prompt}"
      ${buildingContext ? `Building context: ${buildingContext}` : ''}
      
      Current placeholders: ${template.placeholders.join(', ')}
      
      Please add new placeholders for:
      1. Building-specific information
      2. Leaseholder details
      3. Financial amounts
      4. Dates and deadlines
      5. Contact information
      
      Return the enhanced content with new placeholders in {{placeholder}} format.`;
      break;

    case 'optimize_structure':
      systemPrompt = `You are a document structure expert. Optimize the template structure for better readability and professional appearance.`;
      userPrompt = `Optimize the structure of this template: "${template.content_text}"
      
      Enhancement request: "${prompt}"
      ${buildingContext ? `Building context: ${buildingContext}` : ''}
      
      Please optimize the structure for:
      1. Better readability
      2. Professional formatting
      3. Logical flow
      4. UK business standards
      
      Maintain all existing placeholders while improving the overall structure.`;
      break;

    case 'rewrite':
      systemPrompt = `You are a professional document writer. Rewrite this template according to the user's specific requirements.`;
      userPrompt = `Rewrite this template: "${template.content_text}"
      
      Rewrite request: "${prompt}"
      ${buildingContext ? `Building context: ${buildingContext}` : ''}
      
      Current placeholders: ${template.placeholders.join(', ')}
      
      Please rewrite the template:
      1. According to the user's specific requirements
      2. Maintaining professional UK business tone
      3. Keeping relevant placeholders
      4. Improving clarity and effectiveness`;
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const enhancedContent = completion.choices[0]?.message?.content || template.content_text;

  // Extract new placeholders
  const newPlaceholders = extractPlaceholders(enhancedContent);
  
  // Merge with existing placeholders
  const allPlaceholders = [...new Set([...template.placeholders, ...newPlaceholders])];

  return {
    content: enhancedContent,
    placeholders: allPlaceholders
  };
}

function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders = new Set<string>();
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}
