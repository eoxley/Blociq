'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  DollarSign,
  Shield,
  FileCheck,
  BarChart3,
  BookOpen
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'
import ClauseViewer from './ClauseViewer'
import BuildingLeaseSummary from './BuildingLeaseSummary'

interface Building {
  id: string
  name: string
  address?: string
}

interface Lease {
  id: string
  unit_number: string
  leaseholder_name: string
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'terminated'
  ground_rent: string
  service_charge_percentage: number
  responsibilities: string[]
  restrictions: string[]
  rights: string[]
  file_path: string
  ocr_text?: string
  metadata?: any
  created_at: string
  updated_at: string
}

export default function BuildingLeaseMode({ building }: { building: Building }) {
  const { supabase } = useSupabase()
  const [leases, setLeases] = useState<Lease[]>([])
  const [filteredLeases, setFilteredLeases] = useState<Lease[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
  const [activeTab, setActiveTab] = useState<'index' | 'summary'>('index')

  useEffect(() => {
    fetchLeases()
  }, [building.id])

  useEffect(() => {
    filterLeases()
  }, [leases, searchTerm])

  const fetchLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          unit_number,
          leaseholder_name,
          start_date,
          end_date,
          status,
          ground_rent,
          service_charge_percentage,
          responsibilities,
          restrictions,
          rights,
          file_path,
          ocr_text,
          metadata,
          created_at,
          updated_at
        `)
        .eq('building_id', building.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeases(data || [])
    } catch (error) {
      console.error('Error fetching leases:', error)
      toast.error('Failed to load leases')
    }
  }

  const filterLeases = () => {
    let filtered = leases

    if (searchTerm) {
      filtered = filtered.filter(lease =>
        lease.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lease.leaseholder_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLeases(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'expired':
        return 'text-red-600 bg-red-100'
      case 'terminated':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: string) => {
    if (amount === 'peppercorn' || amount === 'Peppercorn') {
      return 'Peppercorn'
    }
    return `£${amount}`
  }

  if (selectedLease) {
    return (
      <ClauseViewer
        lease={selectedLease}
        buildingId={building.id}
        onBack={() => setSelectedLease(null)}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Modern Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Lease Mode</h1>
              <p className="text-xl text-white/90 mt-2">{building.name}</p>
              <p className="text-white/80 mt-1">Comprehensive lease analysis and building-wide clause indexing</p>
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveTab('index')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'index'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Lease Index
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Building Summary
          </button>
        </div>

        {activeTab === 'index' && (
          <div className="relative flex-1 max-w-md ml-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leases by unit or leaseholder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' ? (
        <BuildingLeaseSummary
          buildingId={building.id}
          buildingName={building.name}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Lease Index</h2>
              <div className="text-sm text-gray-500">
                {filteredLeases.length} lease{filteredLeases.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>

          {filteredLeases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No leases found for this building</p>
              <p className="text-sm mt-2">Lease uploads are handled at the unit level</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leaseholder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      View Lease
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeases.map(lease => (
                    <tr
                      key={lease.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLease(lease)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lease.unit_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lease.leaseholder_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(lease.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(lease.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLease(lease)
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View full lease document and analysis"
                        >
                          <FileText className="h-4 w-4" />
                          View Lease
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lease.status)}`}>
                          {lease.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLease(lease)
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View clause analysis"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="Download lease document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}