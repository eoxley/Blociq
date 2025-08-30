import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ExtractRequest {
  fileUrl: string
  assetName: string
  buildingId?: string
}

interface ExtractedData {
  title: string
  summary: string
  last_renewed_date: string
  next_due_date: string | null
}

// Asset-specific prompts for better extraction
const getAssetSpecificPrompt = (assetName: string): string => {
  const assetNameLower = assetName.toLowerCase()
  
  if (assetNameLower.includes('fire') || assetNameLower.includes('fra')) {
    return `This is a Fire Risk Assessment document. Look for:
- Fire safety certificate or assessment title
- Assessment date and renewal dates
- Fire safety measures and recommendations
- Next assessment due date (typically 1 year from assessment)`
  }
  
  if (assetNameLower.includes('gas') || assetNameLower.includes('gas safety')) {
    return `This is a Gas Safety Certificate document. Look for:
- Gas safety certificate title and number
- Certificate issue date and expiry date
- Gas engineer details and signature
- Next inspection due date (typically 1 year from issue)`
  }
  
  if (assetNameLower.includes('electrical') || assetNameLower.includes('eicr')) {
    return `This is an Electrical Installation Condition Report (EICR). Look for:
- EICR certificate title and reference number
- Inspection date and next inspection due date
- Electrical safety assessment results
- Recommendations and remedial work required`
  }
  
  if (assetNameLower.includes('asbestos')) {
    return `This is an Asbestos Management document. Look for:
- Asbestos survey or management plan title
- Survey date and review date
- Asbestos locations and conditions
- Next review due date (typically 2 years)`
  }
  
  if (assetNameLower.includes('lift') || assetNameLower.includes('elevator')) {
    return `This is a Lift/Elevator maintenance document. Look for:
- Lift maintenance certificate or report title
- Maintenance date and next maintenance due
- Lift engineer details and findings
- Next inspection due date (typically 6 months)`
  }
  
  if (assetNameLower.includes('insurance')) {
    return `This is an Insurance document. Look for:
- Insurance policy title and number
- Policy start date and end date
- Coverage details and limits
- Renewal date and premium information`
  }
  
  if (assetNameLower.includes('energy') || assetNameLower.includes('epc')) {
    return `This is an Energy Performance Certificate (EPC). Look for:
- EPC certificate title and reference
- Assessment date and validity period
- Energy rating and recommendations
- Next assessment due date (typically 10 years)`
  }
  
  return `This is a compliance document for ${assetName}. Look for:
- Document title and reference number
- Issue date, renewal date, or expiry date
- Key compliance information and requirements
- Next review or renewal due date`
}

