import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logCommunication } from '@/lib/utils/communications-logger'

/**
 * Test endpoint for communications logging system
 * POST /api/test-communications
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Test logging different types of communications
    const testData = [
      {
        direction: 'outbound' as const,
        subject: 'Test Outbound Email',
        body: 'This is a test outbound communication from the BlocIQ system.',
        metadata: {
          source: 'test_endpoint',
          test: true
        }
      },
      {
        direction: 'inbound' as const,
        subject: 'Test Inbound Email',
        body: 'This is a test inbound communication to the BlocIQ system.',
        metadata: {
          source: 'test_endpoint',
          test: true,
          from_email: 'test@example.com'
        }
      }
    ]

    const results = []

    for (const test of testData) {
      console.log(`📧 Testing ${test.direction} communication...`)

      const result = await logCommunication({
        direction: test.direction,
        subject: test.subject,
        body: test.body,
        metadata: test.metadata
      })

      results.push({
        direction: test.direction,
        success: !!result,
        id: result?.id,
        subject: test.subject
      })

      if (result) {
        console.log(`✅ ${test.direction} communication logged:`, result.id)
      } else {
        console.log(`❌ Failed to log ${test.direction} communication`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Communications logging test completed',
      results
    })

  } catch (error) {
    console.error('❌ Error testing communications:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test communications logging',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check communications table exists and is accessible
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Test read access to communications_log table
    const { data, error } = await supabase
      .from('communications_log')
      .select('id, direction, subject, sent_at')
      .order('sent_at', { ascending: false })
      .limit(5)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Communications table is accessible',
      recent_communications: data || [],
      total_found: data?.length || 0
    })

  } catch (error) {
    console.error('❌ Error accessing communications table:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to access communications table',
      message: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Make sure the communications_log table exists in Supabase'
    }, { status: 500 })
  }
}