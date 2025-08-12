import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverTrace } from '@/lib/trace';

type FolderItem = { id: string; displayName: string; wellKnownName?: string };

export async function GET(request: NextRequest) {
  serverTrace("API hit", { route: "app/api/outlook/folders/route.ts", build: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
  
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

    const json = { 
      ok: true, 
      folders,
      diagnostic: null,
      routeId: "app/api/outlook/folders/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    const res = NextResponse.json(json);
    res.headers.set("x-blociq-route", "app/api/outlook/folders/route.ts");
    return res;
  } catch (error) {
    console.error('Error fetching Outlook folders:', error);
    
    // Return 200 with empty folders array instead of throwing 5xx error
    const json = { 
      ok: false, 
      folders: [], 
      diagnostic: error instanceof Error ? error.message : 'Unknown error occurred',
      routeId: "app/api/outlook/folders/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    const res = NextResponse.json(json, { status: 200 });
    res.headers.set("x-blociq-route", "app/api/outlook/folders/route.ts");
    return res;
  }
}
