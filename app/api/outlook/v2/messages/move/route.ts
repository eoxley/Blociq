import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function POST(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/move/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const body = await request.json()
    const { messageId, destinationFolderId } = body

    if (!messageId || !destinationFolderId) {
      return NextResponse.json({
        ok: false,
        error: 'messageId and destinationFolderId are required',
        routeId,
        build
      })
    }

    console.log(`Moving message ${messageId} to folder ${destinationFolderId}`)

    // Move the message using Microsoft Graph
    const response = await makeGraphRequest(`/me/messages/${messageId}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinationId: destinationFolderId
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        diagnostic: errorText,
        routeId,
        build
      })
    }

    const result = await response.json()
    console.log(`Successfully moved message ${messageId} to folder ${destinationFolderId}`)
    
    return NextResponse.json({
      ok: true,
      items: [result],
      routeId,
      build
    })

  } catch (error) {
    console.error('Error moving message:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to move message',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
