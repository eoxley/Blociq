'use client'

import React, { useState } from 'react'
import { Crown, Users, Mail, Phone, Copy, Calendar, Edit, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface RMCDirectorsSectionProps {
  units: any[]
  buildingId: string
}

export default function RMCDirectorsSection({ units, buildingId }: RMCDirectorsSectionProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDirector, setSelectedDirector] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    director_since: '',
    director_notes: ''
  })

  // Filter units to get directors
  const directors = (units || []).filter(unit => unit.leaseholders?.is_director)

  const handleToggleDirector = async (unitId: string, leaseholderId: string, isDirector: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/leaseholders/toggle-director', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaseholder_id: leaseholderId,
          is_director: !isDirector,
          director_since: !isDirector ? new Date().toISOString() : null
        })
      })

      if (response.ok) {
        toast.success(`Director status ${!isDirector ? 'enabled' : 'disabled'} successfully`)
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        throw new Error('Failed to update director status')
      }
    } catch (error) {
      console.error('Error updating director status:', error)
      toast.error('Failed to update director status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateDirector = async () => {
    if (!selectedDirector) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/leaseholders/update-director', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaseholder_id: selectedDirector.leaseholders.id,
          director_since: editForm.director_since,
          director_notes: editForm.director_notes
        })
      })

      if (response.ok) {
        toast.success('Director information updated successfully')
        setIsEditModalOpen(false)
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        throw new Error('Failed to update director information')
      }
    } catch (error) {
      console.error('Error updating director information:', error)
      toast.error('Failed to update director information')
    } finally {
      setIsLoading(false)
    }
  }

  const copyAllDirectorEmails = () => {
    const emails = directors
      .map(unit => unit.leaseholders?.email)
      .filter(Boolean)
      .join(', ')
    
    if (emails) {
      navigator.clipboard.writeText(emails)
      toast.success('All director emails copied to clipboard')
    } else {
      toast.error('No director emails available')
    }
  }

  const openEditModal = (director: any) => {
    setSelectedDirector(director)
    setEditForm({
      director_since: director.leaseholders?.director_since ? 
        format(new Date(director.leaseholders.director_since), 'yyyy-MM-dd') : '',
      director_notes: director.leaseholders?.director_notes || ''
    })
    setIsEditModalOpen(true)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              RMC Directors
            </CardTitle>
            <p className="text-sm text-gray-600">Manage RMC board of directors</p>
          </div>
          {directors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyAllDirectorEmails}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy All Emails
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {directors.length === 0 ? (
          <div className="text-center py-8">
            <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No RMC Directors</h3>
            <p className="text-gray-600">No directors have been assigned to this building yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Director</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Director Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directors.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {unit.leaseholders.name}
                          <Badge className="bg-purple-100 text-purple-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Director
                          </Badge>
                        </div>
                        {unit.leaseholders.email && (
                          <div className="text-sm text-gray-500">{unit.leaseholders.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {unit.unit_number}
                    </TableCell>
                    <TableCell>
                      {unit.leaseholders.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{unit.leaseholders.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No phone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.leaseholders.director_since ? (
                        <span className="text-sm">
                          {format(new Date(unit.leaseholders.director_since), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(unit)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleDirector(unit.id, unit.leaseholders.id, true)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Non-Director Units */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Make Director</h4>
              <div className="space-y-2">
                {units
                  .filter(unit => unit.leaseholders && !unit.leaseholders.is_director)
                  .map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{unit.leaseholders.name}</div>
                        <div className="text-sm text-gray-500">
                          Unit {unit.unit_number} • {unit.leaseholders.email}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleDirector(unit.id, unit.leaseholders.id, false)}
                        disabled={isLoading}
                        className="flex items-center gap-1"
                      >
                        <Crown className="h-4 w-4" />
                        Make Director
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Edit Director Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Director Information</DialogTitle>
            </DialogHeader>
            
            {selectedDirector && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="director_since">Director Since</Label>
                  <Input
                    id="director_since"
                    type="date"
                    value={editForm.director_since}
                    onChange={(e) => setEditForm(prev => ({ ...prev, director_since: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="director_notes">Director Notes</Label>
                  <Textarea
                    id="director_notes"
                    value={editForm.director_notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, director_notes: e.target.value }))}
                    placeholder="Add notes about this director..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateDirector} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </div>
  )
} 