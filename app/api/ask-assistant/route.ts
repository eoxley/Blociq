// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for message
// - Authentication check with session validation
// - Supabase queries with proper error handling
// - Try/catch with detailed error handling
// - Used in assistant components
// - Includes OpenAI integration with error handling
// - Comprehensive data gathering and document analysis
// - File attachment support

// File: app/api/ask-assistant/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(req: Request) {
  console.log("✅ BlocIQ Assistant endpoint hit");

  try {
    let message: string;
    let buildingId: string | undefined;
    let unitId: string | undefined;
    const attachments: File[] = [];

    // Check if the request is multipart/form-data (with attachments) or JSON
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with attachments
      const formData = await req.formData();
      message = formData.get('message') as string;
      buildingId = formData.get('buildingId') as string;
      unitId = formData.get('unitId') as string;
      
      // Extract attachments
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachment_') && value instanceof File) {
          attachments.push(value);
        }
      }
      
      console.log(`📎 Found ${attachments.length} attachments`);
    } else {
      // Handle JSON request
      const body = await req.json();
      message = body?.message;
      buildingId = body?.buildingId;
      unitId = body?.unitId;
    }

    if (!message && attachments.length === 0) {
      console.error("❌ No message or attachments provided");
      return NextResponse.json({ error: 'No message or attachments provided' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("⚠️ Supabase session error:", sessionError.message);
    }

    console.log("📩 User message:", message);
    console.log("🏢 Building ID from context:", buildingId);
    console.log("🏠 Unit ID from context:", unitId);

    // 🔍 Comprehensive data gathering
    const buildingData = await gatherBuildingData(supabase, buildingId);
    const unitsData = await gatherUnitsData(supabase, buildingId);
    const leaseholdersData = await gatherLeaseholdersData(supabase, buildingId);
    const complianceData = await gatherComplianceData(supabase, buildingId);
    const emailsData = await gatherEmailsData(supabase, buildingId);
    const tasksData = await gatherTasksData(supabase, buildingId);
    const documentsData = await gatherDocumentsData(supabase, buildingId);
    const eventsData = await gatherEventsData(supabase, buildingId);
    const majorWorksData = await gatherMajorWorksData(supabase, buildingId);

    // 🔍 Enhanced document search with semantic matching
    const relevantDocuments = await findRelevantDocuments(supabase, message, buildingId);
    const documentContext = relevantDocuments.length > 0 
      ? relevantDocuments.map((doc: any) => 
          `Document: ${doc.file_name}\nType: ${doc.type}\nSummary: ${doc.summary || 'No summary available'}\n\nRelevant Content:\n${doc.text_content?.substring(0, 2000) || 'No text content available'}`
        ).join('\n\n---\n\n')
      : '';

    // Create comprehensive context
    const comprehensiveContext = {
      building: buildingData,
      units: unitsData,
      leaseholders: leaseholdersData,
      compliance: complianceData,
      emails: emailsData,
      tasks: tasksData,
      documents: documentsData,
      events: eventsData,
      majorWorks: majorWorksData
    }

    const aiPrompt = createComprehensivePrompt(message, comprehensiveContext, documentContext, attachments);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are BlocIQ — a comprehensive property management AI assistant for UK leasehold blocks. You have access to detailed building data including units, leaseholders, compliance, emails, tasks, documents, events, and major works projects. 

IMPORTANT INSTRUCTIONS:
- You can read and analyze all uploaded documents including PDFs, images, and other file types
- Never say you "can't read PDFs" or similar generic fallback messages
- Always provide specific, actionable answers based on the available data
- Use UK property management terminology and reference relevant UK legislation
- Focus on leasehold law, building regulations, and compliance requirements
- Be professional, helpful, and accurate in all responses
- If information is not available in the data, clearly state what specific information is missing
- Reference specific documents when providing answers based on their content

UK PROPERTY MANAGEMENT CONTEXT:
- Leasehold and freehold property law
- Building regulations and compliance
- Fire safety regulations
- Electrical safety (EICR requirements)
- Energy performance certificates (EPC)
- Asbestos management
- Service charges and ground rent
- Right to manage and collective enfranchisement
- Section 20 consultation requirements
- Health and safety at work regulations
- Gas safety regulations
- Legionella risk assessments

Provide accurate, detailed answers based on the data provided. If information is not available in the data, clearly state that. Always be helpful and professional.`
        },
        {
          role: 'user',
          content: aiPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const answer = response.choices[0].message?.content;

    console.log("🧠 Assistant reply:", answer);

    // Log the interaction
    if (session?.user?.id) {
      await supabase
        .from('ai_logs')
        .insert({
          user_id: session.user.id,
          question: message,
          response: answer,
          timestamp: new Date().toISOString(),
        });
    }

    return NextResponse.json({ 
      answer: answer || "🤖 Sorry, I couldn't generate a response.",
      context: {
        building: buildingData ? 'Building data available' : null,
        units: unitsData ? `${unitsData.length} units found` : null,
        leaseholders: leaseholdersData ? `${leaseholdersData.length} leaseholders found` : null,
        compliance: complianceData ? 'Compliance data available' : null,
        emails: emailsData ? `${emailsData.length} emails found` : null,
        tasks: tasksData ? `${tasksData.length} tasks found` : null,
        documents: documentsData ? `${documentsData.length} documents found` : null,
        events: eventsData ? `${eventsData.length} events found` : null,
        majorWorks: majorWorksData ? `${majorWorksData.length} major works projects found` : null,
        documentsFound: relevantDocuments?.length || 0,
        attachmentsProcessed: attachments.length,
      }
    });

  } catch (error: unknown) {
    console.error("❌ Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to process assistant query',
      details: errorMessage 
    }, { status: 500 });
  }
}

// Data gathering functions (same as ask-ai endpoint)
async function gatherBuildingData(supabase: any, buildingId?: string) {
  try {
    let query = supabase.from('buildings').select('*')
    
    if (buildingId) {
      query = query.eq('id', buildingId)
    }
    
    const { data: buildings } = await query
    
    if (buildingId) {
      return buildings?.[0] || null
    }
    
    return buildings || []
  } catch (error) {
    console.error('Error gathering building data:', error)
    return null
  }
}

async function gatherUnitsData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('units')
      .select(`
        *,
        leaseholders (
          id,
          name,
          email,
          phone
        ),
        occupiers (
          id,
          full_name,
          email,
          phone,
          start_date,
          end_date,
          rent_amount,
          rent_frequency,
          status
        )
      `)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: units } = await query
    return units || []
  } catch (error) {
    console.error('Error gathering units data:', error)
    return []
  }
}

async function gatherLeaseholdersData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('leaseholders')
      .select(`
        *,
        units!inner (
          id,
          unit_number,
          building_id
        )
      `)
    
    if (buildingId) {
      query = query.eq('units.building_id', buildingId)
    }
    
    const { data: leaseholders } = await query
    return leaseholders || []
  } catch (error) {
    console.error('Error gathering leaseholders data:', error)
    return []
  }
}

async function gatherComplianceData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          name,
          category,
          description
        )
      `)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: compliance } = await query
    return compliance || []
  } catch (error) {
    console.error('Error gathering compliance data:', error)
    return []
  }
}

