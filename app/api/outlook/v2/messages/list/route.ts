import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function GET(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/list/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    
    if (!folderId) {
      return NextResponse.json({
        ok: false,
        error: 'folderId parameter is required',
        items: [],
        routeId,
        build
      })
    }

    // Get messages for the specified folder
    const response = await makeGraphRequest(
      `/me/mailFolders/${folderId}/messages?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,hasAttachments,webLink,conversationId&$orderby=receivedDateTime desc&$top=100`
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        items: [],
        routeId,
        build
      })
    }

    const data = await response.json()
    
    return NextResponse.json({
      ok: true,
      items: data.value || [],
      routeId,
      build
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch messages',
      items: [],
      routeId,
      build
    })
  }
}
