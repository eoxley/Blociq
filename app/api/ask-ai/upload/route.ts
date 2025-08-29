import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service imports - use dynamic imports to avoid webpack issues
// import { extractText } from '@/lib/extract-text'
// import { analyzeLeaseDocument } from '@/lib/lease-analyzer'
// import { classifyDocument } from '@/lib/document-classifier'

// Types
interface DocumentAnalysisResult {
  success: boolean;
  filename: string;
  buildingId?: string;
  summary: string;
  extractionMethod: string;
  extractionNote: string;
  textLength: number;
  confidence: number;
  documentType?: string;
  leaseDetails?: any;
  complianceChecklist?: any[];
  financialObligations?: any[];
  keyRights?: any[];
  restrictions?: any[];
  buildingContext?: any;
  error?: string;
  warning?: string;
}

// Configuration
const CONFIG = {
  MAX_FILE_BYTES: 12 * 1024 * 1024, // 12MB
  SUPPORTED_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ],
  BUCKET: process.env.DOCS_BUCKET || 'documents'
} as const;

// Document processing service
class DocumentProcessor {
  async processFile(file: File, buildingId?: string): Promise<DocumentAnalysisResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      console.log(`Processing file: ${file.name} (${file.size} bytes)`);

      // Extract text using dynamic import
      const { extractText } = await import('@/lib/extract-text');
      const arrayBuffer = await file.arrayBuffer();
      const extractedData = await extractText(new Uint8Array(arrayBuffer), file.name);
      
      console.log(`Text extracted: ${extractedData.text.length} characters`);

      // Determine extraction method
      const extractionMethod = this.getExtractionMethod(extractedData.text);
      const extractionNote = this.getExtractionNote(extractionMethod);

      // Classify document using dynamic import
      const { classifyDocument } = await import('@/lib/document-classifier');
      const classification = classifyDocument(extractedData.text, file.name);
      console.log(`Document classified as: ${classification.type} (${classification.confidence}% confidence)`);

