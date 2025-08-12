import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function GET(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/list/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    
    console.log(`[${routeId}] Fetching messages for folder: ${folderId}`)
    
    if (!folderId) {
      console.log(`[${routeId}] No folderId provided`)
      return NextResponse.json({
        ok: false,
        error: 'folderId parameter is required',
        items: [],
        routeId,
        build
      })
    }

    // Get messages for the specified folder
    const graphEndpoint = `/me/mailFolders/${folderId}/messages?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,webLink,conversationId&$orderby=receivedDateTime desc&$top=100`
    console.log(`[${routeId}] Making Graph request to: ${graphEndpoint}`)
    
    const response = await makeGraphRequest(graphEndpoint)
    
    console.log(`[${routeId}] Graph API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[${routeId}] Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        diagnostic: errorText,
        items: [],
        routeId,
        build
      })
    }

    const data = await response.json()
    console.log(`[${routeId}] Successfully fetched ${data.value?.length || 0} messages`)
    
    return NextResponse.json({
      ok: true,
      items: data.value || [],
      routeId,
      build
    })

  } catch (error) {
    console.error(`[${routeId}] Error fetching messages:`, error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch messages',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      routeId,
      build
    })
  }
}
