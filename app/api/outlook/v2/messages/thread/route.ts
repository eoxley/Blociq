import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function GET(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/thread/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json({
        ok: false,
        error: 'conversationId parameter is required',
        items: [],
        routeId,
        build
      })
    }

    // Fetch messages in the conversation thread
    const response = await makeGraphRequest(
      `/me/messages?$filter=conversationId eq '${conversationId}'&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments&$orderby=receivedDateTime asc`
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
    console.error('Error fetching email thread:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch email thread',
      items: [],
      routeId,
      build
    })
  }
}