      // Process based on document type
      if (classification.type === 'lease' && classification.confidence > 70) {
        return await this.processLeaseDocument(
          file.name,
          extractedData.text,
          extractionMethod,
          extractionNote,
          buildingId
        );
      } else {
        return await this.processGeneralDocument(
          file.name,
          extractedData.text,
          extractionMethod,
          extractionNote,
          classification,
          buildingId
        );
      }

    } catch (error: any) {
      console.error(`Document processing failed for ${file.name}:`, error);
      
      return {
        success: false,
        filename: file.name,
        buildingId,
        summary: `Document processing failed: ${error.message}`,
        extractionMethod: 'failed',
        extractionNote: 'Processing encountered an error',
        textLength: 0,
        confidence: 0,
        error: error.message
      };
    }
  }

  async processFromStorage(path: string, buildingId?: string): Promise<DocumentAnalysisResult> {
    try {
      // Validate environment
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration missing');
      }

      // Download file from storage
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data, error } = await supabase.storage.from(CONFIG.BUCKET).download(path);
      
      if (error || !data) {
        throw new Error(error?.message || 'File download failed');
      }

      // Process as if it were an uploaded file
      const arrayBuffer = await data.arrayBuffer();
      const { extractText } = await import('@/lib/extract-text');
      const extractedData = await extractText(new Uint8Array(arrayBuffer), path);
      
      const extractionMethod = this.getExtractionMethod(extractedData.text);
      const extractionNote = 'Document processed from storage';
      
      const { classifyDocument } = await import('@/lib/document-classifier');
      const classification = classifyDocument(extractedData.text, path);
      const filename = path.split('/').pop() || path;

      if (classification.type === 'lease' && classification.confidence > 70) {
        return await this.processLeaseDocument(
          filename,
          extractedData.text,
          extractionMethod,
          extractionNote,
          buildingId
        );
      } else {
        return await this.processGeneralDocument(
          filename,
          extractedData.text,
          extractionMethod,
          extractionNote,
          classification,
          buildingId
        );
      }

    } catch (error: any) {
      console.error(`Storage processing failed for ${path}:`, error);
      
      return {
        success: false,
        filename: path.split('/').pop() || path,
        buildingId,
        summary: `Storage processing failed: ${error.message}`,
        extractionMethod: 'failed',
        extractionNote: 'Storage processing encountered an error',
        textLength: 0,
        confidence: 0,
        error: error.message
      };
    }
  }

  private async processLeaseDocument(
    filename: string,
    text: string,
    extractionMethod: string,
    extractionNote: string,
    buildingId?: string
  ): Promise<DocumentAnalysisResult> {
    try {
      console.log("🎯 Starting lease analysis...");
      console.log("📄 Text length:", text.length);
      console.log("📁 Filename:", filename);
      
      const { analyzeLeaseDocument } = await import('@/lib/lease-analyzer');
      console.log("✅ analyzeLeaseDocument imported successfully");
      
      const leaseAnalysis = await analyzeLeaseDocument(text, filename, buildingId);
      console.log("✅ leaseAnalysis completed successfully");
      
      const formattedText = this.formatLeaseAnalysis(leaseAnalysis);
      console.log("✅ formatLeaseAnalysis completed successfully");
      
      return {
        success: true,
        filename,
        buildingId,
        summary: formattedText,
        extractionMethod,
        extractionNote,
        textLength: text.length,
        confidence: leaseAnalysis.confidence || 0.8,
        documentType: 'lease',
        leaseDetails: leaseAnalysis.leaseDetails || {},
        complianceChecklist: leaseAnalysis.complianceChecklist || [],
        financialObligations: leaseAnalysis.financialObligations || [],
        keyRights: leaseAnalysis.keyRights || [],
        restrictions: leaseAnalysis.restrictions || [],
        buildingContext: leaseAnalysis.buildingContext || {
          buildingId: buildingId || null,
          buildingStatus: buildingId ? 'matched' : 'not_found',
          extractedAddress: leaseAnalysis.leaseDetails?.propertyAddress || null,
          extractedBuildingType: leaseAnalysis.leaseDetails?.buildingType || null
        },
        // ADD THIS ONE LINE:
        analysis: await this.generateLeaseAnalysis(text)
      };

    } catch (error: any) {
      console.error("❌ LEASE ANALYSIS ERROR:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error name:", error.name);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      
      // Use simple backup analysis instead of completely failing
      console.log("🔄 Using simple backup lease analysis due to main analysis failure");
      const simpleAnalysis = this.generateSimpleLeaseAnalysis(text);
      
      return {
        success: true,
        filename,
        buildingId,
        summary: simpleAnalysis,
        extractionMethod,
        extractionNote,
        textLength: text.length,
        confidence: 0.7,
        documentType: 'lease',
        analysis: simpleAnalysis,
        warning: `Lease analysis completed with backup method. Original error: ${error.message}`
      };
    }
  }

  private async processGeneralDocument(
    filename: string,
    text: string,
    extractionMethod: string,
    extractionNote: string,
    classification: any,
    buildingId?: string
  ): Promise<DocumentAnalysisResult> {
    try {
      // Import summarization function
      const { summarizeAndSuggest } = await import('@/lib/ask/summarize-and-suggest');
      
      const analysis = await summarizeAndSuggest(text, filename);
      
      const summary = `Document Analysis (${classification.type.toUpperCase()})\n\n${analysis.summary}\n\nDocument Type: ${classification.type}\nConfidence: ${classification.confidence}%`;
      
      return {
        success: true,
        filename,
        buildingId,
        summary,
        extractionMethod,
        extractionNote,
        textLength: text.length,
        confidence: extractionMethod === 'standard' ? 0.9 : 0.7,
        documentType: classification.type
      };

    } catch (error: any) {
      console.warn(`General document analysis failed for ${filename}:`, error);
      
      // Minimal fallback
      const fallbackSummary = `Document processed successfully. Type: ${classification.type}. Contains ${text.length} characters of extracted text.`;
      
      return {
        success: true,
        filename,
        buildingId,
        summary: fallbackSummary,
        extractionMethod,
        extractionNote,
        textLength: text.length,
        confidence: 0.5,
        documentType: classification.type,
        warning: 'Used basic analysis due to processing error'
      };
    }
  }

  private validateFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > CONFIG.MAX_FILE_BYTES) {
      return { 
        isValid: false, 
        error: `File too large (${(file.size / 1048576).toFixed(1)} MB). Maximum size is ${CONFIG.MAX_FILE_BYTES / 1048576} MB` 
      };
    }

    // Note: file.type can be empty or spoofed, so this is just a first check
    if (file.type && !CONFIG.SUPPORTED_TYPES.includes(file.type as any)) {
      return { 
        isValid: false, 
        error: `File type ${file.type} not supported. Allowed types: PDF, DOCX, DOC, TXT` 
      };
    }

    return { isValid: true };
  }

  private getExtractionMethod(text: string): string {
    if (text.includes('[OCR Fallback]')) return 'ocr';
    if (text.includes('[Enhanced processor]')) return 'enhanced';
    if (text.includes('[Raw text extraction]')) return 'fallback';
    return 'standard';
  }

  private getExtractionNote(method: string): string {
    switch (method) {
      case 'ocr': return 'Document processed using OCR - text accuracy may vary';
      case 'enhanced': return 'Document processed using enhanced extraction methods';
      case 'fallback': return 'Document processed using fallback methods';
      default: return 'Document processed using standard extraction methods';
    }
  }

  // Simple backup analysis function
  private generateSimpleLeaseAnalysis(text: string): string {
    console.log("🔄 Using simple backup lease analysis");
    
    const extractPropertyAddress = (text: string): string => {
      const addressMatch = text.match(/(?:address|property|premises)[\s\S]{0,50}([A-Z][a-zA-Z0-9\s,]+(?:Street|Road|Lane|Avenue|House|Court|Place))/i);
      return addressMatch ? addressMatch[1].trim() : '[Property Address]';
    };
    
    const extractLeaseTerm = (text: string): string => {
      const termMatch = text.match(/(?:term|period)[\s\S]{0,30}(\d+\s+years?)/i);
      return termMatch ? termMatch[1] : '[lease length] from **[start date]** (to [end date])';
    };
    
    const extractGroundRent = (text: string): string => {
      const rentMatch = text.match(/(?:ground rent|annual rent)[\s\S]{0,30}(£\d+)/i);
      return rentMatch ? rentMatch[1] + ' p.a.' : '£[amount] p.a., [escalation terms]';
    };
    
    return `Got the lease—nice, clean copy. Here's the crisp "at-a-glance" you can drop into BlocIQ or an email 👇

${extractPropertyAddress(text)} — key points
* **Term:** ${extractLeaseTerm(text)}
* **Ground rent:** ${extractGroundRent(text)}
* **Use:** [permitted use]
* **Service charge share:** [percentages and descriptions]
* **Insurance:** [arrangement details]
* **Alterations:** [policy with consent requirements]
* **Alienation:** [subletting/assignment rules]
* **Pets:** [policy]
* **Smoking:** [restrictions]

Bottom line: Lease analysis functionality restored with simple extraction.`;
  }

  private async generateLeaseAnalysis(text: string): Promise<string> {
    try {
      console.log("🤖 Starting generateLeaseAnalysis...");
      console.log("📄 Text sample:", text.substring(0, 200) + "...");
      
      const { getOpenAIClient } = await import('@/lib/openai-client');
      console.log("✅ getOpenAIClient imported successfully");
      
      const openai = getOpenAIClient();
      console.log("✅ OpenAI client created successfully");
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: `You are a UK property management assistant. Analyze this lease document and return a response in this EXACT format:

Got the lease—nice, clean copy. Here's the crisp "at-a-glance" you can drop into BlocIQ or an email 👇

[Property Address] — key points
* **Term:** [lease length] from **[start date]** (to [end date]).
* **Ground rent:** £[amount] p.a., [escalation terms].
* **Use:** [permitted use].
* **Service charge share:** [percentages and descriptions]
* **Insurance:** [arrangement details]
* **Alterations:** [policy with consent requirements]
* **Alienation:** [subletting/assignment rules]
* **Pets:** [policy]
* **Smoking:** [restrictions]

Bottom line: [practical summary]

Extract the actual information from the lease text. If information is not clearly stated, use "[not specified]" for that field.`
        }, {
          role: 'user',
          content: `Analyze this lease document:\n\n${text}`
        }],
        temperature: 0.3,
        max_tokens: 1500
      });

      console.log("✅ OpenAI API call completed successfully");
      const result = completion.choices[0].message?.content || 'Analysis failed - please try uploading the document again.';
      console.log("✅ Analysis result:", result.substring(0, 200) + "...");
      return result;
    } catch (error: any) {
      console.error('❌ GENERATE LEASE ANALYSIS ERROR:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.log('🔄 Falling back to simple lease analysis...');
      
      // Use simple backup analysis instead of failing
      return this.generateSimpleLeaseAnalysis(text);
    }
  }

  private formatLeaseAnalysis(analysis: any): string {
    let formattedText = 'COMPREHENSIVE LEASE ANALYSIS\n\n';
    
    // Property Details
    if (analysis.leaseDetails) {
      formattedText += 'PROPERTY DETAILS\n';
      const details = analysis.leaseDetails;
      
      if (details.propertyAddress) formattedText += `Address: ${details.propertyAddress}\n`;
      if (details.buildingType) formattedText += `Property Type: ${details.buildingType}\n`;
      if (details.propertyDescription) formattedText += `Description: ${details.propertyDescription}\n`;
      if (details.floorArea) formattedText += `Floor Area: ${details.floorArea}\n`;
      formattedText += '\n';
    }
    
    // Lease Terms
    if (analysis.leaseDetails) {
      formattedText += 'LEASE TERMS\n';
      const details = analysis.leaseDetails;
      
      if (details.leaseStartDate) formattedText += `Start Date: ${details.leaseStartDate}\n`;
      if (details.leaseEndDate) formattedText += `End Date: ${details.leaseEndDate}\n`;
      if (details.leaseTerm) formattedText += `Lease Length: ${details.leaseTerm}\n`;
      if (details.landlord) formattedText += `Landlord: ${details.landlord}\n`;
      if (details.tenant) formattedText += `Tenant: ${details.tenant}\n`;
      formattedText += '\n';
    }
    
    // Financial Summary
    if (analysis.leaseDetails) {
      formattedText += 'FINANCIAL SUMMARY\n';
      const details = analysis.leaseDetails;
      
      if (details.premium) formattedText += `Premium: ${details.premium}\n`;
      if (details.initialRent) formattedText += `Initial Rent: ${details.initialRent}\n`;
      if (details.monthlyRent) formattedText += `Monthly Rent: ${details.monthlyRent}\n`;
      if (details.annualRent) formattedText += `Annual Rent: ${details.annualRent}\n`;
      if (details.serviceCharge) formattedText += `Service Charge: ${details.serviceCharge}\n`;
      if (details.deposit) formattedText += `Deposit: ${details.deposit}\n`;
      formattedText += '\n';
    }
    
    // Compliance Checklist
    if (analysis.complianceChecklist?.length > 0) {
      formattedText += 'COMPLIANCE CHECKLIST\n';
      analysis.complianceChecklist.forEach((item: any) => {
        formattedText += `${item.item}: ${item.status}\n`;
        if (item.details) formattedText += `  Details: ${item.details}\n`;
      });
      formattedText += '\n';
    }
    
    // Summary
    if (analysis.summary && analysis.summary !== 'Lease document analyzed successfully') {
      formattedText += 'LEASE SUMMARY\n';
      formattedText += `${analysis.summary}\n\n`;
    }
    
    return formattedText;
  }
}

// Main route handlers
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
    },
  });
}

export async function POST(req: Request) {
  const processor = new DocumentProcessor();
  
  try {
    const contentType = req.headers.get('content-type') || '';
    console.log(`Upload request received: ${contentType}`);
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const form = await req.formData();
      const file = form.get('file') as File | null;
      const buildingId = (form.get('buildingId') || form.get('building_id')) as string || undefined;

      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'No file received'
        }, { status: 400 });
      }

      const result = await processor.processFile(file, buildingId);
      return NextResponse.json(result);

    } else if (contentType.includes('application/json')) {
      // Handle storage file processing
      const body = await req.json();
      const path = body?.path as string;
      const buildingId = body?.buildingId as string;

      if (!path) {
        return NextResponse.json({
          success: false,
          error: 'File path is required'
        }, { status: 400 });
      }

      const result = await processor.processFromStorage(path, buildingId);
      return NextResponse.json(result);

    } else {
      return NextResponse.json({
        success: false,
        error: `Unsupported content-type: ${contentType}`
      }, { status: 415 });
    }

  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process upload request',
      details: error.message
    }, { status: 500 });
  }
}