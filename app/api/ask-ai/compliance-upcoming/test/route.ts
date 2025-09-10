import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing compliance upcoming API...');
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required',
        user: null
      }, { status: 401 });
    }

    const user = session.user;

    console.log('🔐 User authenticated:', user.id);

    // Test the main API endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/ask-ai/compliance-upcoming`);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      test: {
        apiEndpoint: '/api/ask-ai/compliance-upcoming',
        responseStatus: response.status,
        responseOk: response.ok,
        dataReceived: !!data,
        summaryLength: data?.summary?.length || 0,
        upcomingEventsCount: data?.upcomingEvents?.length || 0,
        totalCount: data?.totalCount || 0,
        buildingCount: data?.buildingCount || 0
      },
      data: data,
      summary: {
        hasSummary: !!data?.summary,
        summaryPreview: data?.summary?.substring(0, 200) + '...',
        hasUpcomingEvents: (data?.upcomingEvents?.length || 0) > 0,
        readyForHomepage: !!data?.summary
      }
    });

  } catch (error) {
    console.error('❌ Compliance upcoming test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
