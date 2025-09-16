'use client'

import { useState } from 'react'
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  MessageSquare, 
  ArrowLeft, 
  Copy, 
  ExternalLink,
  Shield,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  Save,
  X,
  Crown
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import CommunicationsLog from '@/components/communications/CommunicationsLog'

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string
  leaseholder_id: string | null
  created_at: string | null
}

interface Leaseholder {
  id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  correspondence_address?: string | null
  is_director: boolean | null
}

interface Building {
  id: string
  name: string
  address: string | null
}

interface Document {
  id: string
  file_name: string
  file_url: string
  type: string | null
  created_at: string
}

interface Email {
  id: string
  subject: string | null
  from_email: string
  body_preview: string | null
  received_at: string
}

interface Lease {
  id: string
  building_id: number
  unit_id: number | null
  start_date: string | null
  expiry_date: string | null
  doc_type: string | null
  is_headlease: boolean | null
  doc_url: string | null
  created_at: string | null
}

interface LeaseholderFormData {
  full_name: string
  email: string
  phone_number: string
  correspondence_address: string
}

interface LeaseholderInfoClientProps {
  building: Building
  unit: Unit
  leaseholder: Leaseholder | null
  leaseholders: Leaseholder[]
  documents: Document[]
  emails: Email[]
  leases: Lease[]
}

