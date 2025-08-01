import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  console.log('🧪 Webhook test endpoint called')
  
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    environment: {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      nodeEnv: process.env.NODE_ENV
    }
  })
}

export async function POST(req: NextRequest) {
  console.log('🧪 Webhook test POST endpoint called')
  
  try {
    const body = await req.json()
    console.log('📨 Test webhook received body:', JSON.stringify(body, null, 2))
    
    // Simulate the validation token response
    if (body.validationToken) {
      console.log('✅ Test validation token received:', body.validationToken)
      return new NextResponse(body.validationToken, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain',
          'Content-Length': body.validationToken.length.toString()
        }
      })
    }
    
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