'use client'

import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Search, 
  Phone, 
  Mail, 
  User, 
  Building, 
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  unit_id: number | null
  unit?: {
    unit_number: string
    building?: {
      name: string
      address: string
    }
  }
}

interface CallLeaseholderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeaseholderSelect: (leaseholder: Leaseholder) => void
  isLoading?: boolean
}

export default function CallLeaseholderModal({
  open,
  onOpenChange,
  onLeaseholderSelect,
  isLoading = false
}: CallLeaseholderModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([])
  const [filteredLeaseholders, setFilteredLeaseholders] = useState<Leaseholder[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Load leaseholders on modal open
  useEffect(() => {
    if (open) {
      loadLeaseholders()
    }
  }, [open])

  // Filter leaseholders based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLeaseholders(leaseholders)
      return
    }

    const filtered = leaseholders.filter(leaseholder => {
      const searchLower = searchTerm.toLowerCase()
      return (
        leaseholder.name?.toLowerCase().includes(searchLower) ||
        leaseholder.email?.toLowerCase().includes(searchLower) ||
        leaseholder.phone?.toLowerCase().includes(searchLower) ||
        leaseholder.unit?.unit_number?.toLowerCase().includes(searchLower) ||
        leaseholder.unit?.building?.name?.toLowerCase().includes(searchLower)
      )
    })

    setFilteredLeaseholders(filtered)
  }, [searchTerm, leaseholders])

  const loadLeaseholders = async () => {
    try {
      setIsSearching(true)
      
      const { data, error } = await supabase
        .from('leaseholders')
        .select(`
          id,
          name,
          email,
          phone,
          unit_id,
          unit:units(
            unit_number,
            building:buildings(
              name,
              address
            )
          )
        `)
        .order('name')

      if (error) throw error

      setLeaseholders(data || [])
    } catch (error) {
      console.error('Error loading leaseholders:', error)
      toast.error('Failed to load leaseholders')
    } finally {
      setIsSearching(false)
    }
  }

  const handleLeaseholderSelect = (leaseholder: Leaseholder) => {
    if (!leaseholder.phone) {
      toast.error('No phone number available for this leaseholder')
      return
    }

    onLeaseholderSelect(leaseholder)
    onOpenChange(false)
    setSearchTerm('')
  }

  const getContactStatus = (leaseholder: Leaseholder) => {
    if (leaseholder.phone) {
      return { status: 'available', text: 'Phone available', color: 'text-green-600' }
    } else {
      return { status: 'unavailable', text: 'No phone number', color: 'text-red-600' }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            Call a Leaseholder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, phone, or unit number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          <div className="space-y-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                <span className="ml-2 text-gray-600">Loading leaseholders...</span>
              </div>
            ) : filteredLeaseholders.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'No leaseholders found matching your search.' : 'No leaseholders available.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {filteredLeaseholders.length} leaseholder{filteredLeaseholders.length !== 1 ? 's' : ''} found
                </p>
                
                {filteredLeaseholders.map((leaseholder) => {
                  const contactStatus = getContactStatus(leaseholder)
                  
                  return (
                    <Card 
                      key={leaseholder.id}
                      className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                        leaseholder.phone ? 'hover:border-green-300' : 'opacity-60'
                      }`}
                      onClick={() => leaseholder.phone && handleLeaseholderSelect(leaseholder)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {leaseholder.name || 'Unknown Name'}
                                </span>
                                {leaseholder.unit?.unit_number && (
                                  <Badge variant="outline" className="text-xs">
                                    {leaseholder.unit.unit_number}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                {leaseholder.unit?.building?.name && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {leaseholder.unit.building.name}
                                  </p>
                                )}
                                
                                {leaseholder.phone && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {leaseholder.phone}
                                  </p>
                                )}
                                
                                {leaseholder.email && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {leaseholder.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${contactStatus.color}`}>
                              {contactStatus.text}
                            </span>
                            
                            {leaseholder.phone ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Phone className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">No phone</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-500">
              Only leaseholders with phone numbers can be called
            </p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 