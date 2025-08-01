import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/outlookAuth'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking webhook subscription status...')
    
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
    return NextResponse.json({
      active: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 