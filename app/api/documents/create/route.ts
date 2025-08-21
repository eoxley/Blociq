import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CreateDocumentRequest {
  prompt: string;
  buildingId?: string;
  documentType?: string;
  recipientInfo?: any;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, buildingId, documentType, recipientInfo }: CreateDocumentRequest = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🚀 AI Document Creation Request:", { prompt, buildingId, documentType });

    // Step 1: Parse intent using AI
    const intent = await parseDocumentIntent(prompt);
    console.log("🎯 Parsed Intent:", intent);

    // Step 2: Find or create appropriate template
    const template = await findOrCreateTemplate(intent, documentType, supabase);
    console.log("📋 Template Found/Created:", template.name);

    // Step 3: Auto-populate building data
    let populatedFields = {};
    if (buildingId) {
      const buildingData = await getBuildingData(buildingId, supabase);
      populatedFields = await autoPopulateFields(template, buildingData, supabase);
      console.log("🏢 Building Data Populated:", Object.keys(populatedFields));
    }

    // Step 4: Generate missing content using AI
    const generatedContent = await generateMissingContent(template, populatedFields, intent, prompt);
    console.log("🤖 AI Content Generated:", Object.keys(generatedContent));

    // Step 5: Create final document
    const finalDocument = await generateDocument(template, {
      ...populatedFields,
      ...generatedContent
    }, supabase);

    console.log("✅ Document Created Successfully");

    return NextResponse.json({
      success: true,
      document: finalDocument,
      template: template,
      fields: { ...populatedFields, ...generatedContent },
      intent: intent
    });

  } catch (error: any) {
    console.error('❌ Error in AI Document Creation:', error);
    return NextResponse.json(
      { error: 'Failed to create document', details: error.message },
      { status: 500 }
    );
  }
}

async function parseDocumentIntent(prompt: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a document intent parser for a property management system. Analyze the user's prompt and extract the document type, purpose, and key details. Return a JSON object with the following structure:
        {
          "documentType": "section_20|welcome_letter|notice|form|invoice|legal_notice|letter",
          "purpose": "brief description of what the document is for",
          "keyDetails": ["list", "of", "important", "details"],
          "tone": "formal|professional|friendly|urgent",
          "recipient": "who the document is for",
          "buildingSpecific": boolean,
          "requiresBudget": boolean,
          "requiresDates": boolean
        }`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 500
  });

  try {
    const content = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      documentType: 'letter',
      purpose: 'General communication',
      keyDetails: [],
      tone: 'professional',
      recipient: 'Unknown',
      buildingSpecific: false,
      requiresBudget: false,
      requiresDates: true
    };
  }
}

async function findOrCreateTemplate(intent: any, documentType: string | undefined, supabase: any) {
  // First, try to find user-uploaded templates (prioritize these)
  let userTemplateQuery = supabase
    .from('templates')
    .select('*')
    .eq('type', intent.documentType || documentType || 'letter')
    .eq('is_ai_generated', false) // User-uploaded templates
    .order('created_at', { ascending: false });

  if (intent.buildingSpecific) {
    userTemplateQuery = userTemplateQuery.eq('is_building_specific', true);
  }

  const { data: userTemplates, error: userError } = await userTemplateQuery.limit(3);

  if (userTemplates && userTemplates.length > 0) {
    console.log("📋 Found user-uploaded template:", userTemplates[0].name);
    return userTemplates[0];
  }

  // If no user templates, look for AI-generated templates
  let aiTemplateQuery = supabase
    .from('templates')
    .select('*')
    .eq('type', intent.documentType || documentType || 'letter')
    .eq('is_ai_generated', true) // AI-generated templates
    .order('created_at', { ascending: false });

  if (intent.buildingSpecific) {
    aiTemplateQuery = aiTemplateQuery.eq('is_building_specific', true);
  }

  const { data: aiTemplates, error: aiError } = await aiTemplateQuery.limit(3);

  if (aiTemplates && aiTemplates.length > 0) {
    console.log("📋 Found AI-generated template:", aiTemplates[0].name);
    return aiTemplates[0];
  }

  // If no templates exist at all, create a basic one using AI
  console.log("🔧 Creating new template for:", intent.documentType);
  
  const newTemplate = await createBasicTemplate(intent, supabase);
  return newTemplate;
}

async function createBasicTemplate(intent: any, supabase: any) {
  const templatePrompt = `Create a professional ${intent.documentType} template for property management. 
  
  Purpose: ${intent.purpose}
  Tone: ${intent.tone}
  Key Details: ${intent.keyDetails.join(', ')}
  
  Include appropriate placeholders like {{building_name}}, {{leaseholder_name}}, {{today_date}}, etc.
  Make it professional and suitable for UK property management.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional document template creator. Create clear, professional templates with appropriate placeholders."
      },
      {
        role: "user",
        content: templatePrompt
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  const templateContent = completion.choices[0]?.message?.content || '';
  
  // Extract placeholders from the content
  const placeholders = extractPlaceholders(templateContent);
  
  // Create template record
  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      name: `${intent.documentType.charAt(0).toUpperCase() + intent.documentType.slice(1)} - ${intent.purpose}`,
      type: intent.documentType,
      description: `AI-generated template for ${intent.purpose}`,
      storage_path: `templates/ai_generated_${intent.documentType}_${Date.now()}.docx`,
      content_text: templateContent,
      placeholders: placeholders,
      is_ai_generated: true,
      ai_prompt: templatePrompt
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create template:', error);
    throw new Error('Failed to create template');
  }

  return template;
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

