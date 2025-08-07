'use client'

import React, { useState, useEffect } from 'react'
import { Building, Mail, FileText, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  address: string
  leaseholderCount?: number
}

interface BuildingSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: 'email-all' | 'letter-all'
  onBuildingSelect: (building: Building) => void
}

export default function BuildingSearchModal({
  open,
  onOpenChange,
  action,
  onBuildingSelect
}: BuildingSearchModalProps) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchBuildings()
    }
  }, [open])

  const fetchBuildings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .order('name')

      if (error) throw error

      // Fetch leaseholder counts for each building
      const buildingsWithCounts = await Promise.all(
        (data || []).map(async (building) => {
          const { count } = await supabase
            .from('leaseholders')
            .select('*', { count: 'exact', head: true })
            .eq('units.buildings.id', building.id)

          return {
            ...building,
            leaseholderCount: count || 0
          }
        })
      )

      setBuildings(buildingsWithCounts)
    } catch (error) {
      console.error('Error fetching buildings:', error)
      toast.error('Failed to fetch buildings')
    } finally {
      setLoading(false)
    }
  }

  const getActionTitle = () => {
    switch (action) {
      case 'email-all':
        return 'Email All Leaseholders in Building'
      case 'letter-all':
        return 'Send Letter to All Leaseholders in Building'
      default:
        return 'Select Building'
    }
  }

  const getActionIcon = () => {
    switch (action) {
      case 'email-all':
        return Mail
      case 'letter-all':
        return FileText
      default:
        return Building
    }
  }

  const handleBuildingClick = (building: Building) => {
    onBuildingSelect(building)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <getActionIcon className="h-5 w-5" />
            {getActionTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading buildings...</p>
            </div>
          ) : buildings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No buildings found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buildings.map((building) => (
                <Card 
                  key={building.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleBuildingClick(building)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{building.name}</h4>
                          <Badge variant="outline">
                            {building.leaseholderCount} leaseholders
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{building.address}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="h-5 w-5 text-gray-400" />
                        {action === 'email-all' && (
                          <Mail className="h-4 w-4 text-blue-600" />
                        )}
                        {action === 'letter-all' && (
                          <FileText className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 