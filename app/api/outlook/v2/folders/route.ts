import { NextRequest, NextResponse } from 'next/server'
import { makeGraphRequest } from '@/lib/outlookAuth'

export async function GET(request: NextRequest) {
  const routeId = 'app/api/outlook/v2/folders/route.ts'
  const build = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  try {
    // Get mail folders from Microsoft Graph
    const response = await makeGraphRequest('/me/mailFolders?$top=50&$select=id,displayName,wellKnownName')
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Graph API error (${response.status}):`, errorText)
      
      return NextResponse.json({
        ok: false,
        error: `Graph API error: ${response.status}`,
        items: [],
        routeId,
        build
      })
    }

    const data = await response.json()
    
    return NextResponse.json({
      ok: true,
      items: data.value || [],
      routeId,
      build
    })

  } catch (error) {
    console.error('Error fetching mail folders:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch folders',
      items: [],
      routeId,
      build
    })
  }
}
