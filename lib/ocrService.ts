/**
 * Comprehensive OCR Service for BlocIQ
 * Uses Google Cloud Vision API as primary with fallback to external service
 */

import { processFileWithGoogleVision, processBytesWithGoogleVision, GoogleVisionOCRResult } from './googleVisionOCR'
import { processFileWithOCR as processFileWithExternal } from './ai/ocrClient'

export interface OCRServiceResult {
  success: boolean
  text: string
  source: 'google-vision' | 'external' | 'local' | 'none'
  confidence?: number
  error?: string
  processingTime?: number
  metadata?: {
    attempts: number
    fileName?: string
    fileSize?: number
  }
}

export interface OCRServiceConfig {
  preferGoogleVision?: boolean
  fallbackToExternal?: boolean
  minTextLength?: number
  timeout?: number
}

const DEFAULT_CONFIG: Required<OCRServiceConfig> = {
  preferGoogleVision: true,
  fallbackToExternal: true,
  minTextLength: 50, // Lowered from 200 in upload route
  timeout: 30000
}

/**
 * Process a file through the best available OCR service
 */
export async function processFileWithOCRService(
  file: File,
  config: OCRServiceConfig = {}
): Promise<OCRServiceResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()
  let attempts = 0

  console.log(`🔍 Starting OCR processing for ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)

  // Helper function to validate text quality
  const isValidText = (text: string): boolean => {
    return text && text.trim().length >= finalConfig.minTextLength
  }

  try {
    // Method 0: Direct text extraction for text files
    if (file.type === 'text/plain') {
      attempts++
      console.log('🔍 Processing text file directly...')
      
      try {
        const text = await file.text()
        if (text && isValidText(text)) {
          console.log(`✅ Direct text extraction successful: ${text.length} characters`)
          return {
            success: true,
            text: text.trim(),
            source: 'local',
            confidence: 1.0,
            processingTime: Date.now() - startTime,
            metadata: {
              attempts,
              fileName: file.name,
              fileSize: file.size
            }
          }
        } else {
          console.log(`⚠️ Text file has insufficient content (${text?.length || 0} chars)`)
        }
      } catch (error) {
        console.log(`⚠️ Direct text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Method 1: Google Cloud Vision API (for images and PDFs)
    if (finalConfig.preferGoogleVision && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && file.type !== 'text/plain') {
      attempts++
      console.log('🔍 Attempting Google Vision API...')
      
      try {
        const result = await processFileWithGoogleVision(file)
        if (result.success && result.text && isValidText(result.text)) {
          console.log(`✅ Google Vision successful: ${result.text.length} characters extracted`)
          return {
            success: true,
            text: result.text,
            source: 'google-vision',
            confidence: result.confidence,
            processingTime: Date.now() - startTime,
            metadata: {
              attempts,
              fileName: file.name,
              fileSize: file.size
            }
          }
        } else {
          console.log(`⚠️ Google Vision returned insufficient text (${result.text?.length || 0} chars)`)
        }
      } catch (error) {
        console.log(`⚠️ Google Vision failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Method 2: External OCR service (fallback)
    if (finalConfig.fallbackToExternal) {
      attempts++
      console.log('🔍 Attempting external OCR service...')
      
      try {
        const result = await processFileWithExternal(file, { 
          timeout: finalConfig.timeout,
          maxRetries: 1
        })
        
        if (result.success && result.text && isValidText(result.text)) {
          console.log(`✅ External OCR successful: ${result.text.length} characters extracted`)
          return {
            success: true,
            text: result.text,
            source: 'external',
            confidence: result.confidence,
            processingTime: Date.now() - startTime,
            metadata: {
              attempts,
              fileName: file.name,
              fileSize: file.size
            }
          }
        } else {
          console.log(`⚠️ External OCR returned insufficient text (${result.text?.length || 0} chars)`)
        }
      } catch (error) {
        console.log(`⚠️ External OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // All methods failed
    const processingTime = Date.now() - startTime
    console.error(`❌ All OCR methods failed for ${file.name} after ${attempts} attempts`)
    
    return {
      success: false,
      text: '',
      source: 'none',
      error: `OCR processing failed: Unable to extract sufficient text from ${file.name} using ${attempts} method(s)`,
      processingTime,
      metadata: {
        attempts,
        fileName: file.name,
        fileSize: file.size
      }
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR service error'
    
    console.error(`❌ OCR service error for ${file.name}:`, error)
    
    return {
      success: false,
      text: '',
      source: 'none',
      error: errorMessage,
      processingTime,
      metadata: {
        attempts,
        fileName: file.name,
        fileSize: file.size
      }
    }
  }
}

/**
 * Process bytes through the OCR service
 */
export async function processBytesWithOCRService(
  bytes: Uint8Array,
  mimeType: string = 'application/pdf',
  config: OCRServiceConfig = {}
): Promise<OCRServiceResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()
  let attempts = 0

  console.log(`🔍 Starting OCR byte processing (${mimeType}, ${bytes.length} bytes)`)

  const isValidText = (text: string): boolean => {
    return text && text.trim().length >= finalConfig.minTextLength
  }

  try {
    // Method 1: Google Cloud Vision API
    if (finalConfig.preferGoogleVision && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      attempts++
      console.log('🔍 Attempting Google Vision API for bytes...')
      
      try {
        const result = await processBytesWithGoogleVision(bytes, mimeType)
        if (result.success && result.text && isValidText(result.text)) {
          console.log(`✅ Google Vision byte processing successful: ${result.text.length} characters`)
          return {
            success: true,
            text: result.text,
            source: 'google-vision',
            confidence: result.confidence,
            processingTime: Date.now() - startTime,
            metadata: {
              attempts,
              fileSize: bytes.length
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Google Vision byte processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Method 2: External OCR service
    if (finalConfig.fallbackToExternal) {
      attempts++
      console.log('🔍 Attempting external OCR service for bytes...')
      
      try {
        // Use the external service byte processing function
        const { processBytesWithOCR } = await import('./ai/ocrClient')
        const text = await processBytesWithOCR(bytes)
        
        if (text && isValidText(text)) {
          console.log(`✅ External OCR byte processing successful: ${text.length} characters`)
          return {
            success: true,
            text,
            source: 'external',
            processingTime: Date.now() - startTime,
            metadata: {
              attempts,
              fileSize: bytes.length
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ External OCR byte processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // All methods failed
    const processingTime = Date.now() - startTime
    console.error(`❌ All OCR byte processing methods failed after ${attempts} attempts`)
    
    return {
      success: false,
      text: '',
      source: 'none',
      error: `OCR byte processing failed: Unable to extract sufficient text using ${attempts} method(s)`,
      processingTime,
      metadata: {
        attempts,
        fileSize: bytes.length
      }
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR service error'
    
    console.error(`❌ OCR byte service error:`, error)
    
    return {
      success: false,
      text: '',
      source: 'none',
      error: errorMessage,
      processingTime,
      metadata: {
        attempts,
        fileSize: bytes.length
      }
    }
  }
}

/**
 * Test OCR service configuration
 */
export async function testOCRService(): Promise<{
  googleVision: { available: boolean; error?: string }
  external: { available: boolean; error?: string }
}> {
  console.log('🔍 Testing OCR service configuration...')

  const results = {
    googleVision: { available: false, error: undefined as string | undefined },
    external: { available: false, error: undefined as string | undefined }
  }

  // Test Google Vision
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const { testGoogleVisionCredentials } = await import('./googleVisionOCR')
      const test = await testGoogleVisionCredentials()
      results.googleVision.available = test.success
      if (!test.success) {
        results.googleVision.error = test.error
      }
    } else {
      results.googleVision.error = 'GOOGLE_APPLICATION_CREDENTIALS_JSON not configured'
    }
  } catch (error) {
    results.googleVision.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Test External Service
  try {
    if (process.env.OCR_SERVICE_URL) {
      // Simple ping test to the external service
      const response = await fetch(process.env.OCR_SERVICE_URL.replace('/upload', '/health'), {
        method: 'GET',
        headers: process.env.OCR_TOKEN ? { Authorization: `Bearer ${process.env.OCR_TOKEN}` } : {}
      }).catch(() => null)
      
      results.external.available = response?.ok || false
      if (!response?.ok) {
        results.external.error = `External service not available (status: ${response?.status || 'no response'})`
      }
    } else {
      results.external.error = 'OCR_SERVICE_URL not configured'
    }
  } catch (error) {
    results.external.error = error instanceof Error ? error.message : 'Unknown error'
  }

  console.log('📊 OCR service test results:', results)
  return results
}

/**
 * Get recommended OCR configuration based on file type
 */
export function getRecommendedOCRConfig(file: File): OCRServiceConfig {
  const config: OCRServiceConfig = {
    preferGoogleVision: true,
    fallbackToExternal: true,
    minTextLength: 50,
    timeout: 30000
  }

  // For images, Google Vision is typically better
  if (file.type.startsWith('image/')) {
    config.preferGoogleVision = true
    config.minTextLength = 20 // Images might have less text
  }

  // For PDFs, external service might handle complex layouts better
  if (file.type === 'application/pdf') {
    config.preferGoogleVision = true
    config.fallbackToExternal = true
    config.minTextLength = 100 // PDFs should have more text
  }

  // For large files, increase timeout
  if (file.size > 5 * 1024 * 1024) { // 5MB
    config.timeout = 60000 // 1 minute
  }

  return config
}