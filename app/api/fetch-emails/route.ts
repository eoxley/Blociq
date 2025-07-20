import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { makeGraphRequest, hasOutlookConnection } from '@/lib/outlookAuth'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Check if user has connected Outlook
    const hasConnection = await hasOutlookConnection()
    if (!hasConnection) {
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first' 
      }, { status: 400 })
    }

    const searchParams = req.nextUrl.searchParams
    const folder = searchParams.get('folder') || 'inbox'
    const top = searchParams.get('top') || '50'
    const skip = searchParams.get('skip') || '0'

    // Build the Graph API endpoint based on folder
    let endpoint = `/me/mailFolders/${folder}/messages`
    endpoint += `?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc`
    endpoint += '&$select=id,subject,bodyPreview,receivedDateTime,from,toRecipients,isRead,hasAttachments,importance,conversationId,body'

    // Get emails from Microsoft Graph API
    const response = await makeGraphRequest(endpoint)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Graph API error:', errorText)
      throw new Error(`Failed to fetch emails: ${response.statusText}`)
    }

    const data = await response.json()
    const emails = data.value || []

    // Transform emails to match our format
    const transformedEmails = emails.map((email: any) => ({
      id: email.id,
      subject: email.subject || 'No Subject',
      bodyPreview: email.bodyPreview || '',
      receivedDateTime: email.receivedDateTime,
      from: email.from?.emailAddress?.address || '',
      toRecipients: email.toRecipients?.map((recipient: any) => recipient.emailAddress?.address) || [],
      isRead: email.isRead || false,
      hasAttachments: email.hasAttachments || false,
      importance: email.importance || 'normal',
      conversationId: email.conversationId,
      body: email.body?.content || ''
    }))

    return NextResponse.json({
      success: true,
      emails: transformedEmails,
      count: transformedEmails.length,
      total: data['@odata.count'] || transformedEmails.length
    })

  } catch (error) {
    console.error('Fetch emails error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch emails',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
