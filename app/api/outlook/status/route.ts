import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('outlook_access_token')?.value;
    const refreshToken = cookieStore.get('outlook_refresh_token')?.value;

    if (accessToken) {
      return NextResponse.json({
        connected: true,
        message: 'Outlook calendar is connected',
        hasRefreshToken: !!refreshToken
      });
    } else {
      return NextResponse.json({
        connected: false,
        message: 'Outlook calendar is not connected',
        setupRequired: false
      });
    }

  } catch (error) {
    console.error('Error checking Outlook status:', error);
    return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 });
  }
} 