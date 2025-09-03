// Document cache-busting utilities
// Prevents showing old OCR results when uploading new documents

/**
 * Generate SHA-256 hash of a file for cache busting
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate unique processing ID to prevent cache collisions
 */
export function generateProcessingId(file: File): string {
  return `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${file.size}`;
}

/**
 * Create cache-busting FormData for document upload
 */
export async function createCacheBustingFormData(
  file: File, 
  additionalData: Record<string, string> = {}
): Promise<FormData> {
  const processingId = generateProcessingId(file);
  const fileHash = await generateFileHash(file);
  
  console.log(`📤 Preparing upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`🔑 Processing ID: ${processingId}`);
  console.log(`#️⃣ File hash: ${fileHash.substring(0, 16)}...`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('processingId', processingId);
  formData.append('fileHash', fileHash);
  formData.append('timestamp', Date.now().toString());
  formData.append('forceReprocess', 'true'); // Skip cache lookup for fresh uploads

  // Add any additional data
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
}

/**
 * Create cache-busting headers for API requests
 */
export function createCacheBustingHeaders(processingId?: string, fileHash?: string): HeadersInit {
  const headers: HeadersInit = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (processingId) {
    headers['X-Processing-ID'] = processingId;
  }

  if (fileHash) {
    headers['X-File-Hash'] = fileHash;
  }

  return headers;
}

/**
 * Validate that API response matches the uploaded file
 */
export function validateResponseForFile(
  response: any, 
  expectedProcessingId: string,
  fileName: string
): boolean {
  if (!response.processingId) {
    console.warn('⚠️ Response missing processingId - cannot validate');
    return true; // Allow if validation not available
  }

  if (response.processingId !== expectedProcessingId) {
    console.warn(`⚠️ Response processingId mismatch:`, {
      expected: expectedProcessingId,
      received: response.processingId,
      fileName
    });
    return false;
  }

  return true;
}

/**
 * Check if cache result is stale (older than 24 hours)
 */
export function isCacheStale(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > 24 * 60 * 60 * 1000; // 24 hours
}

/**
 * Enhanced file upload handler with cache busting
 */
export async function uploadDocumentWithCacheBusting(
  file: File,
  endpoint: string,
  additionalData: Record<string, string> = {},
  onProgress?: (status: string) => void
): Promise<any> {
  onProgress?.('Preparing upload...');
  
  // Create cache-busting form data
  const formData = await createCacheBustingFormData(file, additionalData);
  const processingId = formData.get('processingId') as string;
  const fileHash = formData.get('fileHash') as string;

  onProgress?.('Uploading document...');

  // Upload with cache-busting headers
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: createCacheBustingHeaders(processingId, fileHash),
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Upload failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
  }

  const result = await response.json();

  // Validate response is for this file
  if (!validateResponseForFile(result, processingId, file.name)) {
    console.warn('⚠️ Received result for different file, this may indicate caching issues');
    // Could retry here if needed
  }

  onProgress?.('Processing complete!');
  return result;
}
