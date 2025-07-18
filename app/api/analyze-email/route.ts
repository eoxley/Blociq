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
    console.log("🧠 AI Email Analysis processing...");
    
    const body = await req.json();
    const { messageId, forceReanalyze = false } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    console.log("✅ Valid request received:", { messageId, forceReanalyze });

    // 1. Fetch the email
    const { data: email, error: emailError } = await supabase
      .from('incoming_emails')
      .select(`
        *,
        buildings(name, address),
        units(unit_number, leaseholders(name, email))
      `)
      .eq('message_id', messageId)
      .single();

    if (emailError || !email) {
      console.error("❌ Email not found:", emailError);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // 2. Check if already analyzed (unless force reanalyze)
    if (!forceReanalyze && email.ai_analyzed_at) {
      console.log("📝 Email already analyzed, returning existing data");
      return NextResponse.json({
        success: true,
        analysis: {
          tags: email.tags || [],
          ai_summary: email.ai_summary,
          suggested_action: email.suggested_action,
          suggested_action_type: email.suggested_action_type,
          suggested_template_id: email.suggested_template_id,
          related_unit_id: email.related_unit_id,
          ai_analyzed_at: email.ai_analyzed_at
        }
      });
    }

    // 3. Build context for AI analysis
    const buildingContext = email.buildings ? {
      building_name: email.buildings.name,
      building_address: email.buildings.address
    } : null;

    const unitContext = email.units ? {
      unit_number: email.units.unit_number,
      leaseholders: email.units.leaseholders
    } : null;

    // 4. Create AI prompt for analysis
    const systemPrompt = `You are an expert property management AI assistant specializing in UK leasehold block management. Your job is to analyze incoming emails and provide:

1. **Tags**: Categorize the email with relevant tags (e.g., ["service charge", "maintenance", "complaint", "legal", "finance", "emergency", "routine"])
2. **Summary**: Provide a concise 2-3 sentence summary of the email content
3. **Suggested Action**: Recommend the best next action for the property manager
4. **Action Type**: Categorize the suggested action (generate_template, reply, raise_task, escalate, archive)

Common action types:
- generate_template: When a specific document/letter should be generated
- reply: When a direct email reply is needed
- raise_task: When a maintenance task or work order should be created
- escalate: When the issue needs senior management attention
- archive: When no action is needed

Return your response as a valid JSON object with these exact fields:
{
  "tags": ["tag1", "tag2"],
  "summary": "Brief summary of the email",
  "suggested_action": "Detailed description of what action to take",
  "action_type": "generate_template|reply|raise_task|escalate|archive",
  "template_suggestion": "template name if generate_template",
  "unit_related": true/false
}`;

    const userPrompt = `Please analyze this email for a UK property management company:

**Email Details:**
- From: ${email.from_name || email.from_email}
- Subject: ${email.subject}
- Received: ${new Date(email.received_at).toLocaleDateString()}
- Content: ${email.body}

**Building Context:**
${buildingContext ? JSON.stringify(buildingContext, null, 2) : 'No building context'}

**Unit Context:**
${unitContext ? JSON.stringify(unitContext, null, 2) : 'No unit context'}

**Property Management Context:**
This is a UK leasehold property management company. Common issues include:
- Service charge queries and disputes
- Maintenance requests and complaints
- Lease compliance issues
- Financial matters (ground rent, service charges)
- Legal notices and documentation
- Emergency situations
- Routine administrative matters

Please analyze this email and provide the requested JSON response.`;

    // 5. Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // 6. Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("❌ Failed to parse AI response:", parseError);
      throw new Error('Invalid AI response format');
    }

    // 7. Find relevant template if suggested
    let suggestedTemplateId = null;
    if (analysis.action_type === 'generate_template' && analysis.template_suggestion) {
      const { data: templates } = await supabase
        .from('templates')
        .select('id, name')
        .ilike('name', `%${analysis.template_suggestion}%`)
        .limit(1);

      if (templates && templates.length > 0) {
        suggestedTemplateId = templates[0].id;
      }
    }

    // 8. Update email with analysis results
    const updateData = {
      tags: analysis.tags || [],
      ai_summary: analysis.summary,
      suggested_action: analysis.suggested_action,
      suggested_action_type: analysis.action_type,
      suggested_template_id: suggestedTemplateId,
      ai_analyzed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update(updateData)
      .eq('message_id', messageId);

    if (updateError) {
      console.error("❌ Failed to update email with analysis:", updateError);
      throw new Error('Failed to save analysis results');
    }

    console.log("✅ Email analysis completed successfully");

    return NextResponse.json({
      success: true,
      analysis: {
        ...updateData,
        suggested_template_id: suggestedTemplateId
      }
    });

  } catch (error) {
    console.error('❌ AI Email Analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze email',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 