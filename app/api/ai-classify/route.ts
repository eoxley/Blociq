import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai-client';

interface ClassifyEmailRequest {
  emailId: string;
  subject: string | null;
  body: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body }: ClassifyEmailRequest = await req.json();
    
    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize OpenAI client
    const openai = getOpenAIClient();

    // Create the prompt for email classification
    const systemPrompt = `You are a professional property management assistant. Your task is to classify emails into appropriate categories for property management and leasehold administration.

Available categories:
- complaint: Issues, grievances, or complaints from leaseholders
- query: General questions or information requests
- maintenance: Building maintenance, repairs, or service requests
- compliance: Regulatory, legal, or compliance matters
- financial: Rent, service charges, or financial matters
- emergency: Urgent or emergency situations
- notice: Official notices or announcements
- general: General correspondence not fitting other categories

Guidelines for classification:
- Analyze the content, tone, and context of the email
- Consider the urgency and nature of the request
- Focus on property management and leasehold context
- Use British English terminology
- Provide confidence level (high/medium/low) for the classification
- Suggest multiple categories if the email fits multiple types

Return the classification as a JSON object with categories array and confidence level.`;

    const userPrompt = `Please classify the following email:

Subject: ${subject || 'No subject'}

Content:
${body || 'No content available'}

Analyze this email and classify it into appropriate property management categories. Consider the context, urgency, and nature of the request.

Return your response as a JSON object with:
- categories: array of relevant categories
- confidence: "high", "medium", or "low"
- reasoning: brief explanation of the classification`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    
    let classification;
    try {
      classification = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse classification response:', parseError);
      classification = {
        categories: ['general'],
        confidence: 'low',
        reasoning: 'Failed to parse AI response'
      };
    }

    // Ensure we have valid categories
    const validCategories = [
      'complaint', 'query', 'maintenance', 'compliance', 
      'financial', 'emergency', 'notice', 'general'
    ];
    
    const categories = classification.categories?.filter((cat: string) => 
      validCategories.includes(cat)
    ) || ['general'];

    // Update the email with the classification
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({ 
        categories: categories,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailId);

    if (updateError) {
      console.error('Error updating email classification:', updateError);
    }

    // Log the classification for debugging
    console.log(`🏷️ Email ${emailId} classified as: ${categories.join(', ')}`);

    return NextResponse.json({ 
      success: true,
      categories: categories,
      confidence: classification.confidence || 'medium',
      reasoning: classification.reasoning || 'AI classification completed',
      emailId: emailId
    });

  } catch (error) {
    console.error('❌ Error in ai-classify:', error);
    
    return NextResponse.json({ 
      error: 'Failed to classify email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 