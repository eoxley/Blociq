import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { subject, body } = await request.json()

    if (!subject && !body) {
      return NextResponse.json(
        { error: 'Subject or body is required' },
        { status: 400 }
      )
    }

    const prompt = `Analyse this incoming email and classify it with appropriate tags and urgency level using British English.

Email Subject: ${subject || 'No subject'}
Email Body: ${body || 'No body content'}

Available tags: Urgent, Compliance, Leaseholder, General, Maintenance, Financial, Legal, Emergency, Routine

Instructions:
1. Analyse the content for urgency, compliance issues, leaseholder concerns, and general management topics
2. Select the most relevant tags (1-4 tags maximum)
3. Determine if this email should be flagged as urgent (flag_status = 'flagged')
4. Provide a confidence score (0-100) for your classification

Return your response as a JSON object with this exact structure:
{
  "tags": ["tag1", "tag2"],
  "flag_status": "flagged" or "notFlagged",
  "confidence": 85,
  "reasoning": "Brief explanation of classification using British English"
}

Focus on:
- Urgent: Time-sensitive issues, emergencies, immediate action required
- Compliance: Regulatory issues, safety concerns, legal requirements
- Leaseholder: Tenant complaints, requests, lease-related issues
- Maintenance: Building repairs, equipment issues, property management
- Financial: Rent, fees, payments, budget concerns
- Legal: Contract issues, disputes, legal proceedings
- Emergency: Immediate safety or security issues
- Routine: Regular maintenance, standard inquiries, non-urgent matters
- General: Administrative tasks, general inquiries, non-specific issues`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert property management assistant using British English. Analyse emails and classify them with appropriate tags and urgency levels. Always respond with valid JSON using British spelling and terminology.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let parsedResponse
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText)
      throw new Error('Invalid AI response format')
    }

    // Validate and sanitize the response
    const validTags = ['Urgent', 'Compliance', 'Leaseholder', 'General', 'Maintenance', 'Financial', 'Legal', 'Emergency', 'Routine']
    const validFlagStatuses = ['flagged', 'notFlagged']

    const tags = Array.isArray(parsedResponse.tags) 
      ? parsedResponse.tags.filter((tag: string) => validTags.includes(tag))
      : []

    const flagStatus = validFlagStatuses.includes(parsedResponse.flag_status) 
      ? parsedResponse.flag_status 
      : 'notFlagged'

    const confidence = typeof parsedResponse.confidence === 'number' 
      ? Math.max(0, Math.min(100, parsedResponse.confidence))
      : 50

    const reasoning = typeof parsedResponse.reasoning === 'string' 
      ? parsedResponse.reasoning 
      : 'AI classification completed'

    return NextResponse.json({
      tags,
      flag_status: flagStatus,
      confidence,
      reasoning,
      success: true
    })

  } catch (error) {
    console.error('AI classification error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to classify email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 