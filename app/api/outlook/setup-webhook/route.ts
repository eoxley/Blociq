import { NextRequest, NextResponse } from 'next/server'
import { createWebhookSubscription, refreshWebhookSubscription } from '../webhook/route'

// ✅ STEP 2: Setup Outlook Webhook Subscription
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Setting up Outlook webhook subscription...')
    
    // Create new webhook subscription
    const subscription = await createWebhookSubscription()
    
    console.log('✅ Webhook subscription setup complete:', subscription.id)
    
    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: 'Webhook subscription created successfully'
    })
    
  } catch (error) {
    console.error('❌ Failed to setup webhook subscription:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Refresh existing webhook subscription
export async function PATCH(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json()
    
    if (!subscriptionId) {
      return NextResponse.json({
        success: false,
        error: 'Subscription ID is required'
      }, { status: 400 })
    }
    
    console.log('🔄 Refreshing webhook subscription:', subscriptionId)
    
    await refreshWebhookSubscription(subscriptionId)
    
    return NextResponse.json({
      success: true,
      message: 'Webhook subscription refreshed successfully'
    })
    
  } catch (error) {
    console.error('❌ Failed to refresh webhook subscription:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 