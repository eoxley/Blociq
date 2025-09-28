import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = "nodejs";

interface AISuggestion {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  source: 'AI_Compliance' | 'AI_Communication' | 'AI_Maintenance' | 'AI_Industry';
  confidence: number;
  reasoning: string;
  suggestedDueDate?: string;
  relatedDocuments?: string[];
  contractorSuggestion?: {
    type: string;
    estimatedCost?: number;
    urgency: string;
  };
}

interface BuildingContext {
  building: any;
  compliance: any[];
  recentCommunications: any[];
  upcomingEvents: any[];
  currentActions: any[];
  documents: any[];
}

async function gatherBuildingContext(buildingId: string): Promise<BuildingContext> {
  const supabase = createServiceClient();

  try {
    const [
      buildingResponse,
      complianceResponse,
      emailsResponse,
      eventsResponse,
      actionsResponse,
      documentsResponse
    ] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase.from('building_compliance_assets')
        .select(`
          *,
          compliance_assets:asset_id (
            name,
            category,
            frequency_months,
            is_required
          )
        `)
        .eq('building_id', buildingId),
      supabase.from('incoming_emails')
        .select('*')
        .eq('building_id', buildingId)
        .order('received_at', { ascending: false })
        .limit(10),
      supabase.from('property_events')
        .select('*')
        .eq('building_id', buildingId)
        .gte('start_time', new Date().toISOString())
        .limit(5),
      supabase.from('building_action_tracker')
        .select('*')
        .eq('building_id', buildingId)
        .eq('completed', false),
      supabase.from('building_documents')
        .select('*')
        .eq('building_id', buildingId)
        .limit(10)
    ]);

    return {
      building: buildingResponse.data || {},
      compliance: complianceResponse.data || [],
      recentCommunications: emailsResponse.data || [],
      upcomingEvents: eventsResponse.data || [],
      currentActions: actionsResponse.data || [],
      documents: documentsResponse.data || []
    };
  } catch (error) {
    console.error('Error gathering building context:', error);
    return {
      building: {},
      compliance: [],
      recentCommunications: [],
      upcomingEvents: [],
      currentActions: [],
      documents: []
    };
  }
}

function buildSuggestionPrompt(context: BuildingContext): string {
  const today = new Date().toLocaleDateString('en-GB');
  const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');

  return `
As a property management AI expert, analyze this building's current status and suggest actionable next steps. Focus on urgent compliance issues, overdue tasks, and proactive maintenance.

Building: ${context.building.name || 'Unknown Building'}
Current Date: ${today}

COMPLIANCE STATUS:
${context.compliance.length > 0 ?
  context.compliance.map(asset => {
    const complianceAsset = asset.compliance_assets;
    const status = asset.status || 'unknown';
    const dueDate = asset.next_due_date || 'No due date';
    const isOverdue = asset.next_due_date && new Date(asset.next_due_date) < new Date();

    return `- ${complianceAsset?.name || 'Unknown Asset'}: ${status}${isOverdue ? ' (OVERDUE)' : ''} (Due: ${dueDate})`;
  }).join('\n') :
  'No compliance data available'
}

RECENT COMMUNICATIONS (Last 10):
${context.recentCommunications.length > 0 ?
  context.recentCommunications.slice(0, 5).map(email =>
    `- From: ${email.from_email}, Subject: ${email.subject}`
  ).join('\n') :
  'No recent communications'
}

CURRENT ACTIONS:
${context.currentActions.length > 0 ?
  context.currentActions.map(action => {
    const isOverdue = action.due_date && new Date(action.due_date) < new Date();
    return `- ${action.item_text} (Priority: ${action.priority}, Due: ${action.due_date || 'No due date'}${isOverdue ? ' - OVERDUE' : ''})`;
  }).join('\n') :
  'No current actions'
}

BUILDING INFO:
- Type: ${context.building.construction_type || 'Unknown'}
- Age: ${context.building.building_age || 'Unknown'}
- Units: ${context.building.unit_count || 'Unknown'}
- Floors: ${context.building.total_floors || 'Unknown'}

Based on this context, suggest 3-5 specific, actionable next steps that are realistic and urgent. Prioritize:
1. Overdue compliance items
2. Safety-critical issues
3. Seasonal maintenance (current season)
4. Communication follow-ups
5. Preventive maintenance

For each suggestion, provide:
- Clear, actionable description (under 100 characters)
- Priority based on urgency and safety impact
- Realistic due date within next 30 days
- Brief reasoning (under 150 characters)
- Contractor type if external help needed

Respond with ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "text": "Schedule annual fire safety inspection",
      "priority": "high",
      "reasoning": "Fire risk assessment is overdue by 2 months",
      "suggestedDueDate": "${oneMonthFromNow}",
      "contractorSuggestion": {
        "type": "Fire Safety Specialist",
        "urgency": "Within 2 weeks"
      }
    }
  ]
}
`;
}

