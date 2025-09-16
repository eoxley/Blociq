import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 })
    }

    // Get building documents with categories and statistics
    const { data: documents, error: docsError } = await supabase
      .from('building_documents')
      .select(`
        id,
        name,
        category,
        type,
        file_size,
        uploaded_at,
        ocr_status
      `)
      .eq('building_id', buildingId)
      .order('uploaded_at', { ascending: false })

    if (docsError) {
      console.error('Error fetching building documents:', docsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 400 })
    }

    // Calculate statistics
    const stats = {
      total: documents?.length || 0,
      byCategory: {} as Record<string, number>,
      byStatus: {
        processed: documents?.filter(d => d.ocr_status === 'completed').length || 0,
        pending: documents?.filter(d => d.ocr_status === 'pending').length || 0,
        failed: documents?.filter(d => d.ocr_status === 'failed').length || 0
      },
      totalSize: documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0
    }

    // Group by category
    documents?.forEach(doc => {
      const category = doc.category || 'other'
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
    })

    return NextResponse.json({
      documents: documents || [],
      stats
    })

  } catch (error) {
    console.error('Unexpected error in building documents endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}