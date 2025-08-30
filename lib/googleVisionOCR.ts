/**
 * Google Cloud Vision API OCR Service for BlocIQ
 * Properly configured with service account credentials
 */

import { ImageAnnotatorClient } from '@google-cloud/vision'

export interface GoogleVisionOCRResult {
  success: boolean
  text?: string
  confidence?: number
  error?: string
  processingTime?: number
}

/**
 * Initialize Google Cloud Vision client with proper credentials
 */
function createVisionClient() {
  try {
    // Parse credentials from environment variable
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set')
    }

    let credentials
    try {
      credentials = JSON.parse(credentialsJson)
    } catch (parseError) {
      throw new Error('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON')
    }

    // Validate required fields
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error('Missing required fields in Google credentials (project_id, private_key, client_email)')
    }

    // Fix newlines in private key (they're often escaped in environment variables)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')

    // Create client with credentials
    return new ImageAnnotatorClient({ credentials })
  } catch (error) {
    console.error('❌ Failed to initialize Google Vision client:', error)
    throw error
  }
}

/**
 * Process a file using Google Cloud Vision API
 */
export async function processFileWithGoogleVision(file: File): Promise<GoogleVisionOCRResult> {
  const startTime = Date.now()

  try {
    console.log(`🔍 Processing file with Google Vision: ${file.name} (${file.type})`)

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/tiff',
      'application/pdf'
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Unsupported file type: ${file.type}. Google Vision supports images and PDFs.`
      }
    }

    // Check file size (Google Vision has a 20MB limit)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds Google Vision's 20MB limit`
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create Vision client
    const client = createVisionClient()

    // Prepare the request
    const request = {
      image: {
        content: buffer
      }
    }

    // Perform text detection
    console.log('🔍 Calling Google Vision API for text detection...')
    const [result] = await client.textDetection(request)
    
    const detections = result.textAnnotations
    if (!detections || detections.length === 0) {
      return {
        success: false,
        error: 'No text detected in the document',
        processingTime: Date.now() - startTime
      }
    }

    // The first annotation contains the full text
    const fullText = detections[0]?.description || ''
    
    if (!fullText.trim()) {
      return {
        success: false,
        error: 'Empty text extracted from document',
        processingTime: Date.now() - startTime
      }
    }

    const processingTime = Date.now() - startTime
    
    console.log(`✅ Google Vision processing completed for ${file.name}:`, {
      textLength: fullText.length,
      processingTime: `${processingTime}ms`
    })

    return {
      success: true,
      text: fullText.trim(),
      confidence: 0.9, // Google Vision typically has high confidence
      processingTime
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown Google Vision error'
    
    console.error(`❌ Google Vision processing failed for ${file.name}:`, error)
    
    return {
      success: false,
      error: `Google Vision API error: ${errorMessage}`,
      processingTime
    }
  }
}

/**
 * Process bytes using Google Cloud Vision API
 */
export async function processBytesWithGoogleVision(bytes: Uint8Array, mimeType: string = 'application/pdf'): Promise<GoogleVisionOCRResult> {
  const startTime = Date.now()

  try {
    console.log(`🔍 Processing bytes with Google Vision (${mimeType}, ${bytes.length} bytes)`)

    // Create Vision client
    const client = createVisionClient()

    // Prepare the request
    const request = {
      image: {
        content: Buffer.from(bytes)
      }
    }

    // Perform text detection
    const [result] = await client.textDetection(request)
    
    const detections = result.textAnnotations
    if (!detections || detections.length === 0) {
      return {
        success: false,
        error: 'No text detected in the document',
        processingTime: Date.now() - startTime
      }
    }

    // The first annotation contains the full text
    const fullText = detections[0]?.description || ''
    
    if (!fullText.trim()) {
      return {
        success: false,
        error: 'Empty text extracted from document',
        processingTime: Date.now() - startTime
      }
    }

    const processingTime = Date.now() - startTime
    
    console.log(`✅ Google Vision byte processing completed:`, {
      textLength: fullText.length,
      processingTime: `${processingTime}ms`
    })

    return {
      success: true,
      text: fullText.trim(),
      confidence: 0.9,
      processingTime
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown Google Vision error'
    
    console.error(`❌ Google Vision byte processing failed:`, error)
    
    return {
      success: false,
      error: `Google Vision API error: ${errorMessage}`,
      processingTime
    }
  }
}

/**
 * Test Google Cloud Vision API credentials
 */
export async function testGoogleVisionCredentials(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 Testing Google Vision credentials...')
    
    const client = createVisionClient()
    
    // Create a small test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xCD, 0x90, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    const request = {
      image: {
        content: testImageBuffer
      }
    }

    // Try to make a simple API call
    await client.textDetection(request)
    
    console.log('✅ Google Vision credentials test successful')
    return { success: true }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Google Vision credentials test failed:', error)
    
    return { 
      success: false, 
      error: `Credentials test failed: ${errorMessage}`
    }
  }
}