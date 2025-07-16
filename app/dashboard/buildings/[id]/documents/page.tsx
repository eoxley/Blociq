'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function BuildingDocumentsPage() {
  const params = useParams()
  const buildingId = params?.id as string
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from('building_documents')
        .select('id, file_name, file_url, created_at, type, unit_id, leaseholder_id, leaseholders(name), units(unit_number)')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setDocuments(data)
      }

      setLoading(false)
    }

    if (buildingId) fetchDocs()
  }, [buildingId])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Button asChild>
          <Link href={`/dashboard/buildings/${buildingId}`}>← Back to Building</Link>
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found for this building.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{doc.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.type} • Unit {doc.units?.unit_number || '-'} • {doc.leaseholders?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleString()}</p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 