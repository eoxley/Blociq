import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function GET(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/folders/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    console.log(`[${routeId}] Fetching mail folders from Microsoft Graph`)
    
    // Get mail folders from Microsoft Graph
    const response = await makeGraphRequest('/me/mailFolders?$top=50&$select=id,displayName,wellKnownName')
    
    console.log(`[${routeId}] Graph API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[${routeId}] Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        diagnostic: errorText,
        items: [],
        routeId,
        build
      })
    }

    const data = await response.json()
    console.log(`[${routeId}] Successfully fetched ${data.value?.length || 0} folders:`, data.value?.map((f: any) => ({ id: f.id, name: f.displayName, wellKnown: f.wellKnownName })))
    
    return NextResponse.json({
      ok: true,
      items: data.value || [],
      routeId,
      build
    })

  } catch (error) {
    console.error(`[${routeId}] Error fetching mail folders:`, error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch folders',
      diagnostic: error instanceof Error ? error.message : 'Unknown error',
      items: [],
      routeId,
      build
    })
  }
}
