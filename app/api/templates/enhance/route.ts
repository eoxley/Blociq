import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhanceTemplateRequest {
  templateId: string;
  enhancementPrompt: string;
  buildingId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { templateId, enhancementPrompt, buildingId }: EnhanceTemplateRequest = await req.json();
    
    if (!templateId || !enhancementPrompt) {
      return NextResponse.json({ error: 'Template ID and enhancement prompt are required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔧 Template Enhancement Request:", { templateId, enhancementPrompt });

    // Step 1: Get current template
    const { data: currentTemplate, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !currentTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log("📋 Current Template:", currentTemplate.name);

    // Step 2: Get building context if provided
    let buildingContext = '';
    if (buildingId) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address, city, postcode')
        .eq('id', buildingId)
        .single();
      
      if (building) {
        buildingContext = `Building: ${building.name}, ${building.address}, ${building.city} ${building.postcode}`;
      }
    }

    // Step 3: Use AI to enhance the template
    const enhancedTemplate = await enhanceTemplateWithAI(
      currentTemplate,
      enhancementPrompt,
      buildingContext
    );

    console.log("🤖 Template Enhanced by AI");

    // Step 4: Create new version
    const newVersion = await createTemplateVersion(templateId, enhancedTemplate, supabase);

    console.log("📝 New Version Created:", newVersion.version);

    // Step 5: Update the main template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('templates')
      .update({
        content_text: enhancedTemplate.content,
        placeholders: enhancedTemplate.placeholders,
        updated_at: new Date().toISOString(),
        version: newVersion.version,
        last_ai_updated: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update template:', updateError);
      throw new Error('Failed to update template');
    }

    console.log("✅ Template Updated Successfully");

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      version: newVersion,
      changes: {
        originalContent: currentTemplate.content_text,
        enhancedContent: enhancedTemplate.content,
        originalPlaceholders: currentTemplate.placeholders,
        enhancedPlaceholders: enhancedTemplate.placeholders
      }
    });

  } catch (error: any) {
    console.error('❌ Error in Template Enhancement:', error);
    return NextResponse.json(
      { error: 'Failed to enhance template', details: error.message },
      { status: 500 }
    );
  }
}

async function enhanceTemplateWithAI(
  template: any,
  enhancementPrompt: string,
  buildingContext: string
) {
  const systemPrompt = `You are a professional document template enhancer for UK property management. 
  
  Your task is to enhance an existing template based on the user's request while maintaining its professional structure and legal compliance.
  
  Current Template:
  - Name: ${template.name}
  - Type: ${template.type}
  - Current Content: ${template.content_text}
  - Current Placeholders: ${template.placeholders?.join(', ') || 'None'}
  
  Building Context: ${buildingContext || 'Not specified'}
  
  Enhancement Request: ${enhancementPrompt}
  
  Guidelines:
  1. Maintain the professional tone and structure
  2. Keep all existing placeholders that are still relevant
  3. Add new placeholders if needed for the enhancement
  4. Ensure UK property management compliance
  5. Make the content more specific and actionable
  6. Preserve any legal requirements or formalities
  
  Return the enhanced template content with updated placeholders.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Please enhance this template according to the request: ${enhancementPrompt}`
      }
    ],
    temperature: 0.3,
    max_tokens: 1500
  });

  const enhancedContent = completion.choices[0]?.message?.content || template.content_text;
  
  // Extract new placeholders
  const enhancedPlaceholders = extractPlaceholders(enhancedContent);
  
  return {
    content: enhancedContent,
    placeholders: enhancedPlaceholders
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

async function createTemplateVersion(
  templateId: string,
  enhancedTemplate: any,
  supabase: any
) {
  // Get current version number
  const { data: currentVersions } = await supabase
    .from('template_versions')
    .select('version')
    .eq('template_id', templateId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = currentVersions && currentVersions.length > 0 
    ? currentVersions[0].version + 1 
    : 1;

  // Create new version record
  const { data: newVersion, error } = await supabase
    .from('template_versions')
    .insert({
      template_id: templateId,
      version: nextVersion,
      content_text: enhancedTemplate.content,
      placeholders: enhancedTemplate.placeholders,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create template version:', error);
    throw new Error('Failed to create template version');
  }

  return newVersion;
}
