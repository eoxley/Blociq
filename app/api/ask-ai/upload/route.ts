import { NextResponse } from 'next/server'

// If you use these, keep; otherwise swap to your own utils:
let extractText: (buf: Uint8Array, name?: string) => Promise<{ text: string; meta: { name: string; type: string; bytes: number } }>
let summarizeAndSuggest: (text: string, name?: string) => Promise<{ summary: string; suggestedActions?: any[] }>

// Enhanced document analysis functions
let analyzeLeaseDocument: ((text: string, filename: string, buildingId?: string) => Promise<any>) | null
let classifyDocument: ((text: string, filename: string) => any) | null

async function lazyDeps() {
  if (!extractText) {
    console.log('🔄 Loading extractText function...')
    // Enhanced fallback with OCR capabilities
    try {
      const mod = await import('@/lib/extract-text')
      extractText = mod.extractText
      console.log('✅ Using primary extractText from @/lib/extract-text')
    } catch {
      // Try alternative extraction methods
      try {
        console.log('🔄 Trying PDF extraction fallback...')
        const { extractTextFromPDF } = await import('@/lib/extractTextFromPdf')
        extractText = async (buf: Uint8Array, name?: string) => {
          try {
            const buffer = Buffer.from(buf)
            const result = await extractTextFromPDF(buffer, name || 'document')
            return {
              text: result.text,
              meta: { name: name || 'document', type: 'application/pdf', bytes: buf.length }
            }
          } catch (pdfError) {
            console.warn('PDF extraction failed:', pdfError)
            return {
              text: `[[PDF Extraction Failed]] ${name || 'document'} (${buf.length} bytes) - Unable to extract text`,
              meta: { name: name || 'document', type: 'application/pdf', bytes: buf.length }
            }
          }
        }
      } catch {
        // Final fallback with OCR
        try {
          console.log('🔄 Trying OCR fallback...')
          const { processDocumentOCR } = await import('@/lib/ocr')
          extractText = async (buf: Uint8Array, name?: string) => {
            try {
              // Create a File object from the buffer for OCR
              const file = new File([buf], name || 'document', { type: 'application/pdf' })
              const ocrResult = await processDocumentOCR(file)
              return {
                text: ocrResult.text || `[[OCR Fallback]] ${name || 'document'} (${buf.length} bytes) - OCR processed`,
                meta: { name: name || 'document', type: 'application/pdf', bytes: buf.length }
              }
            } catch (ocrError) {
              console.warn('OCR fallback failed:', ocrError)
              return {
                text: `[[OCR Fallback Failed]] ${name || 'document'} (${buf.length} bytes) - Unable to extract text`,
                meta: { name: name || 'document', type: 'application/pdf', bytes: buf.length }
              }
            }
          }
        } catch {
          // Ultimate fallback
          console.log('⚠️ Using ultimate fallback extractor')
          extractText = async (buf: Uint8Array, name?: string) => ({
            text: `[[Fallback extractor]] ${name || 'document'} (${buf.length} bytes). Unable to extract text - document may be image-based or corrupted.`,
            meta: { name: name || 'document', type: 'application/pdf', bytes: buf.length }
          })
        }
      }
    }
  }
  
  if (!summarizeAndSuggest) {
    try {
      const mod = await import('@/lib/ask/summarize-and-suggest')
      summarizeAndSuggest = mod.summarizeAndSuggest
    } catch {
      // Enhanced fallback with document analysis
      try {
        summarizeAndSuggest = async (text: string, name?: string) => {
          try {
            return {
              summary: `Summary of ${name || 'document'}: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`,
              suggestions: [
                'Confirm the document type and relevance.',
                'Assign to a property or general filing.',
                'Create any follow-up tasks or reminders.',
                'Review extracted text for accuracy.',
                'Consider manual verification if OCR was used.'
              ],
            }
          } catch (summaryError) {
            console.warn('Summary generation failed:', summaryError)
            return {
              summary: `Summary of ${name || 'document'}: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`,
              suggestions: [
                'Confirm the document type and relevance.',
                'Assign to a property or general filing.',
                'Create any follow-up tasks or reminders.',
              ],
            }
          }
        }
      } catch {
        // Super-light fallback; keep the route alive even if AI helper isn't ready
        summarizeAndSuggest = async (text: string, name?: string) => ({
          summary: `Summary placeholder for ${name || 'file'}: ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`,
          suggestions: [
            'Confirm the document type and relevance.',
            'Assign to a property or general filing.',
            'Create any follow-up tasks or reminders.',
          ],
        })
      }
    }
  }

  // Load enhanced document analysis functions
  if (!analyzeLeaseDocument) {
    try {
      console.log('🔄 Loading lease analyzer...')
      const mod = await import('@/lib/lease-analyzer')
      analyzeLeaseDocument = mod.analyzeLeaseDocument
      console.log('✅ Lease analyzer loaded successfully')
    } catch (error) {
      console.warn('Failed to load lease analyzer:', error)
      analyzeLeaseDocument = null
    }
  }

  if (!classifyDocument) {
    try {
      console.log('🔄 Loading document classifier...')
      const mod = await import('@/lib/document-classifier')
      classifyDocument = mod.classifyDocument
      console.log('✅ Document classifier loaded successfully')
    } catch (error) {
      console.warn('Failed to load document classifier:', error)
      classifyDocument = null
    }
  }


}

