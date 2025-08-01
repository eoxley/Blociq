import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  console.log('🧪 Testing webhook accessibility...')
  
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL
  })
}

export async function POST(req: NextRequest) {
  console.log('🧪 Testing webhook validation handling...')
  
  try {
    const body = await req.json()
    console.log('📨 Test validation request received:', JSON.stringify(body, null, 2))
    
    // Simulate Microsoft Graph validation request
    if (body.validationToken) {
      console.log('✅ Validation token received:', body.validationToken)
      return new NextResponse(body.validationToken, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain',
          'Content-Length': body.validationToken.length.toString()
        }
      })
    }
    
    // Simulate notification request
    console.log('✅ Notification request received')
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
    
  } catch (error) {
    console.error('❌ Test webhook error:', error)
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
} 