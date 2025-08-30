/**
 * Hardened OCR client with timeout, retries, and structured error handling
 */

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: string | number;
  error?: OCRError;
  metadata?: {
    processingTime: number;
    fileSize: number;
    fileName: string;
    attempts: number;
  };
}

export interface OCRError {
  type: 'timeout' | 'service_error' | 'network_error' | 'invalid_response';
  message: string;
  statusCode?: number;
  details?: any;
}

export interface OCRConfig {
  timeout?: number; // milliseconds, default 30000
  maxRetries?: number; // default 2
  retryDelay?: number; // milliseconds, default 1000
  endpoint?: string;
}

const DEFAULT_CONFIG: Required<OCRConfig> = {
  timeout: 30000, // 30 seconds
  maxRetries: 2,
  retryDelay: 1000, // 1 second
  endpoint: process.env.OCR_SERVICE_URL || 'https://ocr-server-2-ykmk.onrender.com/upload'
};

/**
 * Process a file through OCR with timeout and retry logic
 */
export async function processFileWithOCR(
  file: File, 
  config: OCRConfig = {}
): Promise<OCRResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  
  let lastError: OCRError | null = null;
  
  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      console.log(`🔍 OCR attempt ${attempt}/${finalConfig.maxRetries + 1} for file: ${file.name}`);
      
      // Create form data
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);
      
      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, finalConfig.timeout);
      
      try {
        // Make OCR request with timeout
        const ocrResponse = await fetch(finalConfig.endpoint, {
          method: 'POST',
          body: ocrFormData,
          signal: abortController.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!ocrResponse.ok) {
          lastError = {
            type: 'service_error',
            message: `OCR service returned ${ocrResponse.status}: ${ocrResponse.statusText}`,
            statusCode: ocrResponse.status
          };
          
          // Don't retry on client errors (4xx)
          if (ocrResponse.status >= 400 && ocrResponse.status < 500) {
            break;
          }
          
          // Retry on server errors (5xx)
          if (attempt <= finalConfig.maxRetries) {
            console.log(`⚠️ OCR service error (${ocrResponse.status}), retrying in ${finalConfig.retryDelay}ms...`);
            await sleep(finalConfig.retryDelay);
            continue;
          }
          
          break;
        }
        
        // Parse response
        let ocrResult;
        try {
          ocrResult = await ocrResponse.json();
        } catch (parseError) {
          lastError = {
            type: 'invalid_response',
            message: 'OCR service returned invalid JSON',
            details: parseError
          };
          
          if (attempt <= finalConfig.maxRetries) {
            console.log(`⚠️ OCR response parsing error, retrying in ${finalConfig.retryDelay}ms...`);
            await sleep(finalConfig.retryDelay);
            continue;
          }
          
          break;
        }
        
        // Handle varied JSON response shapes - accept { text }, { result: { text } }, or { data: { text } }
        const text = ocrResult?.text ?? ocrResult?.result?.text ?? ocrResult?.data?.text ?? "";
        
        // Validate response structure
        if (!ocrResult || typeof text !== 'string' || !text.trim()) {
          lastError = {
            type: 'invalid_response',
            message: 'OCR service returned response without valid text field',
            details: ocrResult
          };
          
          if (attempt <= finalConfig.maxRetries) {
            console.log(`⚠️ OCR invalid response structure, retrying in ${finalConfig.retryDelay}ms...`);
            await sleep(finalConfig.retryDelay);
            continue;
          }
          
          break;
        }
        
        // Success!
        const processingTime = Date.now() - startTime;
        console.log(`✅ OCR successful after ${attempt} attempt(s), processing time: ${processingTime}ms`);
        
        return {
          success: true,
          text: text,
          confidence: ocrResult.confidence || 'medium',
          metadata: {
            processingTime,
            fileSize: file.size,
            fileName: file.name,
            attempts: attempt
          }
        };
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          lastError = {
            type: 'timeout',
            message: `OCR request timed out after ${finalConfig.timeout}ms`,
            details: { timeout: finalConfig.timeout }
          };
        } else {
          lastError = {
            type: 'network_error',
            message: `Network error: ${fetchError.message}`,
            details: fetchError
          };
        }
        
        if (attempt <= finalConfig.maxRetries) {
          console.log(`⚠️ OCR ${lastError.type}, retrying in ${finalConfig.retryDelay}ms...`);
          await sleep(finalConfig.retryDelay);
          continue;
        }
        
        break;
      }
      
    } catch (unexpectedError: any) {
      lastError = {
        type: 'network_error',
        message: `Unexpected error: ${unexpectedError.message}`,
        details: unexpectedError
      };
      
      if (attempt <= finalConfig.maxRetries) {
        console.log(`⚠️ Unexpected OCR error, retrying in ${finalConfig.retryDelay}ms...`);
        await sleep(finalConfig.retryDelay);
        continue;
      }
      
      break;
    }
  }
  
  // All attempts failed
  const processingTime = Date.now() - startTime;
  console.error(`❌ OCR failed after ${finalConfig.maxRetries + 1} attempts`);
  
  return {
    success: false,
    error: lastError || {
      type: 'service_error',
      message: 'OCR processing failed after all retry attempts'
    },
    metadata: {
      processingTime,
      fileSize: file.size,
      fileName: file.name,
      attempts: finalConfig.maxRetries + 1
    }
  };
}