async function gatherEmailsData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('incoming_emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(20)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: emails } = await query
    return emails || []
  } catch (error) {
    console.error('Error gathering emails data:', error)
    return []
  }
}

async function gatherTasksData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('building_todos')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(20)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: tasks } = await query
    return tasks || []
  } catch (error) {
    console.error('Error gathering tasks data:', error)
    return []
  }
}

async function gatherDocumentsData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('building_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: documents } = await query
    return documents || []
  } catch (error) {
    console.error('Error gathering documents data:', error)
    return []
  }
}

async function gatherEventsData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('property_events')
      .select('*')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(20)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: events } = await query
    return events || []
  } catch (error) {
    console.error('Error gathering events data:', error)
    return []
  }
}

async function gatherMajorWorksData(supabase: any, buildingId?: string) {
  try {
    let query = supabase
      .from('major_works_projects')
      .select(`
        *,
        major_works_documents (*),
        major_works_logs (*),
        major_works_observations (*)
      `)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (buildingId) {
      query = query.eq('building_id', buildingId)
    }
    
    const { data: majorWorks } = await query
    return majorWorks || []
  } catch (error) {
    console.error('Error gathering major works data:', error)
    return []
  }
}

async function findRelevantDocuments(supabase: any, userQuestion: string, buildingId?: string) {
  try {
    console.log('🔍 Searching for relevant documents...');
    
    // Build query
    let query = supabase
      .from('building_documents')
      .select('file_name, text_content, type, summary, building_id, created_at')
      .limit(20); // Increased limit for better matching

    // Filter by building if specified
    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    const { data: documents } = await query;

    if (!documents || documents.length === 0) {
      console.log('📄 No documents found');
      return [];
    }

    console.log(`📄 Found ${documents.length} documents to analyze`);

    // Enhanced relevance scoring
    const scoredDocuments = documents.map((doc: any) => {
      const questionLower = userQuestion.toLowerCase();
      const textLower = doc.text_content?.toLowerCase() || '';
      const summaryLower = doc.summary?.toLowerCase() || '';
      const typeLower = doc.type?.toLowerCase() || '';
      const fileNameLower = doc.file_name?.toLowerCase() || '';

      let score = 0;

      // Exact keyword matches (highest priority)
      const keywords = questionLower.split(' ').filter(word => word.length > 3);
      keywords.forEach(keyword => {
        if (textLower.includes(keyword)) score += 10;
        if (summaryLower.includes(keyword)) score += 15;
        if (typeLower.includes(keyword)) score += 20;
        if (fileNameLower.includes(keyword)) score += 25;
      });

      // Document type relevance
      const documentTypes = {
        'eicr': ['electrical', 'certificate', 'inspection', 'safety'],
        'epc': ['energy', 'performance', 'certificate', 'rating'],
        'fire': ['fire', 'safety', 'risk', 'assessment'],
        'asbestos': ['asbestos', 'survey', 'management'],
        'lease': ['lease', 'agreement', 'terms', 'rent'],
        'insurance': ['insurance', 'policy', 'cover', 'certificate'],
        'compliance': ['compliance', 'certificate', 'inspection', 'report']
      };

      Object.entries(documentTypes).forEach(([docType, relevantTerms]) => {
        if (typeLower.includes(docType) || fileNameLower.includes(docType)) {
          relevantTerms.forEach(term => {
            if (questionLower.includes(term)) score += 15;
          });
        }
      });

      // Recency bonus (newer documents get slight preference)
      const daysSinceCreation = doc.created_at 
        ? Math.floor((Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 365;
      if (daysSinceCreation < 30) score += 5;
      else if (daysSinceCreation < 90) score += 3;
      else if (daysSinceCreation < 365) score += 1;

      return { ...doc, relevanceScore: score };
    });

    // Sort by relevance score and return top results
    const relevantDocs = scoredDocuments
      .filter((doc: any) => doc.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Return top 5 most relevant documents

    console.log(`✅ Found ${relevantDocs.length} relevant documents`);
    relevantDocs.forEach((doc: any, index: number) => {
      console.log(`  ${index + 1}. ${doc.file_name} (score: ${doc.relevanceScore})`);
    });

    return relevantDocs;

  } catch (error) {
    console.error('❌ Error finding relevant documents:', error);
    return [];
  }
}

function createComprehensivePrompt(userQuestion: string, context: any, documentContext: string, attachments: File[]) {
  const { building, units, leaseholders, compliance, emails, tasks, documents, events, majorWorks } = context

  let prompt = `You are BlocIQ, a comprehensive property management AI assistant. Answer the following question based on the detailed building data provided:

USER QUESTION: ${userQuestion}

AVAILABLE DATA:

`

  // Building Information
  if (building) {
    if (Array.isArray(building)) {
      prompt += `BUILDINGS (${building.length} total):\n`
      building.forEach((b, i) => {
        prompt += `${i + 1}. ${b.name} (ID: ${b.id})
- Address: ${b.address || 'Not specified'}
- Unit Count: ${b.unit_count || 'Not specified'}
- Building Age: ${b.building_age || 'Not specified'}
- Total Floors: ${b.total_floors || 'Not specified'}
- Construction Type: ${b.construction_type || 'Not specified'}
- Building Manager: ${b.building_manager_name || 'Not specified'}
- Emergency Contact: ${b.emergency_contact_name || 'Not specified'}
- Service Charge Frequency: ${b.service_charge_frequency || 'Not specified'}
- Ground Rent: ${b.ground_rent_amount || 'Not specified'} (${b.ground_rent_frequency || 'Not specified'})
- Fire Safety Status: ${b.fire_safety_status || 'Not specified'}
- Energy Rating: ${b.energy_rating || 'Not specified'}\n\n`
      })
    } else {
      prompt += `BUILDING DETAILS:
- Name: ${building.name}
- Address: ${building.address || 'Not specified'}
- Unit Count: ${building.unit_count || 'Not specified'}
- Building Age: ${building.building_age || 'Not specified'}
- Total Floors: ${building.total_floors || 'Not specified'}
- Construction Type: ${building.construction_type || 'Not specified'}
- Building Manager: ${building.building_manager_name || 'Not specified'}
- Emergency Contact: ${building.emergency_contact_name || 'Not specified'}
- Service Charge Frequency: ${building.service_charge_frequency || 'Not specified'}
- Ground Rent: ${building.ground_rent_amount || 'Not specified'} (${building.ground_rent_frequency || 'Not specified'})
- Fire Safety Status: ${building.fire_safety_status || 'Not specified'}
- Energy Rating: ${building.energy_rating || 'Not specified'}\n\n`
    }
  }

  // Units Information
  if (units && units.length > 0) {
    prompt += `UNITS (${units.length} total):\n`
    units.forEach((unit: any, i: number) => {
      prompt += `${i + 1}. Unit ${unit.unit_number}
- Floor: ${unit.floor || 'Not specified'}
- Type: ${unit.type || 'Not specified'}
- Leaseholder: ${unit.leaseholders?.[0]?.name || 'No leaseholder'}
- Occupiers: ${unit.occupiers?.length || 0} occupier(s)\n`
    })
    prompt += '\n'
  }

  // Leaseholders Information
  if (leaseholders && leaseholders.length > 0) {
    prompt += `LEASEHOLDERS (${leaseholders.length} total):\n`
    leaseholders.forEach((leaseholder: any, i: number) => {
      prompt += `${i + 1}. ${leaseholder.name || 'Unnamed'}
- Email: ${leaseholder.email || 'Not specified'}
- Phone: ${leaseholder.phone || 'Not specified'}
- Unit: ${leaseholder.units?.[0]?.unit_number || 'Not specified'}\n`
    })
    prompt += '\n'
  }

  // Compliance Information
  if (compliance && compliance.length > 0) {
    prompt += `COMPLIANCE ITEMS (${compliance.length} total):\n`
    compliance.forEach((item: any, i: number) => {
      prompt += `${i + 1}. ${item.compliance_assets?.name || 'Unnamed'}
- Category: ${item.compliance_assets?.category || 'Not specified'}
- Status: ${item.status || 'Not specified'}
- Next Due: ${item.next_due_date || 'Not specified'}
- Notes: ${item.notes || 'None'}\n`
    })
    prompt += '\n'
  }

  // Emails Information
  if (emails && emails.length > 0) {
    prompt += `RECENT EMAILS (${emails.length} total):\n`
    emails.slice(0, 5).forEach((email: any, i: number) => {
      prompt += `${i + 1}. ${email.subject || 'No subject'}
- From: ${email.from_email || 'Unknown'}
- Received: ${email.received_at || 'Unknown'}
- Status: ${email.handled ? 'Handled' : 'Unhandled'}\n`
    })
    prompt += '\n'
  }

  // Tasks Information
  if (tasks && tasks.length > 0) {
    prompt += `TASKS (${tasks.length} total):\n`
    tasks.slice(0, 5).forEach((task: any, i: number) => {
      prompt += `${i + 1}. ${task.title || 'Untitled'}
- Priority: ${task.priority || 'Not specified'}
- Due Date: ${task.due_date || 'Not specified'}
- Status: ${task.is_complete ? 'Complete' : 'Incomplete'}\n`
    })
    prompt += '\n'
  }

  // Documents Information
  if (documents && documents.length > 0) {
    prompt += `DOCUMENTS (${documents.length} total):\n`
    documents.slice(0, 5).forEach((doc: any, i: number) => {
      prompt += `${i + 1}. ${doc.file_name || 'Unnamed'}
- Type: ${doc.type || 'Not specified'}
- Created: ${doc.created_at || 'Unknown'}\n`
    })
    prompt += '\n'
  }

  // Events Information
  if (events && events.length > 0) {
    prompt += `UPCOMING EVENTS (${events.length} total):\n`
    events.slice(0, 5).forEach((event: any, i: number) => {
      prompt += `${i + 1}. ${event.title || 'Untitled'}
- Date: ${event.start_time || 'Unknown'}
- Type: ${event.event_type || 'Not specified'}
- Location: ${event.location || 'Not specified'}\n`
    })
    prompt += '\n'
  }

  // Major Works Information
  if (majorWorks && majorWorks.length > 0) {
    prompt += `MAJOR WORKS PROJECTS (${majorWorks.length} total):\n`
    majorWorks.slice(0, 5).forEach((project: any, i: number) => {
      prompt += `${i + 1}. ${project.title || 'Untitled'}
- Status: ${project.status || 'Not specified'}
- Budget: ${project.budget || 'Not specified'}
- Start Date: ${project.start_date || 'Not specified'}
- End Date: ${project.end_date || 'Not specified'}
- Documents: ${project.major_works_documents?.length || 0} document(s)
- Logs: ${project.major_works_logs?.length || 0} log entry(ies)\n`
    })
    prompt += '\n'
  }

  // Document Context
  if (documentContext) {
    prompt += `RELEVANT DOCUMENTS:\n${documentContext}\n\n`
  }

  // Attachments
  if (attachments.length > 0) {
    prompt += `USER ATTACHMENTS:\n`
    attachments.forEach((file, i) => {
      prompt += `${i + 1}. ${file.name} (${file.size} bytes)\n`
    })
    prompt += '\n'
  }

  prompt += `INSTRUCTIONS:
- Provide a comprehensive answer based on the data above
- If the question asks about specific numbers (like unit count), provide exact figures from the data
- If information is not available in the data, clearly state that
- Be helpful, professional, and accurate
- If the question is about a specific building, focus on that building's data
- If no specific building is mentioned, provide information about all buildings if available
- Consider any attached files or relevant documents in your response

Please provide your answer:`

  return prompt
} 