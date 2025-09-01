import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing database connection...');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log into your BlocIQ account.',
        authenticated: false
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Test table access - try the simplest possible query first
    const { data: testData, error: testError } = await supabase
      .from('incoming_emails')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Database test error:', testError);
      return NextResponse.json({
        success: false,
        authenticated: true,
        database_accessible: false,
        error: testError.message,
        table_exists: testError.message?.includes('does not exist') ? false : 'unknown'
      });
    }

    console.log('✅ Database test successful');
    return NextResponse.json({
      success: true,
      authenticated: true,
      database_accessible: true,
      table_exists: true,
      test_record_count: testData?.length || 0
    });

  } catch (error) {
    console.error('❌ Test API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}