import { NextRequest, NextResponse } from 'next/server';

// OCR processing function
async function processFileWithOCR(file: File): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Use your existing OCR microservice
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      console.error(`OCR service error: ${response.status} ${response.statusText}`);
      return {
        text: '',
        success: false,
        error: `OCR service responded with status: ${response.status}`
      };
    }
    
    const result = await response.json();
    return {
      text: result.text || '',
      success: result.success !== false, // Default to true if not specified
      error: result.error
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'OCR network error'
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
        // Enhanced lease document analysis for credibility
        const truncatedText = file.ocrText.substring(0, 8000);
        enhancedPrompt += `\n\n📋 LEASE DOCUMENT ANALYSIS FOR: ${file.name}
        
EXTRACTED DOCUMENT CONTENT:
${truncatedText}

🏠 COMPREHENSIVE LEASE ANALYSIS REQUIRED:

PROPERTY DETAILS SUMMARY:
- Extract property address and description
- Identify lease term and dates
- Calculate monthly rent and additional costs

FINANCIAL OBLIGATIONS BREAKDOWN:
- Security deposit amount and conditions
- Utility responsibilities (tenant vs landlord)
- Additional fees, charges, or penalties

LEGAL COMPLIANCE CHECKLIST (Provide Y/N answers):
- Term Consent: Are lease terms clearly defined and legally compliant?
- Reserve Fund: Is reserve fund contribution properly specified?
- Windows/Pipes/Heating: Are maintenance responsibilities clearly allocated?
- Parking: Are parking arrangements legally documented?
- Right of Access: Are landlord access rights properly defined with notice requirements?
- TV/Assignment/Alterations: Are modification rules compliant with local law?
- Notice Requirements: Are notice periods specified per legal requirements?
- Sublet/Pets: Are subletting and pet policies clearly stated?
- Debt Recovery/Interest: Are late payment terms legally compliant?
- Exterior/Interior Decorations: Are decoration rules reasonable and legal?

RISK ASSESSMENT & CREDIBLE RECOMMENDATIONS:
- Flag any unusual, unfair, or potentially illegal clauses
- Identify areas requiring immediate clarification
- Recommend professional legal review for high-risk items
- Provide specific guidance based on document content`;
      } else {
        // Standard document processing with credibility focus
        const truncatedText = file.ocrText.substring(0, 2000);
        enhancedPrompt += `\n\n📄 DOCUMENT ANALYSIS FOR: ${file.name}

EXTRACTED CONTENT:
${truncatedText}

Please provide a detailed analysis of this document content, including:
- Key findings and main points
- Important details or data extracted
- Actionable insights based on the content
- Any concerns or recommendations`;
      }
    } else {
      enhancedPrompt += `\n\n⚠️ FILE PROCESSING ISSUE: ${file.name} 
OCR Status: ${file.ocrSuccess ? 'Completed' : 'Failed'}
Note: Unable to extract text content for analysis. Response will be limited without document content.`;
    }
  });
  
  return enhancedPrompt;
}

export async function POST(req: NextRequest) {
  try {
    // 🚨 CRITICAL FIX: Handle both FormData and JSON
    const contentType = req.headers.get('content-type') || '';
    console.log('Request content-type:', contentType);
    
    let prompt: string;
    let files: File[] = [];
    
    if (contentType.includes('multipart/form-data')) {
      // ✅ FIX: Handle FormData from homepage
      console.log('✅ Processing FormData request from homepage');
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      
      // Extract uploaded files
      const uploadedFiles = formData.getAll('files') as File[];
      files = uploadedFiles.filter(file => file.size > 0);
      
      console.log(`Received prompt: "${prompt}"`);
      console.log(`Received ${files.length} files:`, files.map(f => `${f.name} (${f.size} bytes)`));
      
    } else {
      // Handle JSON requests
      console.log('✅ Processing JSON request');
      const body = await req.json();
      prompt = body.prompt;
      
      // Handle files if included in JSON (base64 format)
      if (body.files && Array.isArray(body.files)) {
        // Convert base64 files back to File objects
        files = body.files.map((fileData: any) => {
          const byteCharacters = atob(fileData.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          return new File([byteArray], fileData.name, { type: fileData.type });
        });
      }
    }
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // 🔍 CRITICAL: Process files with OCR for credibility
    const processedFiles: Array<{name: string, ocrText: string, ocrSuccess: boolean}> = [];
    
    if (files.length > 0) {
      console.log(`🔍 Processing ${files.length} files with OCR for credible document analysis...`);
      
      for (const file of files) {
        console.log(`🔍 OCR processing: ${file.name} (${file.size} bytes)`);
        
        const ocrResult = await processFileWithOCR(file);
        processedFiles.push({
          name: file.name,
          ocrText: ocrResult.text,
          ocrSuccess: ocrResult.success
        });
        
        console.log(`📊 OCR result for ${file.name}: ${ocrResult.success ? 'SUCCESS' : 'FAILED'}`);
        if (ocrResult.success) {
          console.log(`📝 Extracted ${ocrResult.text.length} characters`);
        } else {
          console.log(`❌ OCR Error: ${ocrResult.error}`);
        }
      }
    }
    
    // 🎯 Create enhanced prompt with OCR content for credible responses
    const finalPrompt = processedFiles.length > 0 
      ? createEnhancedPrompt(prompt, processedFiles)
      : prompt;
    
    console.log('📏 Final prompt length:', finalPrompt.length);
    console.log('🔍 OCR-enhanced prompt created for credible document analysis');
    
    // 🤖 Send to AI service with document content
    const aiResponse = await fetch(process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY || process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are BlocIQ AI, a helpful assistant that provides detailed analysis of uploaded documents. When documents are provided, always reference their specific content in your responses for credibility.'
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('🤖 AI service error:', aiResponse.status, errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }
    
    const aiResult = await aiResponse.json();
    
    // 📊 Return credible response with OCR processing details
    return NextResponse.json({
      response: aiResult.choices?.[0]?.message?.content || aiResult.response || 'No response generated',
      filesProcessed: processedFiles.length,
      ocrResults: processedFiles.map(f => ({
        filename: f.name,
        ocrSuccess: f.ocrSuccess,
        hasText: f.ocrText.length > 0,
        textLength: f.ocrText.length,
        isLeaseDocument: f.ocrSuccess ? isLeaseDocument(f.name, f.ocrText) : false
      })),
      success: true,
      credibilityNote: processedFiles.length > 0 
        ? `✅ Document content analyzed via OCR for credible responses`
        : 'No documents processed'
    });
    
  } catch (error) {
    console.error('💥 Ask AI Public API error:', error);
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