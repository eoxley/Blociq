import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Checking emails in database...')
    
    // Get all emails
    const { data: allEmails, error: allError } = await supabase
      .from('incoming_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allError) {
      console.error('❌ Error fetching all emails:', allError)
      return NextResponse.json({ error: allError.message }, { status: 500 })
    }
    
    // Get user tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError)
    }
    
    // Get table schema info
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('get_table_info', { table_name: 'incoming_emails' })
      .catch(() => ({ data: null, error: 'Schema info not available' }))
    
    const debugInfo = {
      totalEmails: allEmails?.length || 0,
      emails: allEmails?.slice(0, 5) || [], // Show first 5 emails
      totalTokens: tokens?.length || 0,
      tokens: tokens?.slice(0, 3) || [], // Show first 3 tokens
      schemaInfo: schemaInfo,
      tableColumns: allEmails?.[0] ? Object.keys(allEmails[0]) : [],
      timestamp: new Date().toISOString()
    }
    
    console.log('📊 Debug info:', debugInfo)
    
    return NextResponse.json(debugInfo)
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 