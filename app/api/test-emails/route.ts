import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    console.log('=== TEST EMAILS API DEBUG ===')

    // Check if incoming_emails table exists and has data
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(10)

    console.log('Emails found:', emails?.length || 0)
    console.log('Emails error:', emailsError)
    console.log('Sample emails:', emails?.slice(0, 2))

    // Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(0)

    console.log('Table info:', tableInfo)
    console.log('Table error:', tableError)

    // Check if there are any emails with buildings relation
    const { data: emailsWithBuildings, error: buildingsError } = await supabase
      .from('incoming_emails')
      .select(`
        *,
        buildings(name)
      `)
      .limit(5)

    console.log('Emails with buildings:', emailsWithBuildings?.length || 0)
    console.log('Buildings error:', buildingsError)

    return NextResponse.json({
      success: true,
      totalEmails: emails?.length || 0,
      emails: emails || [],
      emailsWithBuildings: emailsWithBuildings || [],
      errors: {
        emails: emailsError,
        table: tableError,
        buildings: buildingsError
      }
    })

  } catch (error) {
    console.error('Error in test emails API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 