import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { 
  hasOutlookConnection, 
  getConnectedOutlookEmail, 
  deleteUserOutlookTokens 
} from '@/lib/outlookAuth'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const isConnected = await hasOutlookConnection()
    const connectedEmail = await getConnectedOutlookEmail()

    return NextResponse.json({
      connected: isConnected,
      email: connectedEmail,
      message: isConnected ? 'Outlook is connected' : 'Outlook is not connected'
    })

  } catch (error) {
    console.error('Get connection status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get connection status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    await deleteUserOutlookTokens()

    return NextResponse.json({
      success: true,
      message: 'Outlook connection removed successfully'
    })

  } catch (error) {
    console.error('Disconnect Outlook error:', error)
    return NextResponse.json({ 
      error: 'Failed to disconnect Outlook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 