export default function LeaseholderInfoClient({ 
  building, 
  unit, 
  leaseholder,
  leaseholders,
  documents, 
  emails,
  leases
}: LeaseholderInfoClientProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLeaseholder, setEditingLeaseholder] = useState<Leaseholder | null>(null)
  const [formData, setFormData] = useState<LeaseholderFormData>({
    full_name: '',
    email: '',
    phone_number: '',
    correspondence_address: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank')
  }

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_blank')
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      correspondence_address: ''
    })
    setEditingLeaseholder(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const leaseholderData = {
        unit_id: unit.id,
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        correspondence_address: formData.correspondence_address.trim() || null
      }

      if (editingLeaseholder) {
        const { error } = await supabase
          .from('leaseholders')
          .update(leaseholderData)
          .eq('id', editingLeaseholder.id)

        if (error) {
          console.error('Error updating leaseholder:', error)
          toast.error('Failed to update leaseholder')
        } else {
          toast.success('Leaseholder updated successfully')
          window.location.reload() // Refresh to get updated data
        }
      } else {
        const { error } = await supabase
          .from('leaseholders')
          .insert([leaseholderData])

        if (error) {
          console.error('Error creating leaseholder:', error)
          toast.error('Failed to create leaseholder')
        } else {
          toast.success('Leaseholder added successfully')
          window.location.reload() // Refresh to get updated data
        }
      }

      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving leaseholder:', error)
      toast.error('Failed to save leaseholder')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (leaseholder: Leaseholder) => {
    setEditingLeaseholder(leaseholder)
    setFormData({
      full_name: leaseholder.full_name || '',
      email: leaseholder.email || '',
      phone_number: leaseholder.phone_number || '',
      correspondence_address: leaseholder.correspondence_address || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (leaseholderId: string) => {
    if (!confirm('Are you sure you want to delete this leaseholder?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('leaseholders')
        .delete()
        .eq('id', leaseholderId)

      if (error) {
        console.error('Error deleting leaseholder:', error)
        toast.error('Failed to delete leaseholder')
      } else {
        toast.success('Leaseholder deleted successfully')
        window.location.reload() // Refresh to get updated data
      }
    } catch (error) {
      console.error('Error deleting leaseholder:', error)
      toast.error('Failed to delete leaseholder')
    }
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP: Header with BlocIQ Gradient */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/buildings/${building.id}`}>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors">
                  <ArrowLeft className="h-6 w-6" />
                </div>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Unit {unit.unit_number}</h1>
                <p className="text-white/80 text-lg">
                  {building.name} • {leaseholders.length > 0 
                    ? leaseholders.length === 1 
                      ? leaseholder?.full_name 
                      : `${leaseholders.length} leaseholders`
                    : 'No leaseholders assigned'
                  }
                </p>
                {leaseholder?.email && (
                  <p className="text-white/60 text-sm mt-1">
                    {leaseholder.email}
                  </p>
                )}
              </div>
            </div>
            {leaseholder?.email && (
              <button
                onClick={() => handleEmail(leaseholder!.email!)}
                className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors flex items-center space-x-2"
              >
                <Mail className="h-5 w-5" />
                <span>Send Email</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SECTION 1: Unit Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Unit Information</h2>
                  <p className="text-gray-600">Basic unit details and location</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unit Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit Number:</span>
                      <span className="font-medium">{unit.unit_number}</span>
                    </div>
                    {unit.floor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Floor:</span>
                        <span className="font-medium">{unit.floor}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{unit.type || 'Residential'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Building:</span>
                      <span className="font-medium">{building.name}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Primary Leaseholder</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Name:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {leaseholder?.full_name || 'Not assigned'}
                        </span>
                        {leaseholder?.is_director && (
                          <Badge className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Director
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Leaseholders:</span>
                      <span className="font-medium">{leaseholders.length}</span>
                    </div>
                    {leaseholder?.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-[#008C8F]">{leaseholder.email}</span>
                      </div>
                    )}
                    {leaseholder?.correspondence_address && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span className="font-medium text-sm">{leaseholder.correspondence_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Consolidated Leaseholder Management */}
            <div className="bg-white rounded-2xl shadow-xl">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Leaseholders</h2>
                      <p className="text-gray-600">
                        {leaseholders.length} leaseholder{leaseholders.length !== 1 ? 's' : ''} for this unit
                      </p>
                    </div>
                  </div>
                  <Button onClick={openAddDialog} className="flex items-center gap-2 bg-gradient-to-r from-[#008C8F] to-[#7645ED] hover:opacity-90">
                    <Plus className="h-4 w-4" />
                    Add Leaseholder
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {leaseholders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">No leaseholders found</h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      No leaseholders are currently associated with this unit. Add the first leaseholder to get started.
                    </p>
                    <Button onClick={openAddDialog} className="flex items-center gap-2 bg-gradient-to-r from-[#008C8F] to-[#7645ED] hover:opacity-90">
                      <Plus className="h-4 w-4" />
                      Add First Leaseholder
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaseholders.map((lh, index) => (
                      <Card key={lh.id} className="border border-gray-200 hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                  <User className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-lg font-semibold text-gray-900">
                                      {lh.full_name || 'Unnamed Leaseholder'}
                                    </h4>
                                    {lh.is_director && (
                                      <Badge className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
                                        <Crown className="h-3 w-3 mr-1" />
                                        Director
                                      </Badge>
                                    )}
                                    {lh.id === leaseholder?.id && (
                                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {lh.email && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="h-4 w-4" />
                                        {lh.email}
                                      </div>
                                    )}
                                    {lh.phone_number && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-4 w-4" />
                                        {lh.phone_number}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {lh.correspondence_address && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium text-gray-900">Correspondence Address</span>
                                  </div>
                                  <p className="text-sm text-gray-700">{lh.correspondence_address}</p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Leaseholder {index + 1}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              {lh.email && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEmail(lh.email!)}
                                  className="flex items-center gap-1"
                                >
                                  <Mail className="h-4 w-4" />
                                  Email
                                </Button>
                              )}
                              {lh.phone_number && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCall(lh.phone_number!)}
                                  className="flex items-center gap-1"
                                >
                                  <Phone className="h-4 w-4" />
                                  Call
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(lh)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(lh.id)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Lease Information */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Lease Information</h2>
                  <p className="text-gray-600">Lease terms and responsibilities</p>
                </div>
              </div>
              
              {leases.length > 0 ? (
                <div className="space-y-4">
                  {leases.map((lease) => (
                    <div key={lease.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Lease Details</h3>
                          <div className="space-y-2">
                            {lease.start_date && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Start Date:</span>
                                <span className="font-medium">{new Date(lease.start_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {lease.expiry_date && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expiry Date:</span>
                                <span className="font-medium">{new Date(lease.expiry_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {lease.doc_type && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Document Type:</span>
                                <span className="font-medium">{lease.doc_type}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Headlease:</span>
                              <span className="font-medium">
                                {lease.is_headlease ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Document</h3>
                          {lease.doc_url ? (
                            <a
                              href={lease.doc_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 text-[#008C8F] hover:text-[#7645ED] transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>View Lease Document</span>
                            </a>
                          ) : (
                            <p className="text-gray-500">No document uploaded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No lease information available</h3>
                  <p className="text-gray-600">
                    Lease information will be displayed here when available.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 4: Linked Documents */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Linked Documents</h2>
                  <p className="text-gray-600">Documents associated with this unit</p>
                </div>
              </div>
              
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{doc.file_name}</p>
                          <p className="text-sm text-gray-600">
                            {doc.type} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-[#008C8F] transition-colors"
                        title="View Document"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-600">
                    No documents are currently linked to this unit.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 5: Correspondence */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Correspondence</h2>
                  <p className="text-gray-600">Recent emails and communications</p>
                </div>
              </div>
              
              {emails.length > 0 ? (
                <div className="space-y-3">
                  {emails.map((email) => (
                    <div key={email.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">{email.from_email}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(email.received_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 mb-1">
                            {email.subject || 'No Subject'}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {email.body_preview || 'No preview available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No correspondence found</h3>
                  <p className="text-gray-600">
                    No emails have been sent to this leaseholder yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {leaseholder?.email && (
                  <Button
                    onClick={() => handleEmail(leaseholder!.email!)}
                    className="w-full flex items-center justify-start p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    variant="ghost"
                  >
                    <Mail className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Send Email</span>
                  </Button>
                )}
                {leaseholder?.phone_number && (
                  <Button
                    onClick={() => handleCall(leaseholder!.phone_number!)}
                    className="w-full flex items-center justify-start p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    variant="ghost"
                  >
                    <Phone className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Call</span>
                  </Button>
                )}
                <Link
                  href={`/buildings/${building.id}/units/${unit.id}/documents`}
                  className="w-full flex items-center justify-start p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg"
                >
                  <FileText className="h-5 w-5 text-[#008C8F] mr-3" />
                  <span className="text-gray-700">View Documents</span>
                </Link>
              </div>
            </div>

            {/* Unit Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Unit Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Leaseholders:</span>
                  <span className="font-medium">{leaseholders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents:</span>
                  <span className="font-medium">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Leases:</span>
                  <span className="font-medium">{leases.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Emails:</span>
                  <span className="font-medium">{emails.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Communications Section */}
      {leaseholder && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <CommunicationsLog
            leaseholderId={leaseholder.id}
            title={`Communications with ${leaseholder.full_name || 'Leaseholder'}`}
            showFilters={true}
            limit={50}
          />
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {editingLeaseholder ? 'Edit Leaseholder' : 'Add New Leaseholder'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  placeholder="Full name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <Label htmlFor="correspondence_address">Correspondence Address</Label>
                <Textarea
                  id="correspondence_address"
                  value={formData.correspondence_address}
                  onChange={(e) => setFormData({...formData, correspondence_address: e.target.value})}
                  placeholder="Correspondence address"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex items-center gap-2 bg-gradient-to-r from-[#008C8F] to-[#7645ED] hover:opacity-90"
                disabled={isLoading}
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : (editingLeaseholder ? 'Update' : 'Add') + ' Leaseholder'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 