import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function POST(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/messages/draft/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    const body = await request.json()
    const { to, cc, bcc, subject, htmlBody, attachments } = body

    if (!htmlBody) {
      return NextResponse.json({
        ok: false,
        error: 'Message body is required',
        routeId,
        build
      })
    }

    console.log(`Saving email draft with subject: ${subject || '(No subject)'}`)

    // Create the draft message using Microsoft Graph
    const messageData = {
      subject: subject || '',
      body: {
        contentType: 'HTML',
        content: htmlBody
      },
      ...(to && to.length > 0 && {
        toRecipients: to.map(email => ({
          emailAddress: {
            address: email
          }
        }))
      }),
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

    // Create the draft message (this saves it to Drafts folder)
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
        error: `Failed to create draft: ${createResponse.status}`,
        diagnostic: errorText,
        routeId,
        build
      })
    }

    const createdMessage = await createResponse.json()
    const messageId = createdMessage.id

    console.log(`Successfully saved draft ${messageId}`)
    
    return NextResponse.json({
      ok: true,
      messageId: messageId,
      routeId,
      build
    })

  } catch (error) {
    console.error('Error saving draft:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to save draft',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      routeId,
      build
    })
  }
}
