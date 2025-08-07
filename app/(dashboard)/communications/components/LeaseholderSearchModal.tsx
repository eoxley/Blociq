'use client'

import React, { useState, useEffect } from 'react'
import { Search, Phone, Mail, FileText, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface Leaseholder {
  id: string
  full_name: string
  email: string
  phone_number: string
  correspondence_address: string
  unit_number: string
  building_name: string
}

interface LeaseholderSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: 'call' | 'email' | 'letter'
  onLeaseholderSelect: (leaseholder: Leaseholder) => void
}

export default function LeaseholderSearchModal({
  open,
  onOpenChange,
  action,
  onLeaseholderSelect
}: LeaseholderSearchModalProps) {
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (open) {
      fetchLeaseholders()
    }
  }, [open])

  const fetchLeaseholders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leaseholders')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          correspondence_address,
          units (
            unit_number,
            buildings (
              name
            )
          )
        `)
        .order('full_name')

      if (error) throw error

      const formattedLeaseholders = data?.map(l => ({
        id: l.id,
        full_name: l.full_name || 'Unknown',
        email: l.email || '',
        phone_number: l.phone_number || '',
        correspondence_address: l.correspondence_address || '',
        unit_number: l.units?.unit_number || '',
        building_name: l.units?.buildings?.name || ''
      })) || []

      setLeaseholders(formattedLeaseholders)
    } catch (error) {
      console.error('Error fetching leaseholders:', error)
      toast.error('Failed to fetch leaseholders')
    } finally {
      setLoading(false)
    }
  }

  const filteredLeaseholders = leaseholders.filter(l =>
    l.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActionTitle = () => {
    switch (action) {
      case 'call':
        return 'Call a Leaseholder'
      case 'email':
        return 'Send Email to Leaseholder'
      case 'letter':
        return 'Send Letter to Leaseholder'
      default:
        return 'Select Leaseholder'
    }
  }

  const getActionIcon = () => {
    switch (action) {
      case 'call':
        return Phone
      case 'email':
        return Mail
      case 'letter':
        return FileText
      default:
        return Search
    }
  }

  const canPerformAction = (leaseholder: Leaseholder) => {
    switch (action) {
      case 'call':
        return !!leaseholder.phone_number
      case 'email':
        return !!leaseholder.email
      case 'letter':
        return true // Letters can be sent even without correspondence address
      default:
        return true
    }
  }

  const handleLeaseholderClick = (leaseholder: Leaseholder) => {
    if (!canPerformAction(leaseholder)) {
      const message = action === 'call' 
        ? 'No phone number available for this leaseholder'
        : action === 'email'
        ? 'No email address available for this leaseholder'
        : 'Cannot perform action'
      toast.error(message)
      return
    }

    onLeaseholderSelect(leaseholder)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <getActionIcon className="h-5 w-5" />
            {getActionTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search Leaseholders</Label>
            <Input
              id="search"
              placeholder="Search by name, email, building, or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading leaseholders...</p>
              </div>
            ) : filteredLeaseholders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No leaseholders found</p>
              </div>
            ) : (
              filteredLeaseholders.map((leaseholder) => (
                <Card 
                  key={leaseholder.id}
                  className={`cursor-pointer transition-colors ${
                    canPerformAction(leaseholder) 
                      ? 'hover:bg-gray-50' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => handleLeaseholderClick(leaseholder)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{leaseholder.full_name}</h4>
                          <Badge variant="outline">{leaseholder.unit_number}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{leaseholder.building_name}</p>
                        {leaseholder.email && (
                          <p className="text-sm text-gray-500 mt-1">{leaseholder.email}</p>
                        )}
                        {leaseholder.phone_number && (
                          <p className="text-sm text-gray-500 mt-1">{leaseholder.phone_number}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {action === 'call' && leaseholder.phone_number && (
                          <Phone className="h-4 w-4 text-green-600" />
                        )}
                        {action === 'email' && leaseholder.email && (
                          <Mail className="h-4 w-4 text-blue-600" />
                        )}
                        {action === 'letter' && (
                          <FileText className="h-4 w-4 text-purple-600" />
                        )}
                        {!canPerformAction(leaseholder) && (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 