// Helper function to detect if document is a lease
function isLeaseDocument(filename: string, text: string): boolean {
  const filenameLower = filename.toLowerCase()
  const textLower = text.toLowerCase()
  
  // Check filename for lease indicators
  const leaseKeywords = ['lease', 'tenancy', 'rental', 'agreement', 'contract']
  const hasLeaseFilename = leaseKeywords.some(keyword => filenameLower.includes(keyword))
  
  // Check content for lease indicators
  const leaseContentKeywords = [
    'lease', 'tenant', 'landlord', 'rent', 'premium', 'service charge',
    'term of years', 'ground rent', 'leasehold', 'freehold', 'assignment',
    'subletting', 'break clause', 'forfeiture', 'covenant'
  ]
  const hasLeaseContent = leaseContentKeywords.some(keyword => textLower.includes(keyword))
  
  return hasLeaseFilename || hasLeaseContent
}

// Helper function to convert lease analysis to detailed formatted text
function formatLeaseAnalysisToText(analysis: any): string {
  console.log('🔍 Formatting lease analysis:', analysis);
  
  let formattedText = '📋 **COMPREHENSIVE LEASE ANALYSIS**\n\n'
  
  // Property Details
  if (analysis.leaseDetails) {
    formattedText += '**🏠 PROPERTY DETAILS**\n'
    if (analysis.leaseDetails.propertyAddress) {
      formattedText += `• Address: ${analysis.leaseDetails.propertyAddress}\n`
    }
    if (analysis.leaseDetails.buildingType) {
      formattedText += `• Property Type: ${analysis.leaseDetails.buildingType}\n`
    }
    if (analysis.leaseDetails.propertyDescription) {
      formattedText += `• Description: ${analysis.leaseDetails.propertyDescription}\n`
    }
    if (analysis.leaseDetails.floorArea) {
      formattedText += `• Floor Area: ${analysis.leaseDetails.floorArea}\n`
    }
    formattedText += '\n'
  }
  
  // Lease Terms
  if (analysis.leaseDetails) {
    formattedText += '**📅 LEASE TERMS**\n'
    if (analysis.leaseDetails.leaseStartDate) {
      formattedText += `• Start Date: ${analysis.leaseDetails.leaseStartDate}\n`
    }
    if (analysis.leaseDetails.leaseEndDate) {
      formattedText += `• End Date: ${analysis.leaseDetails.leaseEndDate}\n`
    }
    if (analysis.leaseDetails.leaseTerm) {
      formattedText += `• Lease Length: ${analysis.leaseDetails.leaseTerm}\n`
    }
    if (analysis.leaseDetails.landlord) {
      formattedText += `• Landlord: ${analysis.leaseDetails.landlord}\n`
    }
    if (analysis.leaseDetails.tenant) {
      formattedText += `• Tenant: ${analysis.leaseDetails.tenant}\n`
    }
    formattedText += '\n'
  }
  
  // Financial Summary
  if (analysis.leaseDetails) {
    formattedText += '**💰 FINANCIAL SUMMARY**\n'
    if (analysis.leaseDetails.premium) {
      formattedText += `• Premium: £${analysis.leaseDetails.premium}\n`
    }
    if (analysis.leaseDetails.initialRent) {
      formattedText += `• Initial Rent: £${analysis.leaseDetails.initialRent}\n`
    }
    if (analysis.leaseDetails.monthlyRent) {
      formattedText += `• Monthly Rent: £${analysis.leaseDetails.monthlyRent}\n`
    }
    if (analysis.leaseDetails.annualRent) {
      formattedText += `• Annual Rent: £${analysis.leaseDetails.annualRent}\n`
    }
    if (analysis.leaseDetails.serviceCharge) {
      formattedText += `• Service Charge: ${analysis.leaseDetails.serviceCharge}\n`
    }
    if (analysis.leaseDetails.deposit) {
      formattedText += `• Deposit: £${analysis.leaseDetails.deposit}\n`
    }
    formattedText += '\n'
  }
  
  // Compliance Checklist
  if (analysis.complianceChecklist && analysis.complianceChecklist.length > 0) {
    formattedText += '**🔍 COMPLIANCE CHECKLIST**\n'
    analysis.complianceChecklist.forEach((item: any, index: number) => {
      const status = item.status === 'Y' ? '✅' : item.status === 'N' ? '❌' : '❓'
      formattedText += `${status} ${item.item}: ${item.details || 'No details'}\n`
    })
    formattedText += '\n'
  }
  
  // Financial Obligations
  if (analysis.financialObligations && analysis.financialObligations.length > 0) {
    formattedText += '**💰 FINANCIAL OBLIGATIONS**\n'
    analysis.financialObligations.forEach((obligation: string, index: number) => {
      formattedText += `• ${obligation}\n`
    })
    formattedText += '\n'
  }
  
  // Key Rights
  if (analysis.keyRights && analysis.keyRights.length > 0) {
    formattedText += '**⚖️ KEY RIGHTS**\n'
    analysis.keyRights.forEach((right: string, index: number) => {
      formattedText += `• ${right}\n`
    })
    formattedText += '\n'
  }
  
  // Restrictions
  if (analysis.restrictions && analysis.restrictions.length > 0) {
    formattedText += '**🚫 RESTRICTIONS**\n'
    analysis.restrictions.forEach((restriction: string, index: number) => {
      formattedText += `• ${restriction}\n`
    })
    formattedText += '\n'
  }
  
  // Building Context
  if (analysis.buildingContext) {
    formattedText += '**🏢 BUILDING CONTEXT**\n'
    if (analysis.buildingContext.buildingStatus === 'not_found') {
      formattedText += `• Status: ⚠️ Building Not Found in Portfolio\n`
    } else if (analysis.buildingContext.buildingStatus === 'matched') {
      formattedText += `• Status: ✅ Building Matched in Portfolio\n`
    } else {
      formattedText += `• Status: ❓ Building Status Unknown\n`
    }
    
    if (analysis.buildingContext.extractedAddress) {
      formattedText += `• Extracted Address: ${analysis.buildingContext.extractedAddress}\n`
    }
    if (analysis.buildingContext.extractedBuildingType) {
      formattedText += `• Extracted Building Type: ${analysis.buildingContext.extractedBuildingType}\n`
    }
    formattedText += '\n'
  }
  
  // Summary
  if (analysis.summary && analysis.summary !== 'Lease document analyzed successfully') {
    formattedText += '**📝 LEASE SUMMARY**\n'
    formattedText += `${analysis.summary}\n\n`
  }
  
  console.log('🔍 Formatted text result:', formattedText.substring(0, 300) + '...');
  
  return formattedText;
}

