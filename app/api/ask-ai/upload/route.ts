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
      // Import from the main lease analyzer, not the document-analyzers version
      const mod = await import('@/lib/lease-analyzer')
      analyzeLeaseDocument = mod.analyzeLeaseDocument
      console.log('✅ Loaded enhanced lease analyzer from main lib')
    } catch (error) {
      console.warn('Failed to load lease analyzer:', error)
      analyzeLeaseDocument = null
    }
  }

  if (!classifyDocument) {
    try {
      const mod = await import('@/lib/document-classifier')
      classifyDocument = mod.classifyDocument
      console.log('✅ Loaded document classifier')
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

// Helper function to convert lease analysis to suggested actions
function convertLeaseAnalysisToActions(analysis: any): any[] {
  const actions = []
  
  // Add building-related actions
  if (analysis.buildingContext?.buildingStatus === 'not_found') {
    actions.push({
      key: 'add_building',
      label: 'Add New Building to Portfolio',
      icon: 'Plus',
      action: 'add_building'
    })
  }
  
  // Add lease-specific actions
  if (analysis.leaseDetails?.propertyAddress) {
    actions.push({
      key: 'review_lease',
      label: 'Review Lease Terms',
      icon: 'FileText',
      action: 'review'
    })
  }
  
  if (analysis.complianceChecklist?.length > 0) {
    actions.push({
      key: 'compliance_review',
      label: 'Review Compliance Checklist',
      icon: 'CheckSquare',
      action: 'review'
    })
  }
  
  if (analysis.financialObligations?.length > 0) {
    actions.push({
      key: 'financial_review',
      label: 'Review Financial Obligations',
      icon: 'DollarSign',
      action: 'review'
    })
  }
  
  // Add general lease actions
  actions.push({
    key: 'create_reminders',
    label: 'Create Lease Reminders',
    icon: 'Bell',
    action: 'schedule'
  })
  
  actions.push({
    key: 'legal_review',
    label: 'Legal Review Required',
    icon: 'Scale',
    action: 'review'
  })
  
  return actions
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

      // Check if this is a lease document and use enhanced analysis
      if (isLeaseDocument(file.name, text.text) && analyzeLeaseDocument) {
        console.log('🔍 Detected lease document, using enhanced analyzer')
        console.log('🔍 File name:', file.name)
        console.log('🔍 Building ID:', buildingId)
        console.log('🔍 Text length:', text.text.length)
        
        try {
          const leaseAnalysis = await analyzeLeaseDocument(text.text, file.name, buildingId || undefined)
          
          console.log('🔍 Lease analysis completed:', {
            summary: leaseAnalysis.summary,
            leaseDetails: leaseAnalysis.leaseDetails,
            complianceChecklist: leaseAnalysis.complianceChecklist,
            financialObligations: leaseAnalysis.financialObligations,
            buildingContext: leaseAnalysis.buildingContext
          })
          
          // Convert lease analysis to suggested actions
          const suggestedActions = convertLeaseAnalysisToActions(leaseAnalysis)
          
          console.log('🔍 Converted suggested actions:', suggestedActions)
          
          return NextResponse.json({
            success: true,
            filename: file.name,
            buildingId,
            summary: leaseAnalysis.summary,
            suggestedActions: suggestedActions,
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
        } catch (leaseError) {
          console.warn('Enhanced lease analysis failed, falling back to basic analysis:', leaseError)
          // Fall back to basic analysis if enhanced analysis fails
          const out = await summarizeAndSuggest(text.text, file.name)
          console.log('🔍 Fallback analysis result:', out)
          return NextResponse.json({
            success: true,
            filename: file.name,
            buildingId,
            summary: out.summary,
            suggestedActions: out.suggestedActions ?? [],
            extractionMethod,
            extractionNote,
            textLength: text.text.length,
            confidence: extractionMethod === 'standard' ? 'high' : 'medium',
            warning: 'Enhanced lease analysis failed, using basic analysis'
          })
        }
      } else {
        console.log('🔍 Not a lease document or analyzer not available, using standard analysis')
        // Use standard analysis for non-lease documents
        const out = await summarizeAndSuggest(text.text, file.name)
        console.log('🔍 Standard analysis result:', out)
        return NextResponse.json({
          success: true,
          filename: file.name,
          buildingId,
          summary: out.summary,
          suggestedActions: out.suggestedActions ?? [],
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
          const suggestedActions = convertLeaseAnalysisToActions(leaseAnalysis)
          
          return NextResponse.json({
            success: true,
            filename: path.split('/').pop(),
            buildingId,
            summary: leaseAnalysis.summary,
            suggestedActions: suggestedActions,
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
        } catch (leaseError) {
          console.warn('Enhanced lease analysis failed, falling back to basic analysis:', leaseError)
          const out = await summarizeAndSuggest(text.text, path)
          return NextResponse.json({
            success: true,
            filename: path.split('/').pop(),
            buildingId,
            summary: out.summary,
            suggestedActions: out.suggestedActions ?? [],
            warning: 'Enhanced lease analysis failed, using basic analysis'
          })
        }
      } else {
        // Use standard analysis for non-lease documents
        const out = await summarizeAndSuggest(text.text, path)
        return NextResponse.json({
          success: true,
          filename: path.split('/').pop(),
          buildingId,
          summary: out.summary,
          suggestedActions: out.suggestedActions ?? [],
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
