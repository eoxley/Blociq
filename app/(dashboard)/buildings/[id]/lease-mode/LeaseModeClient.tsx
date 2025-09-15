'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  DollarSign,
  User,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Plus,
  Edit,
  Link,
  Home,
  BookOpen,
  CreditCard,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'

interface Lease {
  id: string
  lease_start_date: string
  lease_end_date: string
  term_years: number
  ground_rent_amount: number
  ground_rent_frequency: string
  service_charge_amount: number
  leaseholder_name: string
  property_address: string
  lease_type: string
  restrictions: string[]
  responsibilities: string[]
  apportionments: any
  clauses: any
  metadata: any
  extracted_text: string
  created_at: string
  updated_at: string
  building_id: string
  unit_id: string | null
}

interface Unit {
  id: string
  unit_number: string
  type: string
  floor: string
}

interface LeaseModeClientProps {
  buildingId: string
  buildingName: string
  leases: Lease[]
  units: Unit[]
}

export default function LeaseModeClient({
  buildingId,
  buildingName,
  leases: initialLeases,
  units
}: LeaseModeClientProps) {
  const [leases, setLeases] = useState<Lease[]>(initialLeases)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'financials' | 'restrictions'>('summary')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { supabase } = useSupabase()

  // Filter leases
  const filteredLeases = leases.filter(lease => {
    if (!searchTerm) return true
    return (
      lease.leaseholder_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.lease_type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleLeaseUpload(Array.from(files))
    }
  }, [buildingId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleLeaseUpload(Array.from(files))
    }
  }

  const handleLeaseUpload = async (files: File[]) => {
    if (!supabase || !buildingId) return

    setUploading(true)
    const uploadPromises = files.map(async (file) => {
      try {
        // Only allow PDF files for leases
        if (file.type !== 'application/pdf') {
          toast.error(`${file.name} is not a PDF file. Only PDF leases are supported.`)
          return null
        }

        // Upload file and process
        const formData = new FormData()
        formData.append('file', file)
        formData.append('buildingId', buildingId)

        const response = await fetch('/api/lease-mode/process', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Failed to process lease document')
        }

        const result = await response.json()

        if (result.success && result.lease) {
          // Add to local state
          setLeases(prev => [result.lease, ...prev])
          toast.success(`${file.name} processed successfully`)
          return result.lease
        } else {
          throw new Error(result.error || 'Failed to process lease')
        }

      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error)
        toast.error(`Failed to process ${file.name}`)
        return null
      }
    })

    await Promise.all(uploadPromises)
    setUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getLeaseStatusColor = (lease: Lease) => {
    const endDate = new Date(lease.lease_end_date)
    const now = new Date()
    const yearsRemaining = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)

    if (yearsRemaining < 0) return 'text-red-600 bg-red-50'
    if (yearsRemaining < 80) return 'text-orange-600 bg-orange-50'
    return 'text-green-600 bg-green-50'
  }

  const getLinkedUnit = (lease: Lease) => {
    return units.find(unit => unit.id === lease.unit_id)
  }

  const renderLeaseTab = () => {
    if (!selectedLease) return null

    switch (activeTab) {
      case 'summary':
        return (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Lease Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Leaseholder</label>
                  <p className="text-gray-900">{selectedLease.leaseholder_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Property Address</label>
                  <p className="text-gray-900">{selectedLease.property_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Lease Type</label>
                  <p className="text-gray-900">{selectedLease.lease_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Term</label>
                  <p className="text-gray-900">{selectedLease.term_years} years</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-gray-900">{new Date(selectedLease.lease_start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-gray-900">{new Date(selectedLease.lease_end_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Linked Unit */}
              {selectedLease.unit_id && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Linked to Unit: {getLinkedUnit(selectedLease)?.unit_number}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Overview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Financial Overview
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ground Rent</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedLease.ground_rent_amount)} {selectedLease.ground_rent_frequency}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Service Charge</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedLease.service_charge_amount)} per year
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'clauses':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Lease Clauses</h4>
            {selectedLease.clauses && Object.keys(selectedLease.clauses).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(selectedLease.clauses).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 pb-3">
                    <h5 className="font-medium text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h5>
                    <p className="text-gray-700 text-sm mt-1">{value as string}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No clauses extracted yet. Please reprocess the lease document.</p>
            )}
          </div>
        )

      case 'financials':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedLease.ground_rent_amount)}
                    </div>
                    <div className="text-sm text-blue-700">Ground Rent ({selectedLease.ground_rent_frequency})</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedLease.service_charge_amount)}
                    </div>
                    <div className="text-sm text-green-700">Service Charge (Annual)</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedLease.ground_rent_amount + selectedLease.service_charge_amount)}
                    </div>
                    <div className="text-sm text-purple-700">Total Annual Cost</div>
                  </div>
                </div>

                {selectedLease.apportionments && (
                  <div className="mt-6">
                    <h5 className="font-medium text-gray-900 mb-3">Apportionments</h5>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedLease.apportionments, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'restrictions':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Restrictions & Responsibilities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Restrictions
                </h5>
                {selectedLease.restrictions && selectedLease.restrictions.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedLease.restrictions.map((restriction, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                        {restriction}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No restrictions extracted</p>
                )}
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Responsibilities
                </h5>
                {selectedLease.responsibilities && selectedLease.responsibilities.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedLease.responsibilities.map((responsibility, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></span>
                        {responsibility}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No responsibilities extracted</p>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lease Mode</h1>
          <p className="text-gray-600 mt-1">{buildingName} - {leases.length} leases</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Lease
        </button>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop lease documents here
        </h3>
        <p className="text-gray-600 mb-4">
          Or click the upload button above to select lease PDFs
        </p>
        <p className="text-sm text-gray-500">
          Only PDF files are supported for lease processing
        </p>
        {uploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Processing lease documents...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leases List */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search leases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Leases */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredLeases.map((lease) => {
              const linkedUnit = getLinkedUnit(lease)
              return (
                <div
                  key={lease.id}
                  onClick={() => setSelectedLease(lease)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedLease?.id === lease.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{lease.leaseholder_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{lease.property_address}</p>
                      {linkedUnit && (
                        <div className="flex items-center gap-1 mt-2">
                          <Home className="w-3 h-3 text-blue-500" />
                          <span className="text-xs text-blue-600">Unit {linkedUnit.unit_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-gray-500">
                          {new Date(lease.lease_start_date).getFullYear()} - {new Date(lease.lease_end_date).getFullYear()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getLeaseStatusColor(lease)}`}>
                          {lease.term_years} year lease
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(lease.ground_rent_amount)}
                      </div>
                      <div className="text-xs text-gray-500">{lease.ground_rent_frequency}</div>
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredLeases.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No leases found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload lease documents to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lease Details */}
        <div className="space-y-4">
          {selectedLease ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'summary', label: 'Summary', icon: BookOpen },
                    { key: 'clauses', label: 'Clauses', icon: FileText },
                    { key: 'financials', label: 'Financials', icon: CreditCard },
                    { key: 'restrictions', label: 'Restrictions', icon: Shield }
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                          activeTab === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {renderLeaseTab()}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">Select a lease to view details</p>
                <p className="text-sm text-gray-400 mt-1">
                  Choose a lease from the list to see its detailed information
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}