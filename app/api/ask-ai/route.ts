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
    console.log("🤖 AI Assistant processing request...");
    
    const body = await req.json();
    const { prompt, buildingId, templateId, action } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log("✅ Valid request received:", { prompt, buildingId, templateId, action });

    let contextData: Record<string, unknown> = {};
    let templateData = null;

    // 1. Load building data if buildingId provided
    if (buildingId) {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          *,
          units (
            id,
            unit_number,
            leaseholders (
              id,
              name,
              email,
              phone
            )
          )
        `)
        .eq('id', buildingId)
        .single();

      if (!buildingError && building) {
        contextData = {
          ...contextData,
          building_name: building.name,
          building_address: building.address,
          total_units: building.units?.length || 0,
          leaseholders: building.units?.map((unit: Record<string, unknown>) => ({
            unit_number: unit.unit_number,
            leaseholders: unit.leaseholders
          })) || []
        };
      }
    }

    // 2. Load template data if templateId provided
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!templateError && template) {
        templateData = template;
        contextData = {
          ...contextData,
          template_name: template.name,
          template_type: template.type,
          template_content: template.content_text,
          available_placeholders: template.placeholders
        };
      }
    }

    // 3. If no specific template provided, search for relevant templates using semantic search
    if (!templateId && action !== 'create_new') {
      // First try semantic search if embeddings are available
      let templates: Record<string, unknown>[] = [];
      
      try {
        // Generate embedding for the search query
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: prompt,
          encoding_format: "float"
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;

        if (queryEmbedding) {
          // Try vector similarity search
          const { data: vectorResults, error: vectorError } = await supabase.rpc(
            'match_templates',
            {
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: 5
            }
          );

          if (!vectorError && vectorResults && vectorResults.length > 0) {
            templates = vectorResults;
          }
        }
      } catch (embeddingError) {
        console.warn('Semantic search failed, falling back to text search:', embeddingError);
      }

      // Fallback to text search if semantic search didn't work
      if (templates.length === 0) {
        const { data: textResults, error: searchError } = await supabase
          .from('templates')
          .select('*')
          .or(`content_text.ilike.%${prompt.split(' ').slice(0, 3).join(' ')}%,name.ilike.%${prompt.split(' ').slice(0, 3).join(' ')}%`)
          .limit(5);

        if (!searchError && textResults) {
          templates = textResults;
        }
      }

      if (templates.length > 0) {
        contextData = {
          ...contextData,
          relevant_templates: templates.map((t: Record<string, unknown>) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            content: t.content_text,
            placeholders: t.placeholders,
            similarity_score: t.similarity_score || null
          }))
        };
      }
    }

    // 4. Build the AI prompt based on the action
    let systemPrompt = '';
    let userPrompt = '';

    // Check if this is a Section 20 threshold query
    const isSection20Query = prompt.toLowerCase().includes('section 20') || 
                            prompt.toLowerCase().includes('s20') ||
                            prompt.toLowerCase().includes('threshold') ||
                            prompt.toLowerCase().includes('consultation') ||
                            prompt.toLowerCase().includes('apportionment');

    if (isSection20Query) {
      systemPrompt = `You are a property management expert specializing in Section 20 consultation requirements for UK leasehold properties. You can calculate thresholds and provide guidance on consultation requirements. You can also analyze Excel data with multiple leaseholders.`;
      
      userPrompt = `The user is asking about Section 20 consultation thresholds: "${prompt}"

Building Context:
${JSON.stringify(contextData, null, 2)}

Please:
1. If apportionment data is provided (single or multiple leaseholders), calculate the Section 20 threshold using the correct formula
2. For residential-only buildings: threshold = 250 / (highest_apportionment / 100)
3. For mixed-use buildings: threshold = (250 / (highest_apportionment / 100)) × (residential_pct / 100)
4. If multiple leaseholders are provided, analyze each one and identify which trigger consultation
5. Provide clear guidance on whether consultation is required
6. Suggest next steps if consultation is needed
7. If Excel data is mentioned, suggest using the bulk upload feature at /tools/section-20-threshold

If no apportionment data is provided, ask the user to provide:
- Highest residential apportionment percentage, OR
- Upload an Excel file with columns: Unit, Leaseholder Name, Apportionment %

For bulk analysis, explain that they can:
- Download a template from the calculator page
- Upload their Excel file for instant analysis
- Get individual thresholds for each leaseholder
- See which units require consultation
- Download results as Excel

Format your response clearly with calculations, practical advice, and next steps.`;

    } else {
      switch (action) {
        case 'rewrite':
          if (!templateData) {
            return NextResponse.json({ error: 'Template ID required for rewrite action' }, { status: 400 });
          }
          systemPrompt = `You are a professional block manager drafting legally compliant letters and notices for UK leasehold properties. You have access to building data and template content.`;
          userPrompt = `Please rewrite the following template content to address this specific request: "${prompt}"

Template Content:
${templateData.content_text}

Available Placeholders: ${templateData.placeholders?.join(', ')}

Building Context:
${JSON.stringify(contextData, null, 2)}

Please provide a rewritten version that:
1. Maintains the same structure and placeholders
2. Addresses the specific request
3. Remains legally compliant
4. Is professional and clear

Return only the rewritten content with placeholders intact.`;

          break;

        case 'search':
          systemPrompt = `You are an AI assistant helping to find the most relevant communication templates for UK leasehold block management.`;
          userPrompt = `Based on this request: "${prompt}"

Available Templates:
${contextData.relevant_templates ? JSON.stringify(contextData.relevant_templates, null, 2) : 'No templates found'}

Building Context:
${JSON.stringify(contextData, null, 2)}

Please provide:
1. The best matching template(s) for this request
2. Why each template is suitable
3. Any modifications needed
4. A direct link to the template (format: /communications/templates/[template_id])
5. Suggested placeholder values based on the building context

Format your response as a structured recommendation.`;

          break;

        case 'create_new':
          systemPrompt = `You are a professional block manager creating new communication templates for UK leasehold properties.`;
          userPrompt = `Create a new template based on this request: "${prompt}"

Building Context:
${JSON.stringify(contextData, null, 2)}

Please create a professional template that:
1. Uses appropriate placeholders in {{placeholder_name}} format
2. Is legally compliant for UK leasehold
3. Includes all necessary sections
4. Is clear and professional
5. Suggests a template name and type

Return the template content with placeholders and metadata.`;

          break;

        default:
          systemPrompt = `You are a professional block manager assistant helping with UK leasehold communications.`;
          userPrompt = `Request: "${prompt}"

Available Context:
${JSON.stringify(contextData, null, 2)}

Please provide helpful guidance on how to handle this request, including:
1. Recommended templates to use (with links)
2. Key information needed
3. Legal considerations
4. Best practices for UK leasehold management
5. Next steps for document generation`;

          break;
      }
    }

    // 5. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log("✅ AI response generated successfully");

    return NextResponse.json({
      success: true,
      response: aiResponse,
      context: contextData,
      action: action,
      templateId: templateId,
      buildingId: buildingId,
      suggestedTemplates: contextData.relevant_templates || []
    });

  } catch (error) {
    console.error('❌ AI Assistant error:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 