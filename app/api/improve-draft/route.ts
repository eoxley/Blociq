// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for content
// - Try/catch with detailed error handling
// - Used in email draft components
// - Includes OpenAI integration with error handling
// - HTML content processing and formatting

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, improvementType, originalEmail, tone } = await request.json();

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    // Extract plain text from HTML content
    const plainText = content.replace(/<[^>]*>/g, '');

    let prompt = '';
    if (improvementType === 'polish') {
      prompt = `Please improve the following email draft by polishing the tone, fixing grammar, and making it more professional while maintaining the same meaning:

Original email context:
${originalEmail}

Current draft:
${plainText}

Please provide an improved version that:
- Fixes any grammar or spelling errors
- Improves sentence structure and flow
- Maintains a ${tone.toLowerCase()} tone
- Keeps the same core message and intent
- Uses clear, professional language

Return only the improved text without any explanations.`;
    } else if (improvementType === 'formal') {
      prompt = `Please make the following email draft more formal and professional while maintaining the same meaning:

Original email context:
${originalEmail}

Current draft:
${plainText}

Please provide a more formal version that:
- Uses more professional and formal language
- Maintains a ${tone.toLowerCase()} but formal tone
- Keeps the same core message and intent
- Uses proper business email conventions
- Is suitable for professional correspondence

Return only the improved text without any explanations.`;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email writing assistant. Provide clear, well-written email content that is appropriate for business communication.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const improvedContent = data.choices[0]?.message?.content?.trim();

    if (!improvedContent) {
      throw new Error('No content received from OpenAI');
    }

    // Convert plain text back to basic HTML formatting
    const htmlContent = improvedContent
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    return NextResponse.json({
      success: true,
      improvedContent: htmlContent,
      plainText: improvedContent
    });

  } catch (error) {
    console.error('Error improving draft:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to improve draft' },
      { status: 500 }
    );
  }
} 