import { createClient } from '@supabase/supabase-js';
import { classifyDocument } from './document-classifier';

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export interface DocumentStorageResult {
  documentId: string;
  chunksStored: boolean;
  processingStatusUpdated: boolean;
  error?: string;
}

/**
 * Process file through OCR microservice
 */
export async function processFileWithOCR(file: File): Promise<OCRResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OCR service error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.text) {
      return { 
        text: data.text, 
        confidence: data.confidence || 0.8, 
        success: true 
      };
    } else {
      return { 
        text: '', 
        confidence: 0, 
        success: false, 
        error: 'No text extracted from OCR' 
      };
    }
  } catch (error) {
    console.error('OCR processing failed:', error);
    return { 
      text: '', 
      confidence: 0, 
      success: false, 
      error: error instanceof Error ? error.message : 'OCR processing failed' 
    };
  }
}

/**
 * Store OCR results in database following existing BlocIQ patterns
 */
export async function storeOCRResults(
  supabase: any,
  file: File,
  ocrResult: OCRResult,
  buildingId?: string,
  userId?: string
): Promise<DocumentStorageResult> {
  try {
    // 1. Store document in building_documents table
    const { data: document, error: docError } = await supabase
      .from('building_documents')
      .insert({
        building_id: buildingId || null,
        file_name: file.name,
        file_url: `ocr_processed_${Date.now()}_${file.name}`, // Placeholder URL
        type: classifyDocument(ocrResult.text, file.name).type,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to store document: ${docError.message}`);
    }

    // 2. Store OCR text in document_chunks table
    const { error: chunkError } = await supabase
      .from('document_chunks')
      .insert({
        document_id: document.id,
        chunk_index: 0,
        content: ocrResult.text,
        metadata: { 
          confidence: ocrResult.confidence,
          source: 'ocr_microservice',
          file_size: file.size,
          file_type: file.type,
          processing_timestamp: new Date().toISOString()
        }
      });

    if (chunkError) {
      throw new Error(`Failed to store document chunks: ${chunkError.message}`);
    }

    // 3. Update document processing status
    const { error: statusError } = await supabase
      .from('document_processing_status')
      .insert({
        document_id: document.id,
        status: 'completed',
        processing_type: 'ocr_extraction',
        metadata: { 
          ocr_confidence: ocrResult.confidence,
          text_length: ocrResult.text.length,
          processing_time: new Date().toISOString(),
          file_name: file.name,
          file_size: file.size
        }
      });

    if (statusError) {
      console.warn('Failed to update processing status:', statusError);
      // Don't fail the entire operation for this
    }

    return {
      documentId: document.id,
      chunksStored: true,
      processingStatusUpdated: true
    };

  } catch (error) {
    console.error('Failed to store OCR results:', error);
    return {
      documentId: '',
      chunksStored: false,
      processingStatusUpdated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch process multiple files through OCR
 */
export async function batchProcessOCR(
  files: File[],
  buildingId?: string,
  userId?: string
): Promise<{
  results: OCRResult[];
  storageResults: DocumentStorageResult[];
  totalProcessed: number;
  totalFailed: number;
}> {
  const results: OCRResult[] = [];
  const storageResults: DocumentStorageResult[] = [];
  let totalProcessed = 0;
  let totalFailed = 0;

  // Process files sequentially to avoid overwhelming the OCR service
  for (const file of files) {
    try {
      // Process through OCR
      const ocrResult = await processFileWithOCR(file);
      results.push(ocrResult);

      if (ocrResult.success) {
        totalProcessed++;
        
        // Store results in database
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const storageResult = await storeOCRResults(
          supabase, 
          file, 
          ocrResult, 
          buildingId, 
          userId
        );
        
        storageResults.push(storageResult);
      } else {
        totalFailed++;
      }
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      results.push({
        text: '',
        confidence: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      totalFailed++;
    }
  }

  return {
    results,
    storageResults,
    totalProcessed,
    totalFailed
  };
}

/**
 * Get OCR processing status for a document
 */
export async function getOCRProcessingStatus(
  supabase: any,
  documentId: string
): Promise<{
  status: string;
  processingType: string;
  metadata: any;
  lastUpdated: string;
}> {
  try {
    const { data, error } = await supabase
      .from('document_processing_status')
      .select('*')
      .eq('document_id', documentId)
      .eq('processing_type', 'ocr_extraction')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        status: 'unknown',
        processingType: 'ocr_extraction',
        metadata: {},
        lastUpdated: new Date().toISOString()
      };
    }

    return {
      status: data.status,
      processingType: data.processing_type,
      metadata: data.metadata || {},
      lastUpdated: data.updated_at || data.created_at
    };
  } catch (error) {
    console.error('Failed to get OCR processing status:', error);
    return {
      status: 'error',
      processingType: 'ocr_extraction',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Retry failed OCR processing
 */
export async function retryOCRProcessing(
  supabase: any,
  documentId: string,
  file: File
): Promise<OCRResult> {
  try {
    // Get the original document
    const { data: document, error: docError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Retry OCR processing
    const ocrResult = await processFileWithOCR(file);

    if (ocrResult.success) {
      // Update document chunks with new OCR result
      await supabase
        .from('document_chunks')
        .update({
          content: ocrResult.text,
          metadata: { 
            confidence: ocrResult.confidence,
            source: 'ocr_microservice_retry',
            retry_timestamp: new Date().toISOString()
          }
        })
        .eq('document_id', documentId)
        .eq('chunk_index', 0);

      // Update processing status
      await supabase
        .from('document_processing_status')
        .insert({
          document_id: documentId,
          status: 'completed',
          processing_type: 'ocr_extraction_retry',
          metadata: { 
            ocr_confidence: ocrResult.confidence,
            text_length: ocrResult.text.length,
            retry_timestamp: new Date().toISOString()
          }
        });
    }

    return ocrResult;
  } catch (error) {
    console.error('OCR retry failed:', error);
    return {
      text: '',
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : 'OCR retry failed'
    };
  }
}
