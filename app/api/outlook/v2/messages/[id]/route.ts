import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeId = 'app/api/outlook/v2/messages/[id]/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null
  const messageId = params.id

  try {
    if (!messageId) {
      return NextResponse.json({
        ok: false,
        error: 'Message ID is required',
        routeId,
        build
      })
    }

    // Delete the message using Microsoft Graph
    const response = await makeGraphRequest(`/me/messages/${messageId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        routeId,
        build
      })
    }

    return NextResponse.json({
      ok: true,
      routeId,
      build
    })

  } catch (error) {
    console.error('Error deleting message:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to delete message',
      routeId,
      build
    })
  }
}
