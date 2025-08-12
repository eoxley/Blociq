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

    // Create the reply message
    const replyResponse = await makeGraphRequest(`/me/messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({
        comment: htmlBody
      })
    })
    
    if (!replyResponse.ok) {
      const errorText = await replyResponse.text()
      console.error(`Graph API reply error (${replyResponse.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API reply error: ${replyResponse.status}`,
        routeId,
        build
      })
    }

    // If we have custom recipients or subject, create a new message instead
    if (to || cc || subject) {
      // Get the original message to extract conversation ID
      const originalMessageResponse = await makeGraphRequest(`/me/messages/${messageId}?$select=conversationId,subject`)
      
      if (originalMessageResponse.ok) {
        const originalMessage = await originalMessageResponse.json()
        
        // Create a new message in the same conversation
        const newMessageResponse = await makeGraphRequest('/me/messages', {
          method: 'POST',
          body: JSON.stringify({
            subject: subject || `Re: ${originalMessage.subject || ''}`,
            body: {
              contentType: 'HTML',
              content: htmlBody
            },
            toRecipients: to ? to.map((email: string) => ({ emailAddress: { address: email } })) : [],
            ccRecipients: cc ? cc.map((email: string) => ({ emailAddress: { address: email } })) : [],
            conversationId: originalMessage.conversationId,
            inReplyTo: messageId
          })
        })
        
        if (!newMessageResponse.ok) {
          const newMessageErrorText = await newMessageResponse.text()
          console.error(`Create message error (${newMessageResponse.status}):`, newMessageErrorText)
          
          return NextResponse.json({
            ok: false,
            error: `Create message error: ${newMessageResponse.status}`,
            routeId,
            build
          })
        }

        // Send the new message
        const sendResponse = await makeGraphRequest('/me/sendMail', {
          method: 'POST',
          body: JSON.stringify({
            message: {
              subject: subject || `Re: ${originalMessage.subject || ''}`,
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
