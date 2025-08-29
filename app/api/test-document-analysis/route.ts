import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { text, filename } = await request.json();
    
    if (!text || !filename) {
      return NextResponse.json({ error: 'Text and filename are required' }, { status: 400 });
    }
    
    console.log('🧪 Testing document analysis with:', {
      filename,
      textLength: text.length,
      textPreview: text.substring(0, 200) + '...'
    });
    
    // Test the analyzeDocument function directly
    const analysis = await analyzeDocument(text, filename, 'Test analysis');
    
    console.log('✅ Document analysis result:', {
      documentType: analysis.documentType,
      classification: analysis.classification,
      summary: analysis.summary?.substring(0, 100) + '...',
      hasExtractedText: !!analysis.extractedText,
      extractedTextLength: analysis.extractedText?.length || 0,
      analysisKeys: Object.keys(analysis)
    });
    
    return NextResponse.json({
      success: true,
      analysis: {
        documentType: analysis.documentType,
        classification: analysis.classification,
        summary: analysis.summary,
        hasExtractedText: !!analysis.extractedText,
        extractedTextLength: analysis.extractedText?.length || 0,
        analysisKeys: Object.keys(analysis)
      }
    });
    
  } catch (error) {
    console.error('❌ Document analysis test failed:', error);
    
    return NextResponse.json({ 
      error: 'Document analysis test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
