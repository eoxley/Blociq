import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function POST(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/reply/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const body = await request.json()
    const { messageId, to, cc, subject, htmlBody } = body

    if (!messageId || !htmlBody) {
      return NextResponse.json({
        ok: false,
        error: 'messageId and htmlBody are required',
        routeId,
        build
      })
    }

    // Create reply using Microsoft Graph
    const response = await makeGraphRequest(`/me/messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({
        comment: htmlBody
      })
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

    // If we want to send the reply immediately, we can also call send
    if (to || cc || subject) {
      // Create a new message with the specified details
      const sendResponse = await makeGraphRequest('/me/sendMail', {
        method: 'POST',
        body: JSON.stringify({
          message: {
            subject: subject || 'Re: ' + (subject || ''),
            body: {
              contentType: 'HTML',
              content: htmlBody
            },
            toRecipients: to ? to.map((email: string) => ({ emailAddress: { address: email } })) : [],
            ccRecipients: cc ? cc.map((email: string) => ({ emailAddress: { address: email } })) : []
          }
        })
      })
      
      if (!sendResponse.ok) {
        const sendErrorText = await sendResponse.text()
        console.error(`Send mail error (${sendResponse.status}):`, sendErrorText)
        
        return NextResponse.json({
          ok: false,
          error: `Send mail error: ${sendResponse.status}`,
          routeId,
          build
        })
      }
    }

    return NextResponse.json({
      ok: true,
      routeId,
      build
    })

  } catch (error) {
    console.error('Error creating reply:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to create reply',
      routeId,
      build
    })
  }
}
