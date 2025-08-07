import { NextRequest, NextResponse } from 'next/server'
import { createWebhookSubscription, refreshWebhookSubscription } from '../webhook/route'
import { hasOutlookConnection } from '@/lib/outlookAuth'

// ✅ STEP 2: Setup Outlook Webhook Subscription
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Setting up Outlook webhook subscription...')
    
    // Check if Outlook is connected first
    const isConnected = await hasOutlookConnection()
    if (!isConnected) {
      console.log('❌ Outlook not connected')
      return NextResponse.json({
        success: false,
        error: 'Outlook not connected',
        message: 'Please connect your Outlook account first'
      }, { status: 400 })
    }
    
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
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      if (error.message.includes('No Outlook tokens found')) {
        errorMessage = 'Outlook account not connected. Please connect your Outlook account first.'
      } else if (error.message.includes('Microsoft OAuth configuration missing')) {
        errorMessage = 'Outlook integration not configured properly.'
      } else if (error.message.includes('Failed to refresh token')) {
        errorMessage = 'Outlook token expired. Please reconnect your account.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
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