// Required for Node-only PDF libs
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_FILE_BYTES = 12 * 1024 * 1024 // 12MB safety
const BUCKET = process.env.DOCS_BUCKET || 'documents'

// Allow preflight (defensive; same-origin form-data usually won't send this)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
    },
  })
}

export async function POST(req: Request) {
  await lazyDeps()
  const ct = req.headers.get('content-type') || ''
  try {
    // 1) Multipart: small drag-and-drop files
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      const buildingId = (form.get('buildingId') as string) || (form.get('building_id') as string) || null // accept both parameter names

      if (!file) return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 })
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { success: false, error: `File too large (${(file.size / 1048576).toFixed(1)} MB)`, code: 'FILE_TOO_LARGE' },
          { status: 413 }
        )
      }

      const ab = await file.arrayBuffer()
      const text = await extractText(new Uint8Array(ab), file.name)
      
      // Determine extraction method for user feedback
      let extractionMethod = 'standard';
      let extractionNote = '';
      
      if (text.text.includes('[OCR Fallback]')) {
        extractionMethod = 'ocr';
        extractionNote = 'Document processed using OCR - text accuracy may vary';
      } else if (text.text.includes('[Enhanced processor]')) {
        extractionMethod = 'enhanced';
        extractionNote = 'Document processed using enhanced extraction methods';
      } else if (text.text.includes('[Fallback extractor]')) {
        extractionMethod = 'fallback';
        extractionNote = 'Document processed using fallback methods';
      }

      // Enhanced document analysis for lease documents
      if (isLeaseDocument(file.name, text.text) && analyzeLeaseDocument) {
        console.log('🔍 ===== LEASE DOCUMENT DETECTED =====')
        console.log('🔍 File name:', file.name)
        console.log('🔍 Building ID:', buildingId)
        console.log('🔍 Text length:', text.text.length)
        console.log('🔍 analyzeLeaseDocument function available:', !!analyzeLeaseDocument)

        // CRITICAL DEBUGGING: Log the actual OCR content
        console.log('=== ACTUAL PDF CONTENT ===');
        console.log('OCR extracted text length:', text.text?.length);
        console.log('First 500 chars:', text.text?.substring(0, 500));
        console.log('Does text contain "landlord"?', text.text?.toLowerCase().includes('landlord'));
        console.log('Does text contain "£"?', text.text?.includes('£'));
        console.log('Does text contain "rent"?', text.text?.toLowerCase().includes('rent'));
        console.log('Does text contain "lease"?', text.text?.toLowerCase().includes('lease'));
        console.log('Does text contain "tenant"?', text.text?.toLowerCase().includes('tenant'));
        console.log('Does text contain "property"?', text.text?.toLowerCase().includes('property'));
        console.log('Does text contain "address"?', text.text?.toLowerCase().includes('address'));
        console.log('Does text contain "premium"?', text.text?.toLowerCase().includes('premium'));
        console.log('Does text contain "service charge"?', text.text?.toLowerCase().includes('service charge'));
        console.log('Does text contain "deposit"?', text.text?.toLowerCase().includes('deposit'));
        console.log('=== END PDF CONTENT ===');

        try {
          console.log('🔍 Calling analyzeLeaseDocument with:');
          console.log('  - text.text:', text.text.substring(0, 200) + '...');
          console.log('  - file.name:', file.name);
          console.log('  - buildingId:', buildingId);

          const leaseAnalysis = await analyzeLeaseDocument(text.text, file.name, buildingId || undefined)
          
          console.log('🔍 Lease analysis completed:', {
            summary: leaseAnalysis.summary,
            leaseDetails: leaseAnalysis.leaseDetails,
            complianceChecklist: leaseAnalysis.complianceChecklist,
            financialObligations: leaseAnalysis.financialObligations,
            buildingContext: leaseAnalysis.buildingContext
          })
          
          // Convert lease analysis to detailed formatted text
          const formattedText = formatLeaseAnalysisToText(leaseAnalysis)
          
          console.log('🔍 Formatted lease analysis:', formattedText.substring(0, 200) + '...')
          
          return NextResponse.json({
            success: true,
            filename: file.name,
            buildingId,
            summary: formattedText, // Use formatted text as the main summary
            extractionMethod,
            extractionNote,
            textLength: text.text.length,
            confidence: leaseAnalysis.confidence || 0.8,
            // Enhanced lease analysis data
            documentType: 'lease',
            leaseDetails: leaseAnalysis.leaseDetails || {},
            complianceChecklist: leaseAnalysis.complianceChecklist || [],
            financialObligations: leaseAnalysis.financialObligations || [],
            keyRights: leaseAnalysis.keyRights || [],
            restrictions: leaseAnalysis.restrictions || [],
            buildingContext: leaseAnalysis.buildingContext || {
              buildingId: buildingId,
              buildingStatus: buildingId ? 'matched' : 'not_found',
              extractedAddress: leaseAnalysis.leaseDetails?.propertyAddress || null,
              extractedBuildingType: leaseAnalysis.leaseDetails?.buildingType || null
            }
          })
        } catch (leaseError: any) {
          console.error('❌ Enhanced lease analysis failed:', leaseError)
          console.error('❌ Error details:', {
            message: leaseError.message,
            stack: leaseError.stack,
            name: leaseError.name
          })
          
          // Fall back to basic analysis if enhanced analysis fails
          const out = await summarizeAndSuggest(text.text, file.name)
          console.log('🔍 Fallback analysis result:', out)
          
          // Create a basic formatted response for non-lease documents
          const basicFormattedText = `📋 **BASIC DOCUMENT ANALYSIS**\n\n**Summary:**\n${out.summary}\n\n**Note:** Enhanced lease analysis failed. This is a basic summary of the document content.`
          
          return NextResponse.json({
            success: true,
            filename: file.name,
            buildingId,
            summary: basicFormattedText,
            extractionMethod,
            extractionNote,
            textLength: text.text.length,
            confidence: extractionMethod === 'standard' ? 'high' : 'medium',
            warning: 'Enhanced lease analysis failed, using basic analysis',
            error: leaseError.message
          })
        }
      } else {
        console.log('🔍 ===== NOT A LEASE DOCUMENT =====')
        console.log('🔍 File name:', file.name)
        console.log('🔍 isLeaseDocument result:', isLeaseDocument(file.name, text.text))
        console.log('🔍 analyzeLeaseDocument available:', !!analyzeLeaseDocument)
        console.log('🔍 Using standard analysis instead')
        
        // Use standard analysis for non-lease documents
        const out = await summarizeAndSuggest(text.text, file.name)
        console.log('🔍 Standard analysis result:', out)
        
        // Create a basic formatted response for non-lease documents
        const basicFormattedText = `📋 **BASIC DOCUMENT ANALYSIS**\n\n**Summary:**\n${out.summary}\n\n**Note:** This document was processed using standard analysis methods.`
        
        return NextResponse.json({
          success: true,
          filename: file.name,
          buildingId,
          summary: basicFormattedText,
          extractionMethod,
          extractionNote,
          textLength: text.text.length,
          confidence: extractionMethod === 'standard' ? 'high' : 'medium'
        })
      }
    }

    // 2) JSON: { path, buildingId? } → fetch from Supabase (already uploaded)
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      const path = body?.path as string | undefined
      const buildingId = (body?.buildingId as string) || null
      if (!path) return NextResponse.json({ success: false, error: 'path required' }, { status: 400 })

      // Lazy import to avoid bundling cost if you don't use this path
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      if (error || !data) return NextResponse.json({ success: false, error: error?.message || 'download failed' }, { status: 500 })

      const ab = await data.arrayBuffer()
      const text = await extractText(new Uint8Array(ab), path)
      
      // Check if this is a lease document and use enhanced analysis
      if (isLeaseDocument(path, text.text) && analyzeLeaseDocument) {
        console.log('🔍 Detected lease document from storage, using enhanced analyzer')
        try {
          const leaseAnalysis = await analyzeLeaseDocument(text.text, path.split('/').pop() || path, buildingId || undefined)
          const formattedText = formatLeaseAnalysisToText(leaseAnalysis)
          
          return NextResponse.json({
            success: true,
            filename: path.split('/').pop(),
            buildingId,
            summary: formattedText, // Use formatted text as the main summary
            extractionMethod: 'standard', // Assuming standard extraction for storage
            extractionNote: 'Document processed using standard extraction methods',
            textLength: text.text.length,
            confidence: leaseAnalysis.confidence || 0.8,
            documentType: 'lease',
            leaseDetails: leaseAnalysis.leaseDetails || {},
            complianceChecklist: leaseAnalysis.complianceChecklist || [],
            financialObligations: leaseAnalysis.financialObligations || [],
            keyRights: leaseAnalysis.keyRights || [],
            restrictions: leaseAnalysis.restrictions || [],
            buildingContext: leaseAnalysis.buildingContext || {
              buildingId: buildingId,
              buildingStatus: buildingId ? 'matched' : 'not_found',
              extractedAddress: leaseAnalysis.leaseDetails?.propertyAddress || null,
              extractedBuildingType: leaseAnalysis.leaseDetails?.buildingType || null
            }
          })
        } catch (leaseError: any) {
          console.warn('Enhanced lease analysis failed, falling back to basic analysis:', leaseError)
          const out = await summarizeAndSuggest(text.text, path)
          
          // Create a basic formatted response for failed lease analysis
          const basicFormattedText = `📋 **BASIC DOCUMENT ANALYSIS**\n\n**Summary:**\n${out.summary}\n\n**Note:** Enhanced lease analysis failed. This is a basic summary of the document content.`
          
          return NextResponse.json({
            success: true,
            filename: path.split('/').pop(),
            buildingId,
            summary: basicFormattedText,
            warning: 'Enhanced lease analysis failed, using basic analysis'
          })
        }
      } else {
        // Use standard analysis for non-lease documents
        const out = await summarizeAndSuggest(text.text, path)
        
        // Create a basic formatted response for non-lease documents
        const basicFormattedText = `📋 **BASIC DOCUMENT ANALYSIS**\n\n**Summary:**\n${out.summary}\n\n**Note:** This document was processed using standard analysis methods.`
        
        return NextResponse.json({
          success: true,
          filename: path.split('/').pop(),
          buildingId,
          summary: basicFormattedText,
        })
      }
    }

    return NextResponse.json({ success: false, error: `Unsupported content-type: ${ct}` }, { status: 415 })
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error'
    console.error('ask-ai/upload error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
