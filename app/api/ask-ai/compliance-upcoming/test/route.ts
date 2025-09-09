import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing compliance upcoming API...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required',
        user: null
      }, { status: 401 });
    }

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
