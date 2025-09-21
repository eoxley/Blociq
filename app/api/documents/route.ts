import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get building_id from query params
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('building_id')

    // If no building_id provided, return empty array gracefully
    if (!buildingId) {
      console.log('No building_id provided to /api/documents, returning empty array')
      return NextResponse.json([])
    }

    // Fetch building documents
    const { data: documents, error } = await supabase
      .from('building_documents')
      .select(`
        id,
        name,
        file_path,
        category,
        uploaded_by,
        uploaded_at,
        building_id
      `)
      .eq('building_id', buildingId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching building documents:', error)
      // Return empty array instead of error to prevent UI crashes
      return NextResponse.json([])
    }

    // Fetch building name separately if we have documents
    let buildingName = 'Unknown Building'
    if (documents && documents.length > 0) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', buildingId)
        .single()

      if (building) {
        buildingName = building.name
      }
    }

    // Transform the data to match expected format
    const transformedDocuments = (documents || []).map(doc => ({
      id: doc.id,
      file_name: doc.name,
      doc_url: doc.file_path,
      doc_type: doc.category,
      uploaded_by: doc.uploaded_by,
      building_name: buildingName
    }))

    return NextResponse.json(transformedDocuments)

  } catch (error) {
    console.error('Unexpected error in /api/documents:', error)
    // Return empty array instead of 500 to prevent UI crashes
    return NextResponse.json([])
  }
}