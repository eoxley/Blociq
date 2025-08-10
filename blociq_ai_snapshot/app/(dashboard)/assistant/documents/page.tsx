import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DocumentAssistantClient from './DocumentAssistantClient'

export default async function DocumentAssistantPage() {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      redirect('/login')
    }

    // Get user's buildings for context
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .order('name')

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
    }

    // Get recent documents for context
    const { data: recentDocuments, error: documentsError } = await supabase
      .from('building_documents')
      .select(`
        id,
        file_name,
        document_type,
        created_at,
        buildings (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (documentsError) {
      console.error('Error fetching recent documents:', documentsError)
    }

    return (
      <DocumentAssistantClient 
        buildings={buildings || []}
        recentDocuments={recentDocuments || []}
      />
    )
    
  } catch (error) {
    console.error('Unexpected error in document assistant page:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-red-600 font-semibold">Error loading document assistant</p>
              <p className="text-red-500 text-sm">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 