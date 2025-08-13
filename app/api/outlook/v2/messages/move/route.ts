import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function POST(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/move/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const body = await request.json()
    const { messageId, destinationFolderId } = body

    if (!messageId || !destinationFolderId) {
      console.log(`[${routeId}] Missing required fields:`, { messageId, destinationFolderId })
      return NextResponse.json({
        ok: false,
        error: 'messageId and destinationFolderId are required',
        routeId,
        build
      })
    }

    console.log(`[${routeId}] Moving message ${messageId} to folder ${destinationFolderId}`)

    // Move the message using Microsoft Graph
    const graphEndpoint = `/me/messages/${messageId}/move`
    const requestBody = {
      destinationId: destinationFolderId
    }
    
    console.log(`[${routeId}] Making Graph request to: ${graphEndpoint}`, requestBody)
    
    const response = await makeGraphRequest(graphEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`[${routeId}] Graph API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[${routeId}] Graph API error (${response.status}):`, errorText)
      
      // Try to parse the error response for more details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorDetails = errorJson.error.message
        } else if (errorJson.error?.code) {
          errorDetails = `${errorJson.error.code}: ${errorJson.error.message || errorText}`
        }
      } catch {
        // If parsing fails, use the raw error text
        errorDetails = errorText
      }
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${errorDetails}`,
        diagnostic: errorText,
        routeId,
        build
      })
    }

    const result = await response.json()
    console.log(`[${routeId}] Successfully moved message ${messageId} to folder ${destinationFolderId}`, result)
    
    return NextResponse.json({
      ok: true,
      items: [result],
      routeId,
      build
    })

  } catch (error) {
    console.error(`[${routeId}] Error moving message:`, error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to move message',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
