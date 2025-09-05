import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    
    // Document AI Configuration
    docAI: {
      enabled: process.env.USE_DOCUMENT_AI === 'true',
      location: process.env.DOCUMENT_AI_LOCATION,
      processorId: process.env.DOCUMENT_AI_PROCESSOR_ID ? 'configured' : 'missing',
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'missing',
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'configured' : 'missing',
    },
    
    // Other OCR APIs
    apis: {
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      googleVision: process.env.GOOGLE_VISION_API_KEY ? 'configured' : 'missing',
      googleCloudApiKey: process.env.GOOGLE_CLOUD_API_KEY ? 'configured' : 'missing',
    },
    
    // Supabase
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
    }
  };
  
  return NextResponse.json(diagnostics);
}

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 OCR Diagnostic Test Started');
    
    // Test 1: Basic environment check
    const useDocAI = process.env.USE_DOCUMENT_AI === 'true';
    const hasProcessor = !!process.env.DOCUMENT_AI_PROCESSOR_ID;
    
    console.log(`DocAI enabled: ${useDocAI}, Processor configured: ${hasProcessor}`);
    
    // Test 2: Try importing our OCR modules
    try {
      const { extractText } = await import('@/lib/extract-text');
      console.log('✅ extract-text module imported successfully');
      
      // Test 3: Check if Document AI client can be imported
      if (useDocAI && hasProcessor) {
        const { docaiProcessToText } = await import('@/lib/docai/client');
        console.log('✅ Document AI client imported successfully');
      }
      
    } catch (importError) {
      console.error('❌ Module import failed:', importError);
      return NextResponse.json({ 
        error: 'Module import failed', 
        details: importError instanceof Error ? importError.message : 'Unknown import error' 
      }, { status: 500 });
    }
    
    // Test 4: Check if we can create a simple test file
    const formData = await req.formData().catch(() => null);
    if (formData) {
      const file = formData.get('file') as File;
      if (file) {
        console.log(`📄 Test file: ${file.name} (${file.size} bytes)`);
        
        // Try to process with our extract-text function
        const { extractText } = await import('@/lib/extract-text');
        try {
          const result = await extractText(file);
          console.log(`✅ OCR Result: ${result.source}, ${result.textLength} characters`);
          
          return NextResponse.json({
            success: true,
            source: result.source,
            textLength: result.textLength,
            hasPages: !!result.pages,
            pageCount: result.pages?.length || 0,
            preview: result.extractedText.substring(0, 200)
          });
          
        } catch (ocrError) {
          console.error('❌ OCR processing failed:', ocrError);
          return NextResponse.json({
            error: 'OCR processing failed',
            details: ocrError instanceof Error ? ocrError.message : 'Unknown OCR error'
          }, { status: 500 });
        }
      }
    }
    
    return NextResponse.json({
      message: 'OCR diagnostic endpoint ready',
      instructions: 'Send POST with file in FormData to test OCR processing'
    });
    
  } catch (error) {
    console.error('❌ Diagnostic test failed:', error);
    return NextResponse.json({
      error: 'Diagnostic test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}