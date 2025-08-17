import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function POST(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/mark-read/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const { messageId, isRead = true } = await request.json()
    
    console.log(`[${routeId}] Marking message ${messageId} as ${isRead ? 'read' : 'unread'}`)
    
    if (!messageId) {
      console.log(`[${routeId}] No messageId provided`)
      return NextResponse.json({
        ok: false,
        error: 'messageId parameter is required',
        routeId,
        build
      })
    }

    // Mark message as read/unread using Graph API
    const graphEndpoint = `/me/messages/${messageId}`
    const patchData = {
      isRead: isRead
    }
    
    console.log(`[${routeId}] Making Graph PATCH request to: ${graphEndpoint}`)
    
    const response = await makeGraphRequest(graphEndpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchData)
    })
    
    console.log(`[${routeId}] Graph API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[${routeId}] Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        diagnostic: errorText,
        routeId,
        build
      })
    }

    console.log(`[${routeId}] Successfully marked message ${messageId} as ${isRead ? 'read' : 'unread'}`)
    
    return NextResponse.json({
      ok: true,
      messageId,
      isRead,
      routeId,
      build
    })

  } catch (error) {
    console.error(`[${routeId}] Error marking message as read:`, error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to mark message as read',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
