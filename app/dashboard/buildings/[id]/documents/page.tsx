'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function BuildingDocumentsPage() {
  const params = useParams()
  const buildingId = params?.id as string

  const [documents, setDocuments] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [docType, setDocType] = useState('')
  const [unitFilter, setUnitFilter] = useState('')

  useEffect(() => {
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from('building_documents')
        .select('id, file_name, file_url, created_at, type, unit_id, leaseholder_id, leaseholders(full_name), units(unit_number)')
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setDocuments(data)
        setFiltered(data)
      }

      setLoading(false)
    }

    if (buildingId) fetchDocs()
  }, [buildingId])

  useEffect(() => {
    const lowerSearch = search.toLowerCase()
    const filtered = documents.filter((doc) => {
      const matchesSearch =
        doc.file_name.toLowerCase().includes(lowerSearch) ||
        doc.leaseholders?.full_name?.toLowerCase().includes(lowerSearch)

      const matchesType = docType ? doc.type === docType : true
      const matchesUnit = unitFilter ? doc.units?.unit_number === unitFilter : true

      return matchesSearch && matchesType && matchesUnit
    })

    setFiltered(filtered)
  }, [search, docType, unitFilter, documents])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Button asChild>
          <Link href={`/dashboard/buildings/${buildingId}`}>← Back to Building</Link>
        </Button>
      </div>

      {/* Filter Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Search by name or leaseholder..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          placeholder="Filter by document type (e.g. Letter)"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        />
        <Input
          placeholder="Filter by unit (e.g. 1A)"
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No matching documents.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{doc.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.type} • Unit {doc.units?.unit_number || '-'} • {doc.leaseholders?.full_name || 'N/A'}
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