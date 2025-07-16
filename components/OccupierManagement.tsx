'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Calendar, Mail, Phone, PoundSterling } from 'lucide-react'
import { Tables } from '@/lib/database.types'

type Occupier = Tables<'occupiers'>
type Unit = Tables<'units'>

interface OccupierManagementProps {
  unit: Unit
  onOccupierAdded?: () => void
}

export default function OccupierManagement({ unit, onOccupierAdded }: OccupierManagementProps) {
  const supabase = createClientComponentClient()
  const [occupiers, setOccupiers] = useState<Occupier[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOccupier, setEditingOccupier] = useState<Occupier | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    start_date: '',
    end_date: '',
    rent_amount: '',
    rent_frequency: 'monthly',
    status: 'active',
    notes: ''
  })

  useEffect(() => {
    fetchOccupiers()
  }, [unit.id])

  const fetchOccupiers = async () => {
    try {
      const { data, error } = await supabase
        .from('occupiers')
        .select('*')
        .eq('unit_id', unit.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching occupiers:', error)
      } else {
        setOccupiers(data || [])
      }
    } catch (error) {
      console.error('Error fetching occupiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const occupierData = {
        unit_id: unit.id,
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        rent_amount: formData.rent_amount ? parseFloat(formData.rent_amount) : null,
        rent_frequency: formData.rent_frequency,
        status: formData.status,
        notes: formData.notes || null
      }

      if (editingOccupier) {
        // Update existing occupier
        const { error } = await supabase
          .from('occupiers')
          .update(occupierData)
          .eq('id', editingOccupier.id)

        if (error) {
          console.error('Error updating occupier:', error)
          return
        }
      } else {
        // Create new occupier
        const { error } = await supabase
          .from('occupiers')
          .insert(occupierData)

        if (error) {
          console.error('Error creating occupier:', error)
          return
        }
      }

      // Reset form and close dialog
      resetForm()
      setIsDialogOpen(false)
      fetchOccupiers()
      onOccupierAdded?.()
    } catch (error) {
      console.error('Error saving occupier:', error)
    }
  }

  const handleEdit = (occupier: Occupier) => {
    setEditingOccupier(occupier)
    setFormData({
      full_name: occupier.full_name,
      email: occupier.email || '',
      phone: occupier.phone || '',
      start_date: occupier.start_date || '',
      end_date: occupier.end_date || '',
      rent_amount: occupier.rent_amount?.toString() || '',
      rent_frequency: occupier.rent_frequency || 'monthly',
      status: occupier.status || 'active',
      notes: occupier.notes || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (occupierId: string) => {
    if (!confirm('Are you sure you want to delete this occupier?')) return

    try {
      const { error } = await supabase
        .from('occupiers')
        .delete()
        .eq('id', occupierId)

      if (error) {
        console.error('Error deleting occupier:', error)
      } else {
        fetchOccupiers()
      }
    } catch (error) {
      console.error('Error deleting occupier:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      start_date: '',
      end_date: '',
      rent_amount: '',
      rent_frequency: 'monthly',
      status: 'active',
      notes: ''
    })
    setEditingOccupier(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'secondary'
      case 'pending': return 'warning'
      default: return 'outline'
    }
  }

  if (loading) {
    return <div className="p-4">Loading occupiers...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Occupiers (Sub-tenancies)</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Occupier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOccupier ? 'Edit Occupier' : 'Add New Occupier'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rent_amount">Rent Amount</Label>
                  <Input
                    id="rent_amount"
                    type="number"
                    step="0.01"
                    value={formData.rent_amount}
                    onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rent_frequency">Frequency</Label>
                  <Select
                    value={formData.rent_frequency}
                    onValueChange={(value) => setFormData({ ...formData, rent_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingOccupier ? 'Update' : 'Add'} Occupier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {occupiers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <p>No occupiers found for this unit.</p>
            <p className="text-sm">Add an occupier to track sub-tenancies.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {occupiers.map((occupier) => (
            <Card key={occupier.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{occupier.full_name}</h4>
                      <Badge variant={getStatusColor(occupier.status)}>
                        {occupier.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      {occupier.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {occupier.email}
                        </div>
                      )}
                      {occupier.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {occupier.phone}
                        </div>
                      )}
                      {occupier.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(occupier.start_date).toLocaleDateString()}
                        </div>
                      )}
                      {occupier.rent_amount && (
                        <div className="flex items-center gap-1">
                          <PoundSterling className="h-3 w-3" />
                          £{occupier.rent_amount} {occupier.rent_frequency}
                        </div>
                      )}
                    </div>
                    
                    {occupier.notes && (
                      <p className="text-sm text-gray-500">{occupier.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(occupier)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(occupier.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 