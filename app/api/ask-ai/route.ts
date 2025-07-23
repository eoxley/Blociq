import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { building_id, prompt } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    console.log('🔍 AI Query:', prompt)
    console.log('🏢 Building ID:', building_id)

    // Comprehensive data gathering from all relevant tables
    const buildingData = await gatherBuildingData(supabase, building_id)
    const unitsData = await gatherUnitsData(supabase, building_id)
    const leaseholdersData = await gatherLeaseholdersData(supabase, building_id)
    const complianceData = await gatherComplianceData(supabase, building_id)
    const emailsData = await gatherEmailsData(supabase, building_id)
    const tasksData = await gatherTasksData(supabase, building_id)
    const documentsData = await gatherDocumentsData(supabase, building_id)
    const eventsData = await gatherEventsData(supabase, building_id)
    const majorWorksData = await gatherMajorWorksData(supabase, building_id)

    // Combine all data into a comprehensive context
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

    // Create a detailed prompt for the AI
    const aiPrompt = createAIPrompt(prompt, comprehensiveContext)

    console.log('🤖 Sending to OpenAI...')

    // Call OpenAI with comprehensive context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are BlocIQ, a comprehensive property management AI assistant for UK leasehold blocks. You have access to detailed building data including units, leaseholders, compliance, emails, tasks, documents, events, and major works projects.

IMPORTANT: When document content is provided in the context, analyze it thoroughly and provide specific insights based on the actual content. Do not give vague responses like "I cannot access the content" when document excerpts are available.

For documents:
- If document content is provided, analyze it and give specific answers based on what you find
- If the document contains compliance information, highlight key findings and suggest actions
- If the document is a survey or report, summarize the main findings and any required follow-up actions
- If the document appears to have limited readable text, suggest re-uploading with OCR or a text-based version

Always be helpful, professional, and accurate. If information is not available in the data, clearly state that.`
        },
        {
          role: 'user',
          content: aiPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const answer = completion.choices[0].message.content

    console.log('✅ AI Response generated')

    // Log the interaction
    await supabase
      .from('ai_logs')
      .insert({
        user_id: session.user.id,
        question: prompt,
        response: answer,
        timestamp: new Date().toISOString(),
      })

    return NextResponse.json({ 
      success: true, 
      response: answer,
      context: {
        building: buildingData ? 'Building data available' : null,
        units: unitsData ? `${unitsData.length} units found` : null,
        leaseholders: leaseholdersData ? `${leaseholdersData.length} leaseholders found` : null,
        compliance: complianceData ? 'Compliance data available' : null,
        emails: emailsData ? `${emailsData.length} emails found` : null,
        tasks: tasksData ? `${tasksData.length} tasks found` : null,
        documents: documentsData ? `${documentsData.length} documents found` : null,
        events: eventsData ? `${eventsData.length} events found` : null,
        majorWorks: majorWorksData ? `${majorWorksData.length} major works projects found` : null
      }
    })

  } catch (error) {
    console.error('❌ Error in comprehensive ask-ai API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
      .select('*, full_text, extracted_text, summary, suggested_action')
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

function createAIPrompt(userQuestion: string, context: any) {
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
- Created: ${doc.created_at || 'Unknown'}
- Summary: ${doc.summary || 'No summary available'}
- Suggested Action: ${doc.suggested_action || 'No action suggested'}\n`
    })
    prompt += '\n'
    
    // Include document content excerpts for AI analysis
    const documentsWithContent = documents.filter((doc: any) => 
      doc.full_text || doc.extracted_text
    )
    
    if (documentsWithContent.length > 0) {
      prompt += `DOCUMENT CONTENT EXCERPTS:\n`
      documentsWithContent.forEach((doc: any, i: number) => {
        const content = doc.full_text || doc.extracted_text || ''
        const excerpt = content.slice(0, 1000) // Limit to 1000 characters per document
        if (excerpt.length > 50) { // Only include if there's substantial content
          prompt += `Document: ${doc.file_name || 'Unnamed'}\n---\n${excerpt}\n\n`
        }
      })
      prompt += '\n'
    }
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

  prompt += `INSTRUCTIONS:
- Provide a comprehensive answer based on the data above
- If the question asks about specific numbers (like unit count), provide exact figures from the data
- If information is not available in the data, clearly state that
- Be helpful, professional, and accurate
- If the question is about a specific building, focus on that building's data
- If no specific building is mentioned, provide information about all buildings if available

DOCUMENT ANALYSIS GUIDELINES:
- When document content is provided, analyze it thoroughly and provide specific insights
- For compliance documents, highlight key findings, deadlines, and required actions
- For surveys and reports, summarize main findings and suggest follow-up actions
- For contracts and legal documents, identify key terms and obligations
- For financial documents, highlight costs, payments, and financial implications
- Always suggest practical next steps for property managers
- If document content appears unclear or limited, suggest re-uploading with better text extraction

Please provide your answer:`

  return prompt
} 