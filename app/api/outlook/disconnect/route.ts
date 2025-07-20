import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Clear all Outlook-related cookies
    cookieStore.delete('outlook_access_token');
    cookieStore.delete('outlook_refresh_token');
    cookieStore.delete('outlook_oauth_state');
    
    return NextResponse.json({
      success: true,
      message: 'Outlook disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Outlook:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
} 