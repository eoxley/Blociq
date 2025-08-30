/**
 * Test OCR Configuration Route
 * Validates Google Cloud Vision credentials and external OCR service
 */

export const runtime = 'nodejs'

import { testOCRService } from '@/lib/ocrService'

export async function GET() {
  try {
    console.log('🔍 Testing OCR service configuration...')

    // Test all OCR services
    const testResults = await testOCRService()

    // Check environment variables
    const envCheck = {
      OCR_SERVICE_URL: !!process.env.OCR_SERVICE_URL,
      OCR_TOKEN: !!process.env.OCR_TOKEN,
      GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_VISION_API_KEY: !!process.env.GOOGLE_VISION_API_KEY
    }

    // Validate Google credentials structure
    let credentialsValid = false
    let credentialsError = ''
    
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
        credentialsValid = !!(creds.project_id && creds.private_key && creds.client_email)
        if (!credentialsValid) {
          credentialsError = 'Missing required fields in credentials JSON'
        }
      } else {
        credentialsError = 'GOOGLE_APPLICATION_CREDENTIALS_JSON not set'
      }
    } catch (error) {
      credentialsError = 'Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON'
    }

    // Overall status
    const allGood = testResults.googleVision.available || testResults.external.available
    
    const response = {
      success: allGood,
      timestamp: new Date().toISOString(),
      environment: {
        variables: envCheck,
        googleCredentialsValid: credentialsValid,
        credentialsError: credentialsError || undefined
      },
      services: testResults,
      recommendations: generateRecommendations(testResults, envCheck, credentialsValid)
    }

    console.log('📊 OCR configuration test completed:', response)

    return Response.json(response, { 
      status: 200,
      headers: {
        'X-OCR-Config-Test': allGood ? 'PASS' : 'FAIL',
        'X-Google-Vision': testResults.googleVision.available ? 'AVAILABLE' : 'UNAVAILABLE',
        'X-External-OCR': testResults.external.available ? 'AVAILABLE' : 'UNAVAILABLE'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ OCR configuration test failed:', error)

    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'X-OCR-Config-Test': 'ERROR'
      }
    })
  }
}

function generateRecommendations(
  testResults: any,
  envCheck: any,
  credentialsValid: boolean
): string[] {
  const recommendations: string[] = []

  // Google Vision recommendations
  if (!testResults.googleVision.available) {
    if (!envCheck.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      recommendations.push('Add GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable with your service account credentials')
    } else if (!credentialsValid) {
      recommendations.push('Fix GOOGLE_APPLICATION_CREDENTIALS_JSON format - ensure it contains project_id, private_key, and client_email')
    } else if (testResults.googleVision.error) {
      recommendations.push(`Fix Google Vision API issue: ${testResults.googleVision.error}`)
    }
  }

  // External OCR recommendations
  if (!testResults.external.available) {
    if (!envCheck.OCR_SERVICE_URL) {
      recommendations.push('Add OCR_SERVICE_URL environment variable pointing to your external OCR service')
    } else if (testResults.external.error) {
      recommendations.push(`Fix external OCR service issue: ${testResults.external.error}`)
    }
  }

  // If nothing is working
  if (!testResults.googleVision.available && !testResults.external.available) {
    recommendations.push('CRITICAL: No OCR services are available. Configure at least one OCR method.')
  }

  // Security recommendations
  if (envCheck.OCR_TOKEN) {
    recommendations.push('Good: OCR_TOKEN is configured for external service authentication')
  } else if (envCheck.OCR_SERVICE_URL) {
    recommendations.push('Consider adding OCR_TOKEN for external service authentication')
  }

  return recommendations
}

export async function POST() {
  return Response.json({ 
    error: 'Method not allowed. Use GET to test OCR configuration.' 
  }, { status: 405 })
}