async function getBuildingData(buildingId: string, supabase: any) {
  const { data: building, error } = await supabase
    .from('buildings')
    .select(`
      *,
      units (
        id,
        unit_number,
        leaseholders (
          id,
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('id', buildingId)
    .single();

  if (error) {
    console.error('Failed to fetch building data:', error);
    return {};
  }

  return building;
}

async function autoPopulateFields(template: any, buildingData: any, supabase: any) {
  const populatedFields: Record<string, any> = {};
  
  // Get current user info
  const { data: { user } } = await supabase.auth.getUser();
  const userProfile = await getUserProfile(user.id, supabase);

  // Map common placeholders to building data
  const fieldMappings: Record<string, any> = {
    // Building fields
    '{{building_name}}': buildingData.name || 'Unknown Building',
    '{{building_address}}': buildingData.address || 'Unknown Address',
    '{{building_postcode}}': buildingData.postcode || 'Unknown Postcode',
    '{{building_city}}': buildingData.city || 'Unknown City',
    
    // User/Manager fields
    '{{property_manager_name}}': userProfile?.full_name || user?.email || 'Property Manager',
    '{{contact_email}}': userProfile?.email || user?.email || 'manager@blociq.co.uk',
    '{{contact_phone}}': userProfile?.phone || '020 0000 0000',
    
    // Date fields
    '{{today_date}}': new Date().toLocaleDateString('en-GB'),
    '{{current_year}}': new Date().getFullYear(),
    '{{current_month}}': new Date().toLocaleDateString('en-GB', { month: 'long' }),
    
    // Default values for common fields
    '{{recipient_name}}': 'Dear Resident',
    '{{leaseholder_name}}': 'Resident',
    '{{unit_number}}': 'Unit',
    '{{service_charge_amount}}': '£0.00',
    '{{budget_amount}}': '£0.00'
  };

  // Populate fields that exist in the template
  for (const placeholder of template.placeholders || []) {
    if (fieldMappings[placeholder]) {
      populatedFields[placeholder] = fieldMappings[placeholder];
    }
  }

  return populatedFields;
}

async function getUserProfile(userId: string, supabase: any) {
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone')
    .eq('id', userId)
    .single();
  
  return profile;
}

async function generateMissingContent(template: any, populatedFields: Record<string, any>, intent: any, originalPrompt: string) {
  const missingPlaceholders = (template.placeholders || []).filter(
    (placeholder: string) => !populatedFields[placeholder]
  );

  if (missingPlaceholders.length === 0) {
    return {};
  }

  const contentPrompt = `Generate content for a ${intent.documentType} document based on this request: "${originalPrompt}"

  Document Purpose: ${intent.purpose}
  Tone: ${intent.tone}
  
  Generate content for these missing fields: ${missingPlaceholders.join(', ')}
  
  Use the populated fields as context: ${JSON.stringify(populatedFields)}
  
  Return a JSON object with the field names as keys and the generated content as values.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional document content generator. Generate appropriate content for missing fields based on the context and purpose."
      },
      {
        role: "user",
        content: contentPrompt
      }
    ],
    temperature: 0.4,
    max_tokens: 800
  });

  try {
    const content = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse generated content:', error);
    return {};
  }
}

async function generateDocument(template: any, allFields: Record<string, any>, supabase: any) {
  // For now, return the populated template content
  // In a full implementation, this would use the existing /api/generate-doc endpoint
  
  let documentContent = template.content_text || '';
  
  // Replace all placeholders with actual values
  for (const [placeholder, value] of Object.entries(allFields)) {
    const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
    documentContent = documentContent.replace(regex, value || '');
  }

  // Create a generated document record
  const { data: generatedDoc, error } = await supabase
    .from('generated_documents')
    .insert({
      template_id: template.id,
      building_id: null, // Will be set if buildingId was provided
      filled_by: 'AI Document Creator',
      filepath: `generated/ai_created_${template.type}_${Date.now()}.docx`,
      placeholder_data: allFields,
      ai_generated: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create generated document record:', error);
  }

  return {
    id: generatedDoc?.id || 'temp_' + Date.now(),
    content: documentContent,
    template: template.name,
    fields: allFields,
    downloadUrl: null, // Would be generated by /api/generate-doc
    createdAt: new Date().toISOString()
  };
}
