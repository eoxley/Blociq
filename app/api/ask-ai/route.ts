// ✅ SMART BLOCIQ BUILDING CONTEXT API [2025-01-15]
// - Enhanced building detection from prompts
// - Comprehensive compliance and todo context
// - Smart context assembly with metadata
// - Proper error handling and logging

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/ai/systemPrompt';
import { enhanceAIResponse, getResponseByTopic } from '@/lib/ai/responseEnhancer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContextSection {
  title: string;
  content: string;
  hasData: boolean;
}

interface BuildingContext {
  building: any;
  units: any[];
  leaseholders: any[];
  compliance: any[];
  majorWorks: any[];
  siteStaff: any[];
  documents: any[];
  events: any[];
  relatedEmail?: any;
  emails: any[];
  tasks: any[];
}

export async function POST(req: NextRequest) {
  try {
    const { question, buildingId, relatedEmailId, tone = 'default' } = await req.json();

    if (!buildingId) {
      return NextResponse.json({ 
        error: 'Building ID is required' 
      }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // 🏗️ Build comprehensive context
    const context = await buildCompleteContext(supabase, buildingId, relatedEmailId);
    
    // 🧠 Generate AI response with enhanced context
    const aiResponse = await generateAIResponse(question, context, tone);
    
    // 🎯 Enhance response using our improved system
    const enhancedResponse = enhanceAIResponse(aiResponse, detectTopic(question), tone);

    return NextResponse.json({
      response: enhancedResponse.response,
      nextSteps: enhancedResponse.nextSteps,
      legalContext: enhancedResponse.legalContext,
      keyPoints: enhancedResponse.keyPoints,
      context: {
        building: context.building?.name,
        unitsCount: context.units?.length || 0,
        complianceItems: context.compliance?.length || 0,
        majorWorksCount: context.majorWorks?.length || 0,
        documentsCount: context.documents?.length || 0,
        eventsCount: context.events?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Ask AI Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request' 
    }, { status: 500 });
  }
}

async function buildCompleteContext(supabase: any, buildingId: string, relatedEmailId?: string): Promise<BuildingContext> {
  const context: BuildingContext = {
    building: null,
    units: [],
    leaseholders: [],
    compliance: [],
    majorWorks: [],
    siteStaff: [],
    documents: [],
    events: [],
    emails: [],
    tasks: []
  };

  // 🏢 1. Building Information
  try {
    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single();

    if (!error && building) {
      context.building = building;
    }
  } catch (error) {
    console.warn('Could not fetch building data:', error);
  }

  // 📦 2. Units and Leaseholders
  try {
    const { data: units, error } = await supabase
      .from('units')
      .select(`
        *,
        leaseholders (
          id,
          name,
          email,
          phone,
          emergency_contact
        )
      `)
      .eq('building_id', buildingId)
      .order('unit_number');

    if (!error && units) {
      context.units = units;
      context.leaseholders = units
        .map(u => u.leaseholders)
        .filter(Boolean);
    }
  } catch (error) {
    console.warn('Could not fetch units/leaseholders:', error);
  }

  // ✅ 3. Compliance and Safety
  try {
    const { data: compliance, error } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          name,
          description,
          recommended_frequency,
          legal_requirement
        )
      `)
      .eq('building_id', buildingId)
      .order('next_due_date', { ascending: true });

    if (!error && compliance) {
      context.compliance = compliance;
    }
  } catch (error) {
    console.warn('Could not fetch compliance data:', error);
  }

  // 🛠️ 4. Major Works Projects
  try {
    const { data: majorWorks, error } = await supabase
      .from('major_works_projects')
      .select('*')
      .eq('building_id', buildingId)
      .order('start_date', { ascending: false });

    if (!error && majorWorks) {
      context.majorWorks = majorWorks;
    }
  } catch (error) {
    console.warn('Could not fetch major works:', error);
  }

  // 👷 5. Site Staff
  try {
    const { data: staff, error } = await supabase
      .from('site_staff')
      .select('*')
      .eq('building_id', buildingId);

    if (!error && staff) {
      context.siteStaff = staff;
    }
  } catch (error) {
    console.warn('Could not fetch site staff:', error);
  }

  // 📁 6. Building Documents
  try {
    const { data: documents, error } = await supabase
      .from('building_documents')
      .select('*')
      .eq('building_id', buildingId)
      .order('uploaded_at', { ascending: false });

    if (!error && documents) {
      context.documents = documents;
    }
  } catch (error) {
    console.warn('Could not fetch documents:', error);
  }

  // 🗓️ 7. Calendar Events
  try {
    const { data: events, error } = await supabase
      .from('property_events')
      .select('*')
      .eq('building_id', buildingId)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });

    if (!error && events) {
      context.events = events;
    }
  } catch (error) {
    console.warn('Could not fetch events:', error);
  }

  // 📬 8. Recent Emails
  try {
    const { data: emails, error } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('building_id', buildingId)
      .order('received_at', { ascending: false })
      .limit(10);

    if (!error && emails) {
      context.emails = emails;
    }
  } catch (error) {
    console.warn('Could not fetch emails:', error);
  }

  // 📋 9. Building Tasks
  try {
    const { data: tasks, error } = await supabase
      .from('building_todos')
      .select('*')
      .eq('building_id', buildingId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true });

    if (!error && tasks) {
      context.tasks = tasks;
    }
  } catch (error) {
    console.warn('Could not fetch tasks:', error);
  }

  // 📧 10. Related Email (if specified)
  if (relatedEmailId) {
    try {
      const { data: email, error } = await supabase
        .from('incoming_emails')
        .select('*')
        .eq('id', relatedEmailId)
        .single();

      if (!error && email) {
        context.relatedEmail = email;
      }
    } catch (error) {
      console.warn('Could not fetch related email:', error);
    }
  }

  return context;
}

function formatContextSections(context: BuildingContext): string[] {
  const sections: string[] = [];

  // 🏢 Building Information
  if (context.building) {
    sections.push(`**Building Information:**
- Name: ${context.building.name}
- Structure Type: ${context.building.structure_type || 'Not specified'}
- Address: ${context.building.address || 'Not specified'}
- High Risk Building: ${context.building.is_hrb ? 'Yes' : 'No'}
- Total Units: ${context.units?.length || 0}`);
  } else {
    sections.push('**Building Information:** Data not available');
  }

  // 📦 Units and Leaseholders
  if (context.units?.length) {
    const unitInfo = context.units.map(unit => {
      const leaseholder = unit.leaseholders;
      return `- Flat ${unit.unit_number}: ${leaseholder?.name || 'Leaseholder unknown'}${leaseholder?.email ? ` (${leaseholder.email})` : ''}`;
    }).join('\n');
    
    sections.push(`**Units and Leaseholders:**
${unitInfo}`);
  } else {
    sections.push('**Units and Leaseholders:** No data available');
  }

  // ✅ Compliance Status
  if (context.compliance?.length) {
    const overdue = context.compliance.filter(item => item.status === 'overdue');
    const upcoming = context.compliance.filter(item => 
      item.status === 'pending' && new Date(item.next_due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    
    sections.push(`**Compliance Status:**
- Total Items: ${context.compliance.length}
- Overdue: ${overdue.length}
- Due within 30 days: ${upcoming.length}
${overdue.length > 0 ? `- Overdue items: ${overdue.map(item => item.compliance_assets?.name).join(', ')}` : ''}`);
  } else {
    sections.push('**Compliance Status:** No compliance data available');
  }

  // 🛠️ Major Works
  if (context.majorWorks?.length) {
    const activeWorks = context.majorWorks.filter(work => work.status === 'in_progress');
    sections.push(`**Major Works Projects:**
- Total Projects: ${context.majorWorks.length}
- Active Projects: ${activeWorks.length}
${activeWorks.length > 0 ? `- Current: ${activeWorks.map(w => w.title).join(', ')}` : ''}`);
  } else {
    sections.push('**Major Works Projects:** No major works recorded');
  }

  // 👷 Site Staff
  if (context.siteStaff?.length) {
    const staffList = context.siteStaff.map(staff => `- ${staff.name} (${staff.role})`).join('\n');
    sections.push(`**On-site Staff:**
${staffList}`);
  } else {
    sections.push('**On-site Staff:** No site staff recorded');
  }

  // 📁 Documents
  if (context.documents?.length) {
    const recentDocs = context.documents.slice(0, 5);
    sections.push(`**Building Documents:**
- Total Documents: ${context.documents.length}
- Recent: ${recentDocs.map(doc => doc.name).join(', ')}`);
  } else {
    sections.push('**Building Documents:** No documents uploaded');
  }

  // 🗓️ Events
  if (context.events?.length) {
    const upcomingEvents = context.events.slice(0, 3);
    sections.push(`**Upcoming Events:**
- Total Events: ${context.events.length}
- Next: ${upcomingEvents.map(event => `${event.title} (${new Date(event.date).toLocaleDateString('en-GB')})`).join(', ')}`);
  } else {
    sections.push('**Upcoming Events:** No events scheduled');
  }

  // 📋 Tasks
  if (context.tasks?.length) {
    const urgentTasks = context.tasks.filter(task => 
      new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    sections.push(`**Building Tasks:**
- Active Tasks: ${context.tasks.length}
- Urgent (due within 7 days): ${urgentTasks.length}
${urgentTasks.length > 0 ? `- Urgent: ${urgentTasks.map(task => task.title).join(', ')}` : ''}`);
  } else {
    sections.push('**Building Tasks:** No active tasks');
  }

  // 📧 Related Email
  if (context.relatedEmail) {
    sections.push(`**Related Email:**
- Subject: ${context.relatedEmail.subject}
- From: ${context.relatedEmail.from_email}
- Received: ${new Date(context.relatedEmail.received_at).toLocaleDateString('en-GB')}`);
  }

  return sections;
}

async function generateAIResponse(question: string, context: BuildingContext, tone: string): Promise<string> {
  const contextSections = formatContextSections(context);
  const buildingContext = contextSections.join('\n\n');
  
  const systemPrompt = getSystemPrompt(buildingContext);
  
  const userPrompt = `**Question:** ${question}

**Available Context:**
${buildingContext}

Please provide a comprehensive, professional response based on the available data. If any information is missing or unclear, explain this to the user. Use British English and reference relevant UK property management legislation where appropriate.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
  });

  return response.choices[0].message.content || 'Unable to generate response';
}

function detectTopic(question: string): string {
  const questionLower = question.toLowerCase();
  
  // Check for specific topics
  if (questionLower.includes('c2') || questionLower.includes('eicr') || questionLower.includes('electrical')) {
    return 'C2 Remedial Works (EICR)';
  }
  if (questionLower.includes('section 20') || questionLower.includes('consultation') || questionLower.includes('major works')) {
    return 'Section 20 Threshold';
  }
  if (questionLower.includes('fire door') || questionLower.includes('tripartite')) {
    return 'Fire Door Maintenance – Tripartite';
  }
  if (questionLower.includes('service charge') || questionLower.includes('fire alarm')) {
    return 'Service Charge Dispute – Fire Alarm';
  }
  if (questionLower.includes('contractor') || questionLower.includes('risk assessment') || questionLower.includes('health and safety')) {
    return 'Contractor Risk Assessments';
  }
  if (questionLower.includes('major works') || questionLower.includes('project preparation')) {
    return 'Major Works Project Preparation';
  }
  
  return '';
} 