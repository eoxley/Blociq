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

    // Check if the request is multipart/form-data (file upload) or JSON
    const contentType = request.headers.get('content-type') || ''
    let prompt: string
    let building_id: string | null
    let uploadedFiles: Array<{ name: string; content: string; type: string }> = []

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      prompt = (formData.get('prompt') as string) || ''
      building_id = (formData.get('building_id') as string) || null
      
      // Process uploaded files
      const files = formData.getAll('file') as File[]
      const fileNames = formData.getAll('fileName') as string[]
      
      console.log('📁 Processing uploaded files:', files.length)
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = fileNames[i] || file.name
        
        try {
          const fileContent = await extractTextFromFile(file)
          uploadedFiles.push({
            name: fileName,
            content: fileContent,
            type: file.type
          })
          console.log(`✅ Extracted text from ${fileName} (${fileContent.length} characters)`)
        } catch (error) {
          console.error(`❌ Error processing file ${fileName}:`, error)
          // Continue with other files even if one fails
        }
      }
    } else {
      // Handle JSON request (existing functionality)
      const body = await request.json()
      prompt = body.prompt
      building_id = body.building_id
    }

    if (!prompt && uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Prompt or file is required' }, { status: 400 })
    }

    console.log('🔍 AI Query:', prompt)
    console.log('🏢 Building ID:', building_id)
    console.log('📁 Uploaded files:', uploadedFiles.length)

    // Check if this is a document search query
    const isDocumentSearch = detectDocumentSearchQuery(prompt)
    
    if (isDocumentSearch && building_id && building_id !== 'null') {
      console.log('📄 Detected document search query, searching compliance documents...')
      const documentSearchResult = await searchComplianceDocuments(supabase, prompt, building_id)
      
      if (documentSearchResult.found) {
        return NextResponse.json({
          success: true,
          response: documentSearchResult.response,
          documentSearch: true,
          documents: documentSearchResult.documents
        })
      }
    }

    // Comprehensive data gathering from all relevant tables
    const buildingData = await gatherBuildingData(supabase, building_id || undefined)
    const unitsData = await gatherUnitsData(supabase, building_id || undefined)
    const leaseholdersData = await gatherLeaseholdersData(supabase, building_id || undefined)
    const complianceData = await gatherComplianceData(supabase, building_id || undefined)
    const emailsData = await gatherEmailsData(supabase, building_id || undefined)
    const tasksData = await gatherTasksData(supabase, building_id || undefined)
    const documentsData = await gatherDocumentsData(supabase, building_id || undefined)
    const eventsData = await gatherEventsData(supabase, building_id || undefined)
    const majorWorksData = await gatherMajorWorksData(supabase, building_id || undefined)

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
      majorWorks: majorWorksData,
      uploadedFiles: uploadedFiles
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

For uploaded files:
- Analyze the content thoroughly and provide specific insights
- If it's a lease document, identify key terms, obligations, and important dates
- If it's a compliance document, highlight requirements and deadlines
- If it's a financial document, identify costs, payments, and financial implications
- If it's a report or survey, summarize findings and suggest actions
- Always provide practical, actionable advice for property managers

