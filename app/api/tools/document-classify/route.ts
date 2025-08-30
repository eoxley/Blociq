// Document Classification Endpoint
// Automatically classifies documents into types using AI

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { documentId, content, fileName } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    if (!content && !fileName) {
      return NextResponse.json({ error: 'Content or filename is required' }, { status: 400 });
    }

    console.log('🔍 Classifying document:', documentId);

    // Use OpenAI to classify document type
    const classificationPrompt = `Classify this document into one of these categories:
- insurance (insurance policies, certificates, claims)
- lease (lease agreements, tenancy documents)
- compliance (safety certificates, inspection reports, regulatory documents)
- maintenance (repair reports, maintenance schedules, work orders)
- financial (service charge accounts, budgets, invoices)
- correspondence (letters, emails, notices)
- other (anything that doesn't fit above categories)

Document: ${fileName || 'Unknown filename'}
Content preview: ${content ? content.substring(0, 1000) : 'No content available'}

Return only the category name, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a document classification expert. Return only the category name.'
      }, {
        role: 'user',
        content: classificationPrompt
      }],
      temperature: 0.1,
      max_tokens: 10
    });
    
    const classification = completion.choices[0]?.message?.content?.trim().toLowerCase();
    
    if (!classification) {
      throw new Error('Failed to get classification from AI');
    }

    // Validate classification
    const validTypes = ['insurance', 'lease', 'compliance', 'maintenance', 'financial', 'correspondence', 'other'];
    const finalClassification = validTypes.includes(classification) ? classification : 'other';

    // Update document with classification
    const supabase = createRouteHandlerClient({ cookies });
    
    const { error: updateError } = await supabase
      .from('building_documents')
      .update({ 
        type: finalClassification,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document classification:', updateError);
      throw new Error('Failed to update document');
    }

    // Log processing status
    await supabase
      .from('document_processing_status')
      .insert({
        document_id: documentId,
        status: 'completed',
        processing_type: 'classification',
        metadata: { 
          original_type: classification,
          final_type: finalClassification,
          confidence: 'high'
        }
      });

    console.log('✅ Document classified as:', finalClassification);

    return NextResponse.json({ 
      success: true, 
      classification: finalClassification,
      original_ai_response: classification
    });

  } catch (error) {
    console.error('❌ Document classification error:', error);
    
    // Log failed processing
    try {
      const supabase = createRouteHandlerClient({ cookies });
      await supabase
        .from('document_processing_status')
        .insert({
          document_id: documentId || 'unknown',
          status: 'failed',
          processing_type: 'classification',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          metadata: { error: true }
        });
    } catch (logError) {
      console.error('Failed to log error status:', logError);
    }

    return NextResponse.json({ 
      error: 'Classification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
