// app/api/outlook/enrich/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface EnrichmentRequest {
  senderEmail: string;
  subject: string;
  bodyPreview: string;
  conversationId?: string;
}

export interface EnrichmentResult {
  residentName: string | null;
  unitLabel: string | null;
  building: { id: string; name: string } | null;
  facts: {
    fraLast?: string | null;
    fraNext?: string | null;
    fireDoorLast?: string | null;
    alarmServiceLast?: string | null;
    eicrLast?: string | null;
    eicrNext?: string | null;
    gasLast?: string | null;
    gasNext?: string | null;
    asbestosLast?: string | null;
    asbestosNext?: string | null;
    openLeakTicketRef?: string | null;
    emergencyContact?: string | null;
  };
  industryKnowledge: Array<{
    text: string;
    category: string;
    source: string;
  }>;
  founderGuidance: Array<{
    title: string;
    content: string;
    priority: number;
  }>;
  topic: 'leak' | 'fire' | 'compliance' | 'general';
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrichmentRequest = await request.json();
    const { senderEmail, subject, bodyPreview } = body;

    if (!senderEmail) {
      return NextResponse.json({
        success: false,
        error: 'Sender email is required'
      }, { status: 400 });
    }

    // Use service role for server-side data access
    const supabase = await createClient();

    // Step 1: Resolve resident -> unit -> building
    let residentName: string | null = null;
    let unitLabel: string | null = null;
    let building: { id: string; name: string } | null = null;

    try {
      // Find leaseholder by email
      const { data: leaseholders } = await supabase
        .from('leaseholders')
        .select(`
          first_name,
          last_name,
          units (
            id,
            unit_number,
            buildings (
              id,
              name
            )
          )
        `)
        .eq('email', senderEmail.toLowerCase())
        .limit(1);

      if (leaseholders && leaseholders.length > 0) {
        const leaseholder = leaseholders[0];
        residentName = `${leaseholder.first_name || ''} ${leaseholder.last_name || ''}`.trim() || null;

        if (leaseholder.units && leaseholder.units.length > 0) {
          const unit = leaseholder.units[0];
          unitLabel = unit.unit_number;

          if (unit.buildings) {
            building = {
              id: unit.buildings.id,
              name: unit.buildings.name
            };
          }
        }
      }
    } catch (error) {
      console.warn('Error resolving resident/unit/building:', error);
    }

    // Step 2: Determine topic from content
    const topic = detectTopic(subject, bodyPreview);

    // Step 3: Pull relevant facts based on topic and building
    const facts: EnrichmentResult['facts'] = {};

    if (building) {
      try {
        switch (topic) {
          case 'leak':
            await enrichLeakFacts(supabase, building.id, facts);
            break;
          case 'fire':
            await enrichFireFacts(supabase, building.id, facts);
            break;
          case 'compliance':
            await enrichComplianceFacts(supabase, building.id, facts);
            break;
          default:
            // For general topics, get basic building info
            await enrichGeneralFacts(supabase, building.id, facts);
            break;
        }
      } catch (error) {
        console.warn('Error enriching facts:', error);
      }
    }

    // Step 4: Enrich with industry knowledge from PDF storage bucket
    const industryKnowledge: EnrichmentResult['industryKnowledge'] = [];
    try {
      const searchTerms = getSearchTermsForTopic(topic, subject, bodyPreview);
      const { data: knowledgeChunks } = await supabase
        .from('industry_knowledge_chunks')
        .select(`
          chunk_text,
          industry_knowledge_documents!inner(
            title,
            category,
            subcategory
          )
        `)
        .or(searchTerms.map(term => `chunk_text.ilike.%${term}%`).join(','))
        .limit(5)
        .order('created_at', { ascending: false });

      if (knowledgeChunks) {
        industryKnowledge.push(...knowledgeChunks.map(chunk => ({
          text: chunk.chunk_text,
          category: chunk.industry_knowledge_documents.category,
          source: chunk.industry_knowledge_documents.title
        })));
      }
    } catch (error) {
      console.warn('Error enriching industry knowledge:', error);
    }

    // Step 5: Enrich with founder guidance
    const founderGuidance: EnrichmentResult['founderGuidance'] = [];
    try {
      const topicHints = getFounderHintsForTopic(topic);
      const { data: guidance } = await supabase
        .from('founder_knowledge')
        .select('title, content, priority')
        .eq('is_active', true)
        .overlaps('contexts', ['core', 'complaints'])
        .or(topicHints.map(hint => `tags.cs.{${hint}}`).join(','))
        .order('priority', { ascending: false })
        .limit(3);

      if (guidance) {
        founderGuidance.push(...guidance);
      }
    } catch (error) {
      console.warn('Error enriching founder guidance:', error);
    }

    const result: EnrichmentResult = {
      residentName,
      unitLabel,
      building,
      facts,
      industryKnowledge,
      founderGuidance,
      topic
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in enrichment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to enrich context'
    }, { status: 500 });
  }
}

