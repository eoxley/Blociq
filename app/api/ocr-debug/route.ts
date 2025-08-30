/**
 * OCR Debug Route - Helps diagnose OCR issues in production
 */

export const runtime = 'nodejs'

export async function GET() {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      
      // OCR Environment Variables (boolean only for security)
      OCR_SERVICE_URL: !!process.env.OCR_SERVICE_URL,
      OCR_TOKEN: !!process.env.OCR_TOKEN,
      
      // Google Cloud Variables
      GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_VISION_API_KEY: !!process.env.GOOGLE_VISION_API_KEY
    },
    ocrServiceUrlValue: process.env.OCR_SERVICE_URL ? 'SET' : 'NOT_SET',
    googleCredentialsStatus: 'CHECKING...'
  }

  // Test Google credentials parsing
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      debug.googleCredentialsStatus = !!(creds.project_id && creds.private_key && creds.client_email) ? 'VALID' : 'INVALID_STRUCTURE'
    } else {
      debug.googleCredentialsStatus = 'NOT_SET'
    }
  } catch (error) {
    debug.googleCredentialsStatus = 'PARSE_ERROR'
  }

  // Test if OCR service is available
  let ocrServiceStatus = 'UNKNOWN'
  try {
    const { testOCRService } = await import('@/lib/ocrService')
    const testResult = await testOCRService()
    ocrServiceStatus = {
      googleVision: testResult.googleVision.available ? 'AVAILABLE' : 'UNAVAILABLE',
      external: testResult.external.available ? 'AVAILABLE' : 'UNAVAILABLE'
    }
  } catch (error) {
    ocrServiceStatus = `TEST_ERROR: ${error instanceof Error ? error.message : 'Unknown'}`
  }

  return Response.json({
    ...debug,
    ocrServiceStatus,
    message: 'OCR Debug Information - Check environment variables and service availability'
  }, {
    headers: {
      'X-Debug-Timestamp': debug.timestamp,
      'X-Google-Vision': typeof ocrServiceStatus === 'object' ? (ocrServiceStatus.googleVision || 'UNKNOWN') : 'ERROR',
      'X-External-OCR': typeof ocrServiceStatus === 'object' ? (ocrServiceStatus.external || 'UNKNOWN') : 'ERROR'
    }
  })
}

export async function POST() {
  return Response.json({ 
    error: 'Use GET method for OCR debug information' 
  }, { status: 405 })
}