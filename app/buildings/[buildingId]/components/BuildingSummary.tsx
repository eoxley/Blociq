'use client'

import { Building2, MapPin, AlertTriangle, User, Mail, Phone, Info } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string | null
  building_type: string | null
  is_hrb: boolean | null
  site_notes: string | null
  main_contact: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
  updated_at: string
}

interface BuildingSummaryProps {
  building: Building
}

export default function BuildingSummary({ building }: BuildingSummaryProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{building.name}</h1>
              {building.address && (
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{building.address}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* HRB Badge */}
          {building.is_hrb && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              High-Risk Building
            </div>
          )}
        </div>
      </div>

      {/* Building Details */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Building Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Building Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Building Type</p>
                  <p className="text-gray-900">
                    {building.building_type || 'Not specified'}
                  </p>
                </div>
              </div>

              {building.site_notes && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mt-1">
                    <Info className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Site Notes</p>
                    <p className="text-gray-900 text-sm">{building.site_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Main Contact</h3>
            
            {(building.main_contact || building.contact_email || building.contact_phone) ? (
              <div className="space-y-3">
                {building.main_contact && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Contact Name</p>
                      <p className="text-gray-900">{building.main_contact}</p>
                    </div>
                  </div>
                )}

                {building.contact_email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email</p>
                      <a 
                        href={`mailto:${building.contact_email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {building.contact_email}
                      </a>
                    </div>
                  </div>
                )}

                {building.contact_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <a 
                        href={`tel:${building.contact_phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {building.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">
                    No contact information available
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        {building.site_notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Additional Notes</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 text-sm">{building.site_notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 