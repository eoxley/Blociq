import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken, hasOutlookConnection } from '@/lib/outlookAuth'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking webhook subscription status...')
    
    // Check if Outlook is connected first
    const isConnected = await hasOutlookConnection()
    if (!isConnected) {
      console.log('❌ Outlook not connected')
      return NextResponse.json({
        active: false,
        error: 'Outlook not connected',
        message: 'Please connect your Outlook account first'
      })
    }
    
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      return NextResponse.json({
        active: false,
        error: 'No valid access token'
      })
    }

    // Fetch existing subscriptions
    const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('❌ Failed to fetch subscriptions:', response.status)
      return NextResponse.json({
        active: false,
        error: 'Failed to fetch subscriptions'
      })
    }

    const subscriptions = await response.json()
    console.log('📋 Found subscriptions:', subscriptions.value?.length || 0)

    // Check for active BlocIQ webhook subscription
    const blociqSubscription = subscriptions.value?.find((sub: any) => 
      sub.clientState === 'blociq-webhook-subscription' &&
      sub.resource === '/me/mailFolders(\'Inbox\')/messages' &&
      new Date(sub.expirationDateTime) > new Date()
    )

    if (blociqSubscription) {
      console.log('✅ Active webhook subscription found:', blociqSubscription.id)
      return NextResponse.json({
        active: true,
        subscriptionId: blociqSubscription.id,
        expiresAt: blociqSubscription.expirationDateTime,
        resource: blociqSubscription.resource
      })
    } else {
      console.log('❌ No active webhook subscription found')
      return NextResponse.json({
        active: false,
        message: 'No active webhook subscription'
      })
    }

  } catch (error) {
    console.error('❌ Error checking webhook status:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      if (error.message.includes('No Outlook tokens found')) {
        errorMessage = 'Outlook account not connected'
      } else if (error.message.includes('Microsoft OAuth configuration missing')) {
        errorMessage = 'Outlook integration not configured'
      } else if (error.message.includes('Failed to refresh token')) {
        errorMessage = 'Outlook token expired'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      active: false,
      error: errorMessage
    }, { status: 500 })
  }
} 