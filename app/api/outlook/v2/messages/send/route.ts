import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function POST(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/send/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const body = await request.json()
    const { to, cc, bcc, subject, htmlBody, attachments } = body

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'At least one recipient is required',
        routeId,
        build
      })
    }

    if (!subject || !htmlBody) {
      return NextResponse.json({
        ok: false,
        error: 'Subject and message body are required',
        routeId,
        build
      })
    }

    console.log(`Sending new email to: ${to.join(', ')}`)

    // Create the message using Microsoft Graph
    const messageData = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: htmlBody
      },
      toRecipients: to.map(email => ({
        emailAddress: {
          address: email
        }
      })),
      ...(cc && cc.length > 0 && {
        ccRecipients: cc.map(email => ({
          emailAddress: {
            address: email
          }
        }))
      }),
      ...(bcc && bcc.length > 0 && {
        bccRecipients: bcc.map(email => ({
          emailAddress: {
            address: email
          }
        }))
      })
    }

    // Create the message
    const createResponse = await makeGraphRequest('/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error(`Graph API create error (${createResponse.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Failed to create message: ${createResponse.status}`,
        diagnostic: errorText,
        routeId,
        build
      })
    }

    const createdMessage = await createResponse.json()
    const messageId = createdMessage.id

    // Send the message
    const sendResponse = await makeGraphRequest(`/me/messages/${messageId}/send`, {
      method: 'POST'
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error(`Graph API send error (${sendResponse.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Failed to send message: ${sendResponse.status}`,
        diagnostic: errorText,
        routeId,
        build
      })
    }

    console.log(`Successfully sent email ${messageId} to: ${to.join(', ')}`)
    
    return NextResponse.json({
      ok: true,
      messageId: messageId,
      routeId,
      build
    })

  } catch (error) {
    console.error('Error sending email:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to send email',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
