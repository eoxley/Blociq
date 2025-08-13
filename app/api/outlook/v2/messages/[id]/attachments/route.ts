import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeId = 'app/api/outlook/v2/messages/[id]/attachments/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null
  const messageId = params.id

  try {
    if (!messageId) {
      console.log(`[${routeId}] Missing message ID`)
      return NextResponse.json({
        ok: false,
        error: 'Message ID is required',
        routeId,
        build
      })
    }

    console.log(`[${routeId}] Fetching attachments for message ${messageId}`)

    // Fetch attachments using Microsoft Graph API
    const graphEndpoint = `/me/messages/${messageId}/attachments`
    
    console.log(`[${routeId}] Making Graph request to: ${graphEndpoint}`)
    
    const response = await makeGraphRequest(graphEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
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

    const result = await response.json()
    console.log(`[${routeId}] Successfully fetched attachments for message ${messageId}`, {
      count: result.value?.length || 0
    })
    
    return NextResponse.json({
      ok: true,
      items: result.value || [],
      routeId,
      build
    })

  } catch (error) {
    console.error(`[${routeId}] Error fetching message attachments:`, error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch message attachments',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
