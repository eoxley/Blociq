'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { History, Calendar, User, ArrowRight } from 'lucide-react'
import { Tables } from '@/lib/database.types'

type BuildingAmendment = Tables<'building_amendments'> & {
  created_by_user?: {
    full_name: string | null
  } | null
}

interface BuildingAmendmentsProps {
  buildingId: number
}

export default function BuildingAmendments({ buildingId }: BuildingAmendmentsProps) {
  const supabase = createClientComponentClient()
  const [amendments, setAmendments] = useState<BuildingAmendment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchAmendments()
  }, [buildingId])

  const fetchAmendments = async () => {
    try {
      const { data, error } = await supabase
        .from('building_amendments')
        .select(`
          *,
          created_by_user:created_by (
            full_name
          )
        `)
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching amendments:', error)
      } else {
        setAmendments(data || [])
      }
    } catch (error) {
      console.error('Error fetching amendments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAmendments = amendments.filter(amendment => {
    if (!filter) return true
    return (
      amendment.field_name.toLowerCase().includes(filter.toLowerCase()) ||
      amendment.change_description?.toLowerCase().includes(filter.toLowerCase()) ||
      amendment.old_value?.toLowerCase().includes(filter.toLowerCase()) ||
      amendment.new_value?.toLowerCase().includes(filter.toLowerCase())
    )
  })

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'update': return 'default'
      case 'add': return 'success'
      case 'delete': return 'destructive'
      default: return 'outline'
    }
  }

  const getFieldDisplayName = (fieldName: string) => {
    const fieldMap: Record<string, string> = {
      'name': 'Building Name',
      'address': 'Address',
      'access_notes': 'Access Notes',
      'sites_staff': 'Sites Staff',
      'parking_info': 'Parking Information',
      'council_borough': 'Council Borough'
    }
    return fieldMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const toggleDetails = (amendmentId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [amendmentId]: !prev[amendmentId]
    }))
  }

  if (loading) {
    return <div className="p-4">Loading building amendments...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Building Amendments History</h3>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search amendments..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {filteredAmendments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-lg font-medium">No amendments found</p>
            <p className="text-sm">
              {filter ? 'No amendments match your search.' : 'No changes have been made to this building yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAmendments.map((amendment) => (
            <Card key={amendment.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {getFieldDisplayName(amendment.field_name)}
                        </h4>
                        <Badge variant={getChangeTypeColor(amendment.change_type)}>
                          {amendment.change_type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {amendment.created_at ? new Date(amendment.created_at).toLocaleDateString() : 'Unknown date'}
                        </div>
                        {amendment.created_by_user?.full_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {amendment.created_by_user.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDetails(amendment.id)}
                    >
                      {showDetails[amendment.id] ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>

                  {/* Description */}
                  {amendment.change_description && (
                    <p className="text-sm text-gray-600">
                      {amendment.change_description}
                    </p>
                  )}

                  {/* Details */}
                  {showDetails[amendment.id] && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">Previous Value</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                            {amendment.old_value || 'Not set'}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">New Value</Label>
                          <div className="mt-1 p-2 bg-blue-50 rounded text-sm flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-blue-500" />
                            {amendment.new_value || 'Not set'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {amendments.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Total changes: {amendments.length}
              </span>
              <span>
                Last updated: {amendments[0]?.created_at ? 
                  new Date(amendments[0].created_at).toLocaleDateString() : 
                  'Unknown'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 