async function callAskBlocIQ(prompt: string, buildingId: string): Promise<string> {
  try {
    console.log('🤖 Calling Ask BlocIQ for suggestions...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ask-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: prompt,
        buildingId: buildingId,
        context: 'action_tracker_suggestions'
      }),
    });

    if (!response.ok) {
      throw new Error(`Ask BlocIQ API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Error calling Ask BlocIQ:', error);
    throw error;
  }
}

function parseAISuggestions(aiResponse: string): AISuggestion[] {
  try {
    console.log('🔍 Parsing AI response for suggestions...');

    let cleanedResponse = aiResponse.trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[1];
    }

    // Try to find JSON object in the response
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
    }

    const parsed = JSON.parse(cleanedResponse);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      console.error('Invalid AI response format - no suggestions array');
      return [];
    }

    // Add IDs and validate suggestions
    return parsed.suggestions
      .filter((suggestion: any) => suggestion.text && suggestion.priority && suggestion.reasoning)
      .map((suggestion: any, index: number) => ({
        id: `ai-suggestion-${Date.now()}-${index}`,
        text: suggestion.text,
        priority: suggestion.priority,
        source: determineSource(suggestion),
        confidence: 0.8, // Default confidence
        reasoning: suggestion.reasoning,
        suggestedDueDate: suggestion.suggestedDueDate || null,
        relatedDocuments: suggestion.relatedDocuments || [],
        contractorSuggestion: suggestion.contractorSuggestion || null
      })) as AISuggestion[];

  } catch (error) {
    console.error('Error parsing AI suggestions:', error);
    console.log('Raw AI response:', aiResponse);
    return [];
  }
}

function determineSource(suggestion: any): AISuggestion['source'] {
  const text = suggestion.text.toLowerCase();
  const reasoning = suggestion.reasoning.toLowerCase();

  if (text.includes('compliance') || text.includes('certificate') || text.includes('inspection') || reasoning.includes('overdue')) {
    return 'AI_Compliance';
  }
  if (text.includes('email') || text.includes('follow up') || text.includes('contact')) {
    return 'AI_Communication';
  }
  if (text.includes('maintenance') || text.includes('repair') || text.includes('service')) {
    return 'AI_Maintenance';
  }
  return 'AI_Industry';
}

export async function POST(request: NextRequest) {
  try {
    const { buildingId } = await request.json();

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

    console.log('🏢 Generating AI suggestions for building:', buildingId);

    // Gather comprehensive building context
    const context = await gatherBuildingContext(buildingId);

    // Build AI prompt with context
    const prompt = buildSuggestionPrompt(context);

    // Get AI suggestions
    const aiResponse = await callAskBlocIQ(prompt, buildingId);

    // Parse and structure suggestions
    const suggestions = parseAISuggestions(aiResponse);

    console.log(`✅ Generated ${suggestions.length} AI suggestions`);

    return NextResponse.json({
      suggestions,
      context: {
        complianceItems: context.compliance.length,
        currentActions: context.currentActions.length,
        recentEmails: context.recentCommunications.length
      }
    });

  } catch (error) {
    console.error('Error generating AI suggestions:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate suggestions',
        suggestions: [],
        fallback: true
      },
      { status: 200 } // Return 200 with fallback to avoid breaking the UI
    );
  }
}