/**
 * Process multiple files with OCR
 */
export async function processFilesWithOCR(
  files: File[], 
  config: OCRConfig = {}
): Promise<OCRResult[]> {
  console.log(`🔍 Processing ${files.length} files with OCR`);
  
  const results = await Promise.all(
    files.map(file => processFileWithOCR(file, config))
  );
  
  const successful = results.filter(result => result.success).length;
  console.log(`✅ OCR complete: ${successful}/${files.length} files processed successfully`);
  
  return results;
}

/**
 * Get OCR configuration based on environment
 */
export function getOCRConfig(): OCRConfig {
  return {
    timeout: parseInt(process.env.OCR_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.OCR_MAX_RETRIES || '2'),
    retryDelay: parseInt(process.env.OCR_RETRY_DELAY || '1000'),
    endpoint: process.env.OCR_ENDPOINT || DEFAULT_CONFIG.endpoint
  };
}

/**
 * Process bytes through OCR - simplified version for direct byte processing
 */
export async function processBytesWithOCR(bytes: Uint8Array): Promise<string> {
  const url = process.env.OCR_SERVICE_URL || 'https://ocr-server-2-ykmk.onrender.com/upload';
  const token = process.env.OCR_TOKEN || "";

  // send as multipart/form-data
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), "upload.pdf");

  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  if (!res.ok) throw new Error(`OCR HTTP ${res.status}`);
  const j = await res.json().catch(() => ({}));
  const text = j?.text ?? j?.result?.text ?? j?.data?.text ?? "";
  return typeof text === "string" ? text : "";
}

/**
 * Utility function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate structured error message for users
 */
export function formatOCRError(error: OCRError, fileName: string): string {
  switch (error.type) {
    case 'timeout':
      return `OCR processing of "${fileName}" timed out. The file may be too large or the OCR service is overloaded. Please try again or use a smaller file.`;
    
    case 'service_error':
      return `OCR service error while processing "${fileName}". ${error.statusCode ? `(Error ${error.statusCode})` : ''} Please try again in a few moments.`;
    
    case 'network_error':
      return `Network error while processing "${fileName}". Please check your internet connection and try again.`;
    
    case 'invalid_response':
      return `OCR service returned an invalid response for "${fileName}". The service may be experiencing issues. Please try again.`;
    
    default:
      return `Unknown error while processing "${fileName}". Please try again.`;
  }
}