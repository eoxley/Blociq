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

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      status, 
      notes,
      generateSummary = false 
    } = body;

    const updateData: Record<string, unknown> = {};
    
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // If completing inspection and summary is requested, generate AI summary
    if (status === 'Completed' && generateSummary) {
      const { data: inspectionItems } = await supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', id);

      if (inspectionItems && inspectionItems.length > 0) {
        const summary = await generateInspectionSummary(inspectionItems);
        updateData.notes = summary;
      }
    }

    const { data, error } = await supabase
      .from('site_inspections')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        inspection_items (
          id,
          asset_type,
          asset_name,
          status,
          notes,
          location,
          priority
        )
      `)
      .single();

    if (error) {
      console.error('Error updating site inspection:', error);
      return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
    }

    return NextResponse.json({ success: true, inspection: data });

  } catch (error) {
    console.error('Site inspection PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('site_inspections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting site inspection:', error);
      return NextResponse.json({ error: 'Failed to delete inspection' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Site inspection DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateInspectionSummary(inspectionItems: Record<string, unknown>[]): Promise<string> {
  try {
    const itemsText = inspectionItems.map(item => 
      `${item.asset_name} (${item.asset_type}): ${item.status}${item.notes ? ` - ${item.notes}` : ''}`
    ).join('\n');

    const prompt = `As a property manager, provide a concise summary of this site inspection. Focus on any issues found and recommendations for follow-up.

Inspection Items:
${itemsText}

Please provide a professional summary in 2-3 sentences highlighting:
1. Overall inspection status
2. Any critical issues found
3. Recommended next steps

Format as a clear, actionable summary for property management.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional property manager providing concise inspection summaries."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content || 'Inspection completed. Review items for details.';

  } catch (error) {
    console.error('Error generating inspection summary:', error);
    return 'Inspection completed. Review items for details.';
  }
} 