import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type FolderItem = { id: string; displayName: string; wellKnownName?: string };

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('outlook_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ 
        ok: false, 
        folders: [], 
        diagnostic: 'Outlook not connected' 
      }, { status: 200 });
    }

    // Try to fetch folders from Microsoft Graph with optimized fields
    const response = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders?$select=id,displayName,wellKnownName', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const folders: FolderItem[] = data.value || [];

    return NextResponse.json({ 
      ok: true, 
      folders,
      diagnostic: null
    });
  } catch (error) {
    console.error('Error fetching Outlook folders:', error);
    
    // Return 200 with empty folders array instead of throwing 5xx error
    return NextResponse.json({ 
      ok: false, 
      folders: [], 
      diagnostic: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 200 });
  }
}