// Date extraction helper
const extractDates = (text: string): { last_renewed_date: string; next_due_date: string | null } => {
  const datePatterns = [
    // UK date formats
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, // DD/MM/YYYY
    /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g,   // DD-MM-YYYY
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi, // DD Month YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/gi, // Month DD, YYYY
    
    // ISO date format
    /\b(\d{4})-(\d{2})-(\d{2})\b/g, // YYYY-MM-DD
  ]

  const dates: Date[] = []
  
  datePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      try {
        let date: Date
        
        if (pattern.source.includes('YYYY-MM-DD')) {
          // ISO format
          date = new Date(match[0])
        } else if (pattern.source.includes('DD/MM/YYYY') || pattern.source.includes('DD-MM-YYYY')) {
          // DD/MM/YYYY or DD-MM-YYYY
          const [, day, month, year] = match
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        } else if (pattern.source.includes('DD.*Month.*YYYY')) {
          // DD Month YYYY
          const [, day, month, year] = match
          const monthIndex = new Date(`${month} 1, 2000`).getMonth()
          date = new Date(parseInt(year), monthIndex, parseInt(day))
        } else {
          // Month DD, YYYY
          const [, month, day, year] = match
          const monthIndex = new Date(`${month} 1, 2000`).getMonth()
          date = new Date(parseInt(year), monthIndex, parseInt(day))
        }
        
        if (!isNaN(date.getTime())) {
          dates.push(date)
        }
      } catch (error) {
        // Skip invalid dates
      }
    }
  })

  // Sort dates chronologically
  dates.sort((a, b) => a.getTime() - b.getTime())
  
  if (dates.length === 0) {
    return { last_renewed_date: '', next_due_date: null }
  }
  
  // Use the most recent date as last_renewed_date
  const lastRenewed = dates[dates.length - 1]
  
  // Try to find next due date based on asset type
  const assetNameLower = assetName.toLowerCase()
  let nextDue: Date | null = null
  
  if (assetNameLower.includes('fire') || assetNameLower.includes('fra') || 
      assetNameLower.includes('gas') || assetNameLower.includes('insurance')) {
    // 1 year from last renewed
    nextDue = new Date(lastRenewed.getTime() + 365 * 24 * 60 * 60 * 1000)
  } else if (assetNameLower.includes('electrical') || assetNameLower.includes('eicr')) {
    // 5 years from last renewed
    nextDue = new Date(lastRenewed.getTime() + 5 * 365 * 24 * 60 * 60 * 1000)
  } else if (assetNameLower.includes('asbestos')) {
    // 2 years from last renewed
    nextDue = new Date(lastRenewed.getTime() + 2 * 365 * 24 * 60 * 60 * 1000)
  } else if (assetNameLower.includes('lift')) {
    // 6 months from last renewed
    nextDue = new Date(lastRenewed.getTime() + 6 * 30 * 24 * 60 * 60 * 1000)
  } else if (assetNameLower.includes('energy') || assetNameLower.includes('epc')) {
    // 10 years from last renewed
    nextDue = new Date(lastRenewed.getTime() + 10 * 365 * 24 * 60 * 60 * 1000)
  }
  
  return {
    last_renewed_date: lastRenewed.toISOString().split('T')[0],
    next_due_date: nextDue ? nextDue.toISOString().split('T')[0] : null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const body: ExtractRequest = await request.json()
    
    if (!body.fileUrl || !body.assetName) {
      return NextResponse.json(
        { error: 'Missing required fields: fileUrl and assetName' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('🔍 Starting AI extraction for:', body.assetName)

    // Download and process the document
    const response = await fetch(body.fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Determine file type
    const fileExtension = body.fileUrl.split('.').pop()?.toLowerCase()
    const mimeType = fileExtension === 'pdf' ? 'application/pdf' : 'image/jpeg'

    // Create OpenAI vision prompt
    const assetSpecificPrompt = getAssetSpecificPrompt(body.assetName)
    
    const prompt = `You are an expert compliance document analyzer. Analyze this ${body.assetName} document and extract the following information:

${assetSpecificPrompt}

Please extract and return ONLY the following information in JSON format:
1. title: The official title of the document
2. summary: A brief summary of the document's key points (max 200 words)
3. last_renewed_date: The date when this document was last issued/renewed (YYYY-MM-DD format)
4. next_due_date: The date when this document needs to be renewed next (YYYY-MM-DD format, or null if not specified)

Focus on finding:
- Document titles and reference numbers
- Issue dates, renewal dates, and expiry dates
- Key compliance requirements and findings
- Next review or renewal deadlines

Return ONLY valid JSON with these exact field names.`

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    console.log('🤖 AI Response:', aiResponse)

    // Parse AI response
    let extractedData: ExtractedData
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in AI response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      
      // Fallback: extract dates from text and create structured response
      const dates = extractDates(aiResponse)
      
      extractedData = {
        title: aiResponse.match(/title[:\s]+([^\n\r,}]+)/i)?.[1]?.trim() || body.assetName,
        summary: aiResponse.match(/summary[:\s]+([^\n\r}]+)/i)?.[1]?.trim() || 
                aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : ''),
        last_renewed_date: dates.last_renewed_date,
        next_due_date: dates.next_due_date
      }
    }

    // Validate and clean extracted data
    const cleanedData: ExtractedData = {
      title: extractedData.title?.trim() || body.assetName,
      summary: extractedData.summary?.trim() || 'Document processed successfully',
      last_renewed_date: extractedData.last_renewed_date || '',
      next_due_date: extractedData.next_due_date || null
    }

    // Additional date extraction if AI didn't find dates
    if (!cleanedData.last_renewed_date || !cleanedData.next_due_date) {
      const fallbackDates = extractDates(aiResponse)
      if (!cleanedData.last_renewed_date && fallbackDates.last_renewed_date) {
        cleanedData.last_renewed_date = fallbackDates.last_renewed_date
      }
      if (!cleanedData.next_due_date && fallbackDates.next_due_date) {
        cleanedData.next_due_date = fallbackDates.next_due_date
      }
    }

    console.log('✅ Extraction completed successfully')

    return NextResponse.json(cleanedData)

  } catch (error) {
    console.error('❌ Extraction error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to extract document metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
