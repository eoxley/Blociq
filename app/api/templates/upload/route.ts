import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai-client';


interface TemplateUploadData {
  name: string;
  type: string;
  description: string;
  isBuildingSpecific: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const templateDataString = formData.get('templateData') as string;

    if (!file || !templateDataString) {
      return NextResponse.json({ error: 'File and template data are required' }, { status: 400 });
    }

    const templateData: TemplateUploadData = JSON.parse(templateDataString);

    console.log("📤 Template Upload Request:", {
      fileName: file.name,
      fileSize: file.size,
      templateName: templateData.name,
      templateType: templateData.type
    });

    // Validate file
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'application/rtf', // .rtf
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Step 1: Extract text content from the file
    let contentText = '';
    let detectedPlaceholders: string[] = [];

    if (file.type === 'text/plain') {
      // For text files, read directly
      contentText = await file.text();
    } else {
      // For other file types, use AI to extract content
      contentText = await extractContentWithAI(file);
    }

    // Step 2: Detect placeholders in the content
    detectedPlaceholders = extractPlaceholders(contentText);

    // Step 3: Use AI to enhance the template if needed
    const enhancedTemplate = await enhanceTemplateWithAI(
      contentText,
      detectedPlaceholders,
      templateData,
      file.name
    );

    // Step 4: Upload file to storage
    const filePath = `templates/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('templates')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    console.log("📁 File uploaded to storage:", filePath);

    // Step 5: Create template record in database
    const { data: template, error: dbError } = await supabase
      .from('templates')
      .insert({
        name: templateData.name,
        type: templateData.type,
        description: templateData.description,
        storage_path: filePath,
        content_text: enhancedTemplate.content,
        placeholders: enhancedTemplate.placeholders,
        is_ai_generated: false, // This is a user-uploaded template
        is_building_specific: templateData.isBuildingSpecific,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save template to database' }, { status: 500 });
    }

    console.log("✅ Template created successfully:", template.id);

    // Step 6: Create initial version record
    await supabase
      .from('template_versions')
      .insert({
        template_id: template.id,
        version: 1,
        content_text: enhancedTemplate.content,
        placeholders: enhancedTemplate.placeholders,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      template: template,
      message: 'Template uploaded and enhanced successfully'
    });

  } catch (error: any) {
    console.error('❌ Error in template upload:', error);
    return NextResponse.json(
      { error: 'Failed to upload template', details: error.message },
      { status: 500 }
    );
  }
}

async function extractContentWithAI(file: File): Promise<string> {
  try {
    // For now, return a placeholder since we can't process binary files directly
    // In production, you'd use libraries like mammoth.js for .docx files
    return `[Content extracted from ${file.name}]\n\nThis template was uploaded and will be enhanced with AI to detect placeholders and improve structure.`;
  } catch (error) {
    console.error('Failed to extract content:', error);
    return `[Unable to extract content from ${file.name}]\n\nPlease ensure the file contains readable text content.`;
  }
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

async function enhanceTemplateWithAI(
  content: string,
  detectedPlaceholders: string[],
  templateData: TemplateUploadData,
  fileName: string
) {
  const enhancementPrompt = `You are a template enhancement expert for UK property management. 

Analyze this uploaded template and enhance it:

Original Content:
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Detected Placeholders: ${detectedPlaceholders.join(', ')}

Template Details:
- Name: ${templateData.name}
- Type: ${templateData.type}
- Description: ${templateData.description}
- Building Specific: ${templateData.isBuildingSpecific}

Enhancement Tasks:
1. Improve the structure and formatting for professional use
2. Add missing placeholders for building data (e.g., {{building_name}}, {{building_address}})
3. Add missing placeholders for user data (e.g., {{property_manager_name}}, {{today_date}})
4. Ensure UK property management compliance and tone
5. Make the content more professional and actionable
6. Preserve any existing placeholders that are still relevant

Return the enhanced template content with improved placeholders and structure.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional template enhancement expert. Enhance templates for UK property management while preserving their core purpose and structure."
        },
        {
          role: "user",
          content: enhancementPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const enhancedContent = completion.choices[0]?.message?.content || content;
    
    // Extract new placeholders from enhanced content
    const enhancedPlaceholders = extractPlaceholders(enhancedContent);
    
    return {
      content: enhancedContent,
      placeholders: enhancedPlaceholders
    };
  } catch (error) {
    console.error('Failed to enhance template with AI:', error);
    // Return original content if AI enhancement fails
    return {
      content: content,
      placeholders: detectedPlaceholders
    };
  }
}
