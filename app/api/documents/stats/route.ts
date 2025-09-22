import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize stats with default values
    let stats = {
      total_documents: 0,
      recent_uploads: 0,
      pending_ocr: 0,
      completed_ocr: 0
    }

    try {
      // Fetch all building documents with error handling
      const { data: documents, error: documentsError } = await supabase
        .from('building_documents')
        .select('id, uploaded_at, ocr_status, created_at')

      if (documentsError) {
        console.error('Error fetching documents for stats:', documentsError)
        // If table doesn't exist or other error, try alternative approach

        // Try to get count from different tables that might exist
        const { count: totalCount } = await supabase
          .from('building_documents')
          .select('id', { count: 'exact', head: true })

        stats.total_documents = totalCount || 0
      } else {
        // Calculate stats from the documents data
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        stats.total_documents = documents?.length || 0

        // Count recent uploads (last 7 days)
        stats.recent_uploads = documents?.filter(doc => {
          const uploadDate = new Date(doc.uploaded_at || doc.created_at)
          return uploadDate > sevenDaysAgo
        }).length || 0

        // Count OCR status if the field exists
        if (documents && documents.length > 0 && documents[0].ocr_status !== undefined) {
          stats.pending_ocr = documents.filter(doc =>
            doc.ocr_status === 'pending' || doc.ocr_status === 'processing'
          ).length || 0

          stats.completed_ocr = documents.filter(doc =>
            doc.ocr_status === 'completed'
          ).length || 0
        } else {
          // If ocr_status field doesn't exist, assume all are completed for AI-ready count
          stats.completed_ocr = stats.total_documents
          stats.pending_ocr = 0
        }
      }
    } catch (error) {
      console.error('Error calculating document stats:', error)
      // Return default stats if there's an error
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Unexpected error in /api/documents/stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document statistics' },
      { status: 500 }
    )
  }
}