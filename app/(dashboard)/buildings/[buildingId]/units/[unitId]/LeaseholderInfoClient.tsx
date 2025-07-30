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
  Shield
} from 'lucide-react'
import Link from 'next/link'

interface Unit {
  id: string
  unit_number: string
  type: string | null
  floor: string | null
  building_id: string
  leaseholder_id: string | null
  created_at: string | null
  leaseholders?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
  } | null
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

interface LeaseholderInfoClientProps {
  building: Building
  unit: Unit
  documents: Document[]
  emails: Email[]
  leases: Lease[]
}

export default function LeaseholderInfoClient({ 
  building, 
  unit, 
  documents, 
  emails,
  leases
}: LeaseholderInfoClientProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

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
                  {building.name} • {unit.leaseholders?.name || 'No leaseholder assigned'}
                </p>
              </div>
            </div>
            {unit.leaseholders?.email && (
              <button
                onClick={() => handleEmail(unit.leaseholders!.email!)}
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Leaseholder:</span>
                      <span className="font-medium">
                        {unit.leaseholders?.name || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Leaseholder Details */}
            {unit.leaseholders && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Leaseholder Information</h2>
                    <p className="text-gray-600">Contact details and leaseholder profile</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Name</label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-gray-900">{unit.leaseholders.name}</span>
                        </div>
                      </div>
                      
                      {unit.leaseholders.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-900">{unit.leaseholders.email}</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEmail(unit.leaseholders!.email!)}
                                className="p-2 text-gray-400 hover:text-[#008C8F] transition-colors"
                                title="Send Email"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(unit.leaseholders!.email!, 'email')}
                                className="p-2 text-gray-400 hover:text-[#008C8F] transition-colors"
                                title="Copy Email"
                              >
                                {copiedField === 'email' ? (
                                  <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {unit.leaseholders.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phone</label>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-900">{unit.leaseholders.phone}</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleCall(unit.leaseholders!.phone!)}
                                className="p-2 text-gray-400 hover:text-[#008C8F] transition-colors"
                                title="Call"
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(unit.leaseholders!.phone!, 'phone')}
                                className="p-2 text-gray-400 hover:text-[#008C8F] transition-colors"
                                title="Copy Phone"
                              >
                                {copiedField === 'phone' ? (
                                  <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                {unit.leaseholders?.email && (
                  <button
                    onClick={() => handleEmail(unit.leaseholders!.email!)}
                    className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Mail className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Send Email</span>
                  </button>
                )}
                {unit.leaseholders?.phone && (
                  <button
                    onClick={() => handleCall(unit.leaseholders!.phone!)}
                    className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Phone className="h-5 w-5 text-[#008C8F] mr-3" />
                    <span className="text-gray-700">Call</span>
                  </button>
                )}
                <Link
                  href={`/buildings/${building.id}/units/${unit.id}/documents`}
                  className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="h-5 w-5 text-[#008C8F] mr-3" />
                  <span className="text-gray-700">View Documents</span>
                </Link>
              </div>
            </div>

            {/* Unit Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Unit Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Unit Number</span>
                  <span className="font-semibold">{unit.unit_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className="font-semibold">{unit.type || 'Residential'}</span>
                </div>
                {unit.floor && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Floor</span>
                    <span className="font-semibold">{unit.floor}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Leaseholder</span>
                  <span className="font-semibold">
                    {unit.leaseholders?.name || 'Not assigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Documents</span>
                  <span className="font-semibold">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Emails</span>
                  <span className="font-semibold">{emails.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 