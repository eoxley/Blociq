import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { replacePlaceholdersInDocx } from '@/lib/replacePlaceholders';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("📄 Generating document...");
    
    const body = await req.json();
    const { templateId, buildingId, placeholderData, aiGenerated = false } = body;

    // Validate required parameters
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    if (!placeholderData) {
      return NextResponse.json({ error: 'Placeholder data is required' }, { status: 400 });
    }

    console.log("✅ Valid request received:", { templateId, buildingId, aiGenerated });

    // 1. Fetch template from database
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error("❌ Template not found:", templateError);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log("📋 Template loaded:", template.name);

    // 2. Download template file from storage
    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('templates')
      .download(template.storage_path);

    if (downloadError || !templateFile) {
      console.error("❌ Failed to download template:", downloadError);
      return NextResponse.json({ error: 'Failed to download template file' }, { status: 500 });
    }

    console.log("📥 Template file downloaded");

    // 3. Replace placeholders in the document
    const processedDocx = await replacePlaceholdersInDocx(templateFile, placeholderData, template.type);
    
    console.log("🔧 Placeholders replaced successfully");

    // 4. Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${template.name.replace(/\s+/g, '_')}_${timestamp}.docx`;
    const filePath = `generated/${filename}`;

    // 5. Upload processed document to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated')
      .upload(filePath, processedDocx, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Failed to upload generated document:", uploadError);
      return NextResponse.json({ error: 'Failed to save generated document' }, { status: 500 });
    }

    console.log("📤 Generated document uploaded");

    // 6. Get public URL for the generated document
    const { data: urlData } = supabase.storage
      .from('generated')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 7. Log the generation to database
    const { error: logError } = await supabase
      .from('generated_documents')
      .insert({
        template_id: templateId,
        building_id: buildingId,
        filled_by: 'system', // TODO: Get actual user ID
        filepath: filePath,
        placeholder_data: placeholderData, // ✅ NEW: Store the data used
        ai_generated: aiGenerated, // ✅ NEW: Track if AI was used
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error("⚠️ Failed to log generation:", logError);
      // Don't fail the request, just log the error
    }

    console.log("✅ Document generation completed successfully");

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      filename: filename,
      templateName: template.name,
      aiGenerated: aiGenerated
    });

  } catch (error) {
    console.error('❌ Document generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate document',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 