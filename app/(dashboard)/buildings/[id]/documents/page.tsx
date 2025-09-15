import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DocumentLibraryClient from './DocumentLibraryClient'

interface DocumentLibraryPageProps {
  params: {
    id: string
  }
}

export default async function DocumentLibraryPage({ params }: DocumentLibraryPageProps) {
  const supabase = createClient(cookies())

  try {
    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate building ID format
    if (!params.id || typeof params.id !== 'string') {
      console.error('Invalid building ID:', params.id)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.error('Invalid UUID format for building ID:', params.id)
      notFound()
    }

    // Fetch building to ensure it exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', params.id)
      .maybeSingle()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      throw new Error('Failed to fetch building data')
    }

    if (!building) {
      console.error('Building not found:', params.id)
      notFound()
    }

    // Fetch documents for this building
    const { data: documents = [], error: documentsError } = await supabase
      .from('building_documents')
      .select(`
        id,
        filename,
        file_url,
        file_size,
        mime_type,
        category,
        document_type,
        upload_date,
        ocr_status,
        metadata,
        uploaded_by,
        building_id
      `)
      .eq('building_id', params.id)
      .order('upload_date', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

    return (
      <DocumentLibraryClient
        buildingId={params.id}
        buildingName={building.name}
        documents={documents || []}
      />
    )

  } catch (error) {
    console.error('❌ Error in DocumentLibraryPage:', error)
    throw error
  }
}