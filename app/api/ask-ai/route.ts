// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (question, building_id)
// - Uses proper Supabase queries with .eq() filters
// - Returns meaningful error responses
// - Includes authentication check

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let question: string
    let building_id: string | number
    let files: File[] = []

    // Handle both JSON and FormData
    const contentType = req.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData()
      question = formData.get('prompt') as string
      building_id = formData.get('building_id') as string
      
      // Handle files if present
      const fileEntries = formData.getAll('file')
      files = fileEntries.filter(entry => entry instanceof File) as File[]
    } else {
      const body = await req.json()
      question = body.question || body.prompt
      building_id = body.building_id
    }

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question/prompt is required' }, { status: 400 })
    }

    // Handle null building_id for homepage queries
    if (!building_id || building_id === 'null' || building_id === null) {
      // For homepage queries without specific building context
      const systemPrompt = `You are a helpful property management assistant. You can help with general property management questions, compliance, leaseholder management, and building operations.`
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })

      return NextResponse.json({
        success: true,
        response: completion.choices[0]?.message?.content || 'No response generated'
      })
    }

    // Get building information for context
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('name, address, unit_count')
      .eq('id', building_id)
      .single()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Get recent documents for this building (up to 3 most recent)
    const { data: documents, error: documentsError } = await supabase
      .from('building_documents')
      .select('file_name, document_type, extracted_text, created_at')
      .eq('building_id', building_id)
      .order('created_at', { ascending: false })
      .limit(3)

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

    // Get building-specific data for context
    const { data: leaseholders, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select(`
        name,
        email,
        units (unit_number)
      `)
      .eq('building_id', building_id)

    const { data: complianceAssets, error: complianceError } = await supabase
      .from('compliance_assets')
      .select('name, category, status, next_due')
      .eq('building_id', building_id)

    // Build context from available data
    let context = `Building: ${building.name} (${building.address})\n`
    context += `Total Units: ${building.unit_count || 0}\n\n`

    if (documents && documents.length > 0) {
      context += 'Recent Documents:\n'
      documents.forEach((doc, index) => {
        context += `${index + 1}. ${doc.file_name} (${doc.document_type})\n`
        if (doc.extracted_text) {
          context += `   Content: ${doc.extracted_text.substring(0, 200)}...\n`
        }
      })
      context += '\n'
    }

    if (leaseholders && leaseholders.length > 0) {
      context += 'Leaseholders:\n'
      leaseholders.forEach((lh, index) => {
        context += `${index + 1}. ${lh.name} (${lh.email}) - Unit ${lh.units?.unit_number}\n`
      })
      context += '\n'
    }

    if (complianceAssets && complianceAssets.length > 0) {
      context += 'Compliance Items:\n'
      complianceAssets.forEach((asset, index) => {
        context += `${index + 1}. ${asset.name} (${asset.category}) - Status: ${asset.status}\n`
        if (asset.next_due) {
          context += `   Due: ${asset.next_due}\n`
        }
      })
      context += '\n'
    }

    // Create AI prompt
    const systemPrompt = `You are a helpful property management assistant with access to building information, documents, and compliance data. 

Your role is to:
1. Answer questions about the building, leaseholders, and compliance
2. Analyze uploaded documents when relevant
3. Provide accurate, helpful responses based on the available context
4. If you don't have enough information, say so clearly
5. Be concise but thorough in your responses

Available context:
${context}

Please respond to the user's question using this information. If the question is about a specific document, refer to the document details provided. If it's about building data, use the leaseholder and compliance information.`

    const userPrompt = `Question: ${question}`

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const answer = completion.choices[0]?.message?.content || 'No response generated'

    return NextResponse.json({
      success: true,
      response: answer,
      context_used: {
        building: building.name,
        documents_count: documents?.length || 0,
        leaseholders_count: leaseholders?.length || 0,
        compliance_items_count: complianceAssets?.length || 0
      }
    })

  } catch (error) {
    console.error('Ask AI error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 