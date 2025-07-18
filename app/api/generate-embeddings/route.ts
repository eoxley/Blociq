import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 Generating embeddings...");
    
    const body = await req.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // 1. Fetch template data
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error("❌ Template not found:", templateError);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!template.content_text) {
      return NextResponse.json({ error: 'Template has no content text for embedding' }, { status: 400 });
    }

    console.log("📋 Template loaded:", template.name);

    // 2. Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: template.content_text,
      encoding_format: "float"
    });

    const embedding = embeddingResponse.data[0].embedding;

    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

    console.log("🧠 Embedding generated successfully");

    // 3. Store embedding in database
    const { error: insertError } = await supabase
      .from('template_embeddings')
      .upsert({
        template_id: templateId,
        embedding: embedding,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'template_id'
      });

    if (insertError) {
      console.error("❌ Failed to store embedding:", insertError);
      return NextResponse.json({ error: 'Failed to store embedding' }, { status: 500 });
    }

    console.log("✅ Embedding stored successfully");

    return NextResponse.json({
      success: true,
      templateId: templateId,
      templateName: template.name,
      embeddingLength: embedding.length
    });

  } catch (error) {
    console.error('❌ Embedding generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate embedding',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

// GET endpoint to generate embeddings for all templates
export async function GET(req: NextRequest) {
  try {
    console.log("🧠 Generating embeddings for all templates...");

    // 1. Fetch all templates with content_text
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*')
      .not('content_text', 'is', null);

    if (templatesError) {
      console.error("❌ Failed to fetch templates:", templatesError);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    console.log(`📋 Found ${templates.length} templates with content`);

    const results = [];

    // 2. Generate embeddings for each template
    for (const template of templates) {
      try {
        console.log(`🧠 Generating embedding for: ${template.name}`);

        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: template.content_text,
          encoding_format: "float"
        });

        const embedding = embeddingResponse.data[0].embedding;

        if (embedding) {
          // Store embedding
          const { error: insertError } = await supabase
            .from('template_embeddings')
            .upsert({
              template_id: template.id,
              embedding: embedding,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'template_id'
            });

          if (!insertError) {
            results.push({
              templateId: template.id,
              templateName: template.name,
              success: true
            });
            console.log(`✅ Embedding stored for: ${template.name}`);
          } else {
            results.push({
              templateId: template.id,
              templateName: template.name,
              success: false,
              error: insertError.message
            });
            console.log(`❌ Failed to store embedding for: ${template.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing template ${template.name}:`, error);
        results.push({
          templateId: template.id,
          templateName: template.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Completed: ${successCount}/${templates.length} embeddings generated successfully`);

    return NextResponse.json({
      success: true,
      totalTemplates: templates.length,
      successfulEmbeddings: successCount,
      results: results
    });

  } catch (error) {
    console.error('❌ Bulk embedding generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate embeddings',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 