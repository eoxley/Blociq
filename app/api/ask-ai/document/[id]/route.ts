import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeId = 'app/api/ask-ai/document/[id]/route.ts'
  
  try {
    const documentId = params.id
    
    if (!documentId) {
      return NextResponse.json({
        ok: false,
        diagnostic: 'missing_id',
        routeId
      })
    }
    
    let admin
    try {
      admin = createAdminClient()
    } catch (error) {
      return NextResponse.json({
        ok: false,
        diagnostic: 'service_role_missing',
        routeId
      })
    }
    
    const { data: document, error } = await admin
      .from('building_documents')
      .select('id, file_name, mime_type, text_content, storage_path, building_id, type')
      .eq('id', documentId)
      .single()
    
    if (error || !document) {
      return NextResponse.json({
        ok: false,
        diagnostic: 'not_found',
        routeId
      })
    }
    
    return NextResponse.json({
      ok: true,
      document,
      routeId
    })
    
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({
      ok: false,
      diagnostic: 'internal_error',
      routeId
    })
  }
}
