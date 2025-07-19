import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { replyText } = await request.json();

    if (!replyText || typeof replyText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid reply text provided' },
        { status: 400 }
      );
    }

    // Call OpenAI API to improve the draft
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional email assistant. Improve the given email draft to make it more polished, professional, and clear while maintaining the original intent and tone. Keep any HTML formatting tags intact.'
          },
          {
            role: 'user',
            content: `Please polish and improve this email draft:\n\n${replyText}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const improvedDraft = data.choices[0]?.message?.content;

    if (!improvedDraft) {
      throw new Error('No response from OpenAI');
    }

    return NextResponse.json({
      success: true,
      improvedDraft: improvedDraft.trim()
    });

  } catch (error) {
    console.error('Error improving draft:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to improve draft' 
      },
      { status: 500 }
    );
  }
} 