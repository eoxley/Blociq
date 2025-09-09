import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Test the email summary endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/ask-ai/email-summary`);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Email summary endpoint returned ${response.status}`,
        status: response.status
      });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Email summary endpoint is working',
      data: {
        connected: data.connected,
        hasSummary: !!data.summary,
        summaryLength: data.summary?.length || 0,
        analysis: data.analysis ? {
          totalEmails: data.analysis.totalEmails,
          unreadCount: data.analysis.unreadCount,
          flaggedCount: data.analysis.flaggedCount
        } : null
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test email summary endpoint'
    }, { status: 500 });
  }
}
