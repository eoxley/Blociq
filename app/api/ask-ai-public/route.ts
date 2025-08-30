import { NextRequest, NextResponse } from 'next/server';

// OCR processing function (same as in ask-ai route)
async function processFileWithOCR(file: File): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ocr-proxy`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`OCR service responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      text: result.text || '',
      success: result.success || false,
      error: result.error
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OCR error'
    };
  }
}

// Enhanced lease document detection
function isLeaseDocument(filename: string, ocrText: string): boolean {
  const lowerFilename = filename.toLowerCase();
  const lowerOcrText = ocrText.toLowerCase();
  
  const leaseKeywords = ['lease', 'agreement', 'tenancy', 'rental', 'landlord', 'tenant'];
  
  return leaseKeywords.some(keyword => 
    lowerFilename.includes(keyword) || lowerOcrText.includes(keyword)
  );
}

// Create enhanced prompt with OCR content
function createEnhancedPrompt(originalPrompt: string, files: Array<{name: string, ocrText: string, ocrSuccess: boolean}>): string {
  let enhancedPrompt = originalPrompt;
  
  files.forEach(file => {
    if (file.ocrSuccess && file.ocrText) {
      const isLease = isLeaseDocument(file.name, file.ocrText);
      
      if (isLease) {
        // Enhanced lease document analysis
        const truncatedText = file.ocrText.substring(0, 8000);
        enhancedPrompt += `\n\n📋 LEASE DOCUMENT ANALYSIS FOR: ${file.name}
        
DOCUMENT CONTENT:
${truncatedText}

Please provide a comprehensive lease analysis including:

PROPERTY DETAILS SUMMARY:
- Property address and description
- Lease term and dates
- Monthly rent and additional costs

FINANCIAL OBLIGATIONS:
- Security deposit amount
- Utility responsibilities
- Additional fees or charges

COMPLIANCE CHECKLIST (Answer Y/N for each):
- Term Consent: Are lease terms clearly defined?
- Reserve Fund: Is reserve fund contribution specified?
- Windows/Pipes/Heating: Are maintenance responsibilities clear?
- Parking: Are parking arrangements specified?
- Right of Access: Are landlord access rights defined?
- TV/Assignment/Alterations: Are modification rules clear?
- Notice Requirements: Are notice periods specified?
- Sublet/Pets: Are subletting and pet policies clear?
- Debt Recovery/Interest: Are late payment terms defined?
- Exterior/Interior Decorations: Are decoration rules specified?

KEY RISKS AND RECOMMENDATIONS:
- Highlight any unusual or concerning clauses
- Suggest areas requiring clarification
- Recommend legal review if needed`;
      } else {
        // Standard document processing
        const truncatedText = file.ocrText.substring(0, 2000);
        enhancedPrompt += `\n\n📄 DOCUMENT CONTENT FROM: ${file.name}
${truncatedText}

Please analyze this document content in your response.`;
      }
    } else {
      enhancedPrompt += `\n\n📎 FILE ATTACHED: ${file.name} (OCR processing ${file.ocrSuccess ? 'completed' : 'failed'})`;
    }
  });
  
  return enhancedPrompt;
}

export async function POST(req: NextRequest) {
  try {
    // Check if request is FormData (from homepage) or JSON (from chat)
    const contentType = req.headers.get('content-type') || '';
    
    let prompt: string;
    let files: File[] = [];
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData from homepage
      console.log('Processing FormData request from homepage');
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      
      // Extract uploaded files
      const uploadedFiles = formData.getAll('files') as File[];
      files = uploadedFiles.filter(file => file.size > 0);
      
      console.log(`Received prompt: "${prompt}"`);
      console.log(`Received ${files.length} files:`, files.map(f => `${f.name} (${f.size} bytes)`));
      
      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt is required' },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON from chat interface
      console.log('Processing JSON request from chat');
      const body = await req.json();
      prompt = body.prompt;
      
      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt is required' },
          { status: 400 }
        );
      }
    }
    
    // Process files with OCR if any were uploaded
    const processedFiles: Array<{name: string, ocrText: string, ocrSuccess: boolean}> = [];
    
    if (files.length > 0) {
      console.log(`Processing ${files.length} uploaded files with OCR...`);
      
      for (const file of files) {
        console.log(`Processing file: ${file.name} (${file.size} bytes)`);
        
        const ocrResult = await processFileWithOCR(file);
        processedFiles.push({
          name: file.name,
          ocrText: ocrResult.text,
          ocrSuccess: ocrResult.success
        });
        
        console.log(`OCR result for ${file.name}: ${ocrResult.success ? 'Success' : 'Failed'}`);
        if (ocrResult.success) {
          console.log(`Extracted ${ocrResult.text.length} characters of text`);
        }
      }
    }
    
    // Create enhanced prompt with OCR content
    const finalPrompt = processedFiles.length > 0 
      ? createEnhancedPrompt(prompt, processedFiles)
      : prompt;
    
    console.log('Final prompt length:', finalPrompt.length);
    
    // Make request to your AI service
    const aiResponse = await fetch(process.env.AI_API_ENDPOINT || 'https://your-ai-service.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        // Add any other headers your AI service requires
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        model: process.env.AI_MODEL || 'gpt-4', // Adjust based on your AI service
        max_tokens: 4000,
        temperature: 0.7,
        // Add any other parameters your AI service requires
      }),
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI service error:', aiResponse.status, errorText);
      throw new Error(`AI service responded with status: ${aiResponse.status}`);
    }
    
    const aiResult = await aiResponse.json();
    
    // Return response with OCR processing info
    return NextResponse.json({
      response: aiResult.choices?.[0]?.message?.content || aiResult.response || aiResult,
      filesProcessed: processedFiles.length,
      ocrResults: processedFiles.map(f => ({
        filename: f.name,
        ocrSuccess: f.ocrSuccess,
        hasText: f.ocrText.length > 0,
        textLength: f.ocrText.length
      })),
      success: true
    });
    
  } catch (error) {
    console.error('Ask AI Public API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
} 