For document processing errors:
- If a document shows processing errors, explain what went wrong and provide specific solutions
- Suggest alternative file formats or conversion methods
- Recommend OCR processing for scanned documents
- Guide users to upload text-based versions when possible
- Be helpful and constructive in your suggestions

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
        majorWorks: majorWorksData ? `${majorWorksData.length} major works projects found` : null,
        uploadedFiles: uploadedFiles.length > 0 ? `${uploadedFiles.length} files processed` : null
      }
    })

  } catch (error) {
    console.error('❌ Error in comprehensive ask-ai API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Extract text from uploaded files with enhanced error handling
 */
async function extractTextFromFile(file: File): Promise<string> {
  try {
    console.log(`📄 Processing file: ${file.name} (${file.type})`);
    
    if (file.type === 'text/plain') {
      // Handle plain text files
      const text = await file.text();
      console.log(`✅ Text file processed: ${text.length} characters`);
      return text;
    } else if (file.type === 'application/pdf') {
      // Handle PDF files using enhanced extraction
      const { extractTextFromPDF } = await import('@/lib/extractTextFromPdf');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractTextFromPDF(buffer, file.name);
      
      if (result.error) {
        console.error(`❌ PDF extraction failed: ${result.error}`);
        return `[Document Processing Error: ${result.error}]\n\nSuggestions:\n${result.suggestions?.map(s => `• ${s}`).join('\n') || 'Please try uploading a different version of the document.'}`;
      }
      
      console.log(`✅ PDF processed using ${result.method}: ${result.text.length} characters (confidence: ${result.confidence})`);
      return result.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Handle DOCX files using enhanced extraction
      const { extractTextFromFile } = await import('@/lib/extractTextFromPdf');
      const result = await extractTextFromFile(file);
      
      if (result.error) {
        console.error(`❌ DOCX extraction failed: ${result.error}`);
        return `[Word Document Processing Error: ${result.error}]\n\nSuggestions:\n${result.suggestions?.map(s => `• ${s}`).join('\n') || 'Please convert to PDF or TXT format.'}`;
      }
      
      console.log(`✅ DOCX processed using ${result.method}: ${result.text.length} characters (confidence: ${result.confidence})`);
      return result.text;
    } else if (file.type.includes('image/')) {
      // Handle image files using enhanced extraction
      const { extractTextFromFile } = await import('@/lib/extractTextFromPdf');
      const result = await extractTextFromFile(file);
      
      if (result.error) {
        console.error(`❌ Image extraction failed: ${result.error}`);
        return `[Image Processing Error: ${result.error}]\n\nSuggestions:\n${result.suggestions?.map(s => `• ${s}`).join('\n') || 'Please ensure the image contains clear, readable text.'}`;
      }
      
      console.log(`✅ Image processed using ${result.method}: ${result.text.length} characters (confidence: ${result.confidence})`);
      return result.text;
    } else {
      console.warn(`⚠️ Unsupported file type: ${file.type}`);
      return `[Unsupported File Type: ${file.type}]\n\nThis file type is not supported. Please upload:\n• PDF documents\n• Word documents (DOCX)\n• Text files (TXT)\n• Image files (JPG, PNG) with readable text`;
    }
  } catch (error) {
    console.error(`❌ Error processing file ${file.name}:`, error);
    return `[Processing Error: ${file.name}]\n\nAn error occurred while processing this file. Please:\n• Check that the file is not corrupted\n• Try uploading a different version\n• Ensure the file is in a supported format\n• Contact support if the problem persists`;
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
  const { building, units, leaseholders, compliance, emails, tasks, documents, events, majorWorks, uploadedFiles } = context

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

  // Uploaded Files Information
  if (uploadedFiles && uploadedFiles.length > 0) {
    prompt += `UPLOADED FILES (${uploadedFiles.length} total):\n`
    uploadedFiles.forEach((file: { name: string; content: string; type: string }, i: number) => {
      prompt += `${i + 1}. ${file.name} (${file.type})\n`
      if (file.content.length > 200) { // Only include if content is substantial
        prompt += `Content Excerpt: ${file.content.slice(0, 200)}...\n`
      } else {
        prompt += `Content: ${file.content}\n`
      }
      prompt += '\n'
    })
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

/**
 * Detect if the user's query is asking to find or locate a document
 */
function detectDocumentSearchQuery(prompt: string): boolean {
  const searchKeywords = [
    'where', 'find', 'locate', 'view', 'show', 'get', 'download',
    'see', 'access', 'retrieve', 'pull up', 'bring up', 'open',
    'document', 'report', 'file', 'upload', 'summary', 'extract',
    'what does', 'tell me about', 'show me', 'find me'
  ]
  
  const documentTypes = [
    'fra', 'fire risk assessment', 'fire safety',
    'eicr', 'electrical', 'electrical certificate',
    'asbestos', 'asbestos survey',
    'loler', 'lifting equipment',
    'insurance', 'insurance certificate',
    'gas', 'gas certificate', 'gas safety',
    'epc', 'energy performance',
    'pat', 'portable appliance',
    'certificate', 'cert', 'document', 'report',
    'survey', 'assessment', 'inspection', 'lease',
    'agreement', 'contract', 'policy', 'statement'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  
  // Check for search keywords
  const hasSearchKeyword = searchKeywords.some(keyword => 
    lowerPrompt.includes(keyword)
  )
  
  // Check for document types
  const hasDocumentType = documentTypes.some(docType => 
    lowerPrompt.includes(docType)
  )
  
  // Also check for general document-related terms
  const documentTerms = ['document', 'file', 'report', 'upload', 'summary']
  const hasDocumentTerms = documentTerms.some(term => 
    lowerPrompt.includes(term)
  )
  
  return (hasSearchKeyword && hasDocumentType) || hasDocumentTerms
}

/**
 * Search documents across both building_documents and compliance_documents tables
 */
async function searchComplianceDocuments(supabase: any, prompt: string, buildingId: string) {
  try {
    console.log('🔍 Searching documents for building:', buildingId)
    
    // Extract search terms from the prompt
    const searchTerms = extractSearchTerms(prompt)
    
    // Search building_documents table
    let buildingDocsQuery = supabase
      .from('building_documents')
      .select(`
        id,
        file_name,
        type,
        created_at,
        building_id,
        unit_id,
        leaseholder_id
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Search compliance_documents table
    let complianceDocsQuery = supabase
      .from('compliance_documents')
      .select(`
        id,
        file_name,
        type,
        created_at,
        building_id,
        compliance_asset_id
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Add search filters based on extracted terms
    if (searchTerms.length > 0) {
      const searchConditions = searchTerms.map(term => 
        `or(file_name.ilike.%${term}%,type.ilike.%${term}%)`
      ).join(',')
      
      buildingDocsQuery = buildingDocsQuery.or(searchConditions)
      complianceDocsQuery = complianceDocsQuery.or(searchConditions)
    }
    
    // Execute both queries
    const [buildingDocsResult, complianceDocsResult] = await Promise.all([
      buildingDocsQuery,
      complianceDocsQuery
    ])
    
    if (buildingDocsResult.error) {
      console.error('❌ Error searching building documents:', buildingDocsResult.error)
    }
    
    if (complianceDocsResult.error) {
      console.error('❌ Error searching compliance documents:', complianceDocsResult.error)
    }
    
    const buildingDocs = buildingDocsResult.data || []
    const complianceDocs = complianceDocsResult.data || []
    
    // Combine and deduplicate documents
    const allDocuments = [...buildingDocs, ...complianceDocs]
    
    if (allDocuments.length === 0) {
      return {
        found: true,
        response: `I couldn't find any documents matching your query for this building. You can upload documents in the AI Assistant section.`,
        documents: []
      }
    }
    
    // Get building name for context
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .single()
    
    const buildingName = building?.name || 'this building'
    
    // Format the response
    const response = formatDocumentSearchResponse(allDocuments, buildingName, buildingId)
    
    // Log the document search interaction
    await logDocumentSearch(supabase, prompt, allDocuments, buildingId)
    
    return {
      found: true,
      response,
      documents: documents.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        summary: doc.summary,
        doc_url: doc.doc_url,
        uploaded_at: doc.uploaded_at,
        expiry_date: doc.expiry_date
      }))
    }
    
  } catch (error) {
    console.error('❌ Error in searchComplianceDocuments:', error)
    return { found: false, response: null, documents: [] }
  }
}

/**
 * Extract search terms from user prompt
 */
function extractSearchTerms(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase()
  
  // Common document type mappings
  const documentMappings: { [key: string]: string[] } = {
    'fra': ['fire risk assessment', 'fire safety', 'fra'],
    'fire': ['fire risk assessment', 'fire safety', 'fra'],
    'eicr': ['electrical', 'electrical certificate', 'eicr'],
    'electrical': ['electrical', 'electrical certificate', 'eicr'],
    'asbestos': ['asbestos', 'asbestos survey'],
    'loler': ['loler', 'lifting equipment'],
    'insurance': ['insurance', 'insurance certificate'],
    'gas': ['gas', 'gas certificate', 'gas safety'],
    'epc': ['epc', 'energy performance'],
    'pat': ['pat', 'portable appliance'],
    'certificate': ['certificate', 'cert'],
    'document': ['document', 'doc'],
    'report': ['report'],
    'survey': ['survey', 'assessment'],
    'inspection': ['inspection', 'assessment']
  }
  
  const searchTerms: string[] = []
  
  // Check for specific document types
  for (const [key, terms] of Object.entries(documentMappings)) {
    if (lowerPrompt.includes(key)) {
      searchTerms.push(...terms)
    }
  }
  
  // Add any other relevant terms from the prompt
  const words = lowerPrompt.split(/\s+/)
  words.forEach(word => {
    if (word.length > 3 && !searchTerms.includes(word)) {
      searchTerms.push(word)
    }
  })
  
  return [...new Set(searchTerms)] // Remove duplicates
}

/**
 * Format the document search response with natural language and links
 */
function formatDocumentSearchResponse(documents: any[], buildingName: string, buildingId: string): string {
  if (documents.length === 0) {
    return `I couldn't find any documents for ${buildingName}. You can upload documents in the AI Assistant section.`
  }
  
  let response = ''
  
  if (documents.length === 1) {
    const doc = documents[0]
    const fileName = doc.file_name || doc.title || 'Document'
    const docType = doc.type || 'Document'
    const uploadDate = new Date(doc.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    
    response += `I found the ${docType} "${fileName}" for ${buildingName}. It was uploaded on ${uploadDate}.`
    
    if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      response += ` It expires on ${expiryDate}.`
    }
    
    if (doc.doc_url) {
      response += `\n\n📄 [View Document](${doc.doc_url})`
    }
    response += `\n🔗 [View in Documents](/buildings/${buildingId}/documents)`
    
  } else {
    response += `I found ${documents.length} relevant documents for ${buildingName}:\n\n`
    
    documents.forEach((doc: any, index) => {
      const fileName = doc.file_name || doc.title || 'Document'
      const docType = doc.type || 'Document'
      const uploadDate = new Date(doc.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      
      response += `${index + 1}. **${docType}** - ${fileName} (uploaded ${uploadDate})\n`
      
      if (doc.expiry_date) {
        const expiryDate = new Date(doc.expiry_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        response += `   Expires: ${expiryDate}\n`
      }
      
      if (doc.doc_url) {
        response += `   📄 [View Document](${doc.doc_url})\n`
      }
      response += '\n'
    })
    
    response += `🔗 [View All Documents](/buildings/${buildingId}/documents)`
  }
  
  response += `\n\nYou can ask me specific questions about these documents, such as:\n`
  response += `• "What does the fire risk assessment say about emergency exits?"\n`
  response += `• "When does the electrical certificate expire?"\n`
  response += `• "Summarize the lease agreement for Flat 5"\n`
  
  return response
}

/**
 * Log document search interactions to ai_logs table
 */
async function logDocumentSearch(supabase: any, prompt: string, documents: any[], buildingId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase
      .from('ai_logs')
      .insert({
        user_id: user?.id,
        building_id: buildingId,
        query: prompt,
        response_type: 'document_search',
        documents_used: documents.map(doc => ({
          id: doc.id,
          name: doc.file_name || doc.title,
          type: doc.type
        })),
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('❌ Error logging document search:', error)
  }
} 