function detectTopic(subject: string, bodyPreview: string): 'leak' | 'fire' | 'compliance' | 'general' {
  const content = `${subject} ${bodyPreview}`.toLowerCase();

  // Leak/water-related keywords
  const leakKeywords = ['leak', 'water', 'ingress', 'damp', 'flooding', 'pipe', 'plumbing', 'drip', 'wet'];
  if (leakKeywords.some(keyword => content.includes(keyword))) {
    return 'leak';
  }

  // Fire safety keywords
  const fireKeywords = ['fire', 'door', 'alarm', 'smoke', 'fra', 'fire risk assessment', 'fire safety', 'emergency exit'];
  if (fireKeywords.some(keyword => content.includes(keyword))) {
    return 'fire';
  }

  // Compliance keywords
  const complianceKeywords = ['eicr', 'electrical', 'gas', 'asbestos', 'compliance', 'certificate', 'inspection', 'test'];
  if (complianceKeywords.some(keyword => content.includes(keyword))) {
    return 'compliance';
  }

  return 'general';
}

async function enrichLeakFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  // Get last leak ticket
  try {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('reference, created_at')
      .eq('building_id', buildingId)
      .ilike('title', '%leak%')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tickets && tickets.length > 0) {
      facts.openLeakTicketRef = tickets[0].reference;
    }
  } catch (error) {
    console.warn('Error fetching leak tickets:', error);
  }

  // Get emergency contact
  try {
    const { data: building } = await supabase
      .from('buildings')
      .select('emergency_contact')
      .eq('id', buildingId)
      .single();

    if (building?.emergency_contact) {
      facts.emergencyContact = building.emergency_contact;
    }
  } catch (error) {
    console.warn('Error fetching emergency contact:', error);
  }
}

async function enrichFireFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  try {
    const { data: compliance } = await supabase
      .from('building_compliance_assets')
      .select('asset_type, last_inspection_date, next_inspection_date')
      .eq('building_id', buildingId)
      .in('asset_type', ['fire_risk_assessment', 'fire_door', 'fire_alarm'])
      .order('last_inspection_date', { ascending: false });

    if (compliance) {
      compliance.forEach(item => {
        switch (item.asset_type) {
          case 'fire_risk_assessment':
            facts.fraLast = item.last_inspection_date;
            facts.fraNext = item.next_inspection_date;
            break;
          case 'fire_door':
            facts.fireDoorLast = item.last_inspection_date;
            break;
          case 'fire_alarm':
            facts.alarmServiceLast = item.last_inspection_date;
            break;
        }
      });
    }
  } catch (error) {
    console.warn('Error fetching fire compliance:', error);
  }
}

async function enrichComplianceFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  try {
    const { data: compliance } = await supabase
      .from('building_compliance_assets')
      .select('asset_type, last_inspection_date, next_inspection_date')
      .eq('building_id', buildingId)
      .in('asset_type', ['eicr', 'gas_safety', 'asbestos'])
      .order('last_inspection_date', { ascending: false });

    if (compliance) {
      compliance.forEach(item => {
        switch (item.asset_type) {
          case 'eicr':
            facts.eicrLast = item.last_inspection_date;
            facts.eicrNext = item.next_inspection_date;
            break;
          case 'gas_safety':
            facts.gasLast = item.last_inspection_date;
            facts.gasNext = item.next_inspection_date;
            break;
          case 'asbestos':
            facts.asbestosLast = item.last_inspection_date;
            break;
        }
      });
    }
  } catch (error) {
    console.warn('Error fetching compliance assets:', error);
  }
}

async function enrichGeneralFacts(supabase: any, buildingId: string, facts: EnrichmentResult['facts']) {
  // For general inquiries, get basic emergency info
  try {
    const { data: building } = await supabase
      .from('buildings')
      .select('emergency_contact')
      .eq('id', buildingId)
      .single();

    if (building?.emergency_contact) {
      facts.emergencyContact = building.emergency_contact;
    }
  } catch (error) {
    console.warn('Error fetching general facts:', error);
  }
}

function getSearchTermsForTopic(topic: string, subject: string, bodyPreview: string): string[] {
  const content = `${subject} ${bodyPreview}`.toLowerCase();
  const baseTerms = [topic];

  switch (topic) {
    case 'leak':
      return [...baseTerms, 'water damage', 'ingress', 'flooding', 'pipe', 'plumbing', 'emergency', 'insurance'];
    case 'fire':
      return [...baseTerms, 'fire safety', 'fra', 'fire door', 'alarm', 'emergency exit', 'evacuation', 'building safety'];
    case 'compliance':
      return [...baseTerms, 'eicr', 'electrical', 'gas safety', 'asbestos', 'inspection', 'certificate', 'regulation'];
    default:
      // Extract keywords from content for general topics
      const keywords = content.match(/\b\w{4,}\b/g) || [];
      return [...baseTerms, ...keywords.slice(0, 3)];
  }
}

function getFounderHintsForTopic(topic: string): string[] {
  switch (topic) {
    case 'leak':
      return ['leaks', 'water_damage', 'insurance', 'emergency'];
    case 'fire':
      return ['fire_safety', 'compliance', 'emergency'];
    case 'compliance':
      return ['compliance', 'safety', 'regulations'];
    default:
      return ['general', 'property_management'];
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}