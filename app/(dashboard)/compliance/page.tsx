'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Building2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'

interface ComplianceAsset {
  id: string
  name: string
  category: string
  description: string
  frequency_months: number
}

interface BuildingComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  last_renewed_date: string | null
  next_due_date: string | null
  status: 'compliant' | 'pending' | 'overdue' | 'unknown'
  status_override: string | null
  notes: string | null
  contractor: string | null
  created_at: string
  updated_at: string
  buildings: {
    name: string
  } | null
  compliance_assets: ComplianceAsset | null
}

export default function CompliancePage() {
  const [complianceData, setComplianceData] = useState<BuildingComplianceAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')



  useEffect(() => {
    fetchComplianceData()
  }, [])

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // First check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) {
        throw new Error('Authentication required. Please log in.')
      }

      console.log('🔐 User authenticated:', session.user.id)

      const { data, error } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          buildings (name),
          compliance_assets (name, category, description, frequency_months)
        `)
        .order('next_due_date', { ascending: true })

      if (error) {
        console.error('❌ Database query error:', error)
        throw error
      }

      console.log('✅ Compliance data fetched:', data?.length || 0, 'items')
      setComplianceData(data || [])
    } catch (err) {
      console.error('❌ Error fetching compliance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredData = complianceData.filter(item => {
    if (filterStatus === 'all') return true
    return item.status === filterStatus
  })

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyColor = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return 'text-gray-500'
    if (daysUntilDue < 0) return 'text-red-600 font-semibold'
    if (daysUntilDue <= 30) return 'text-orange-600 font-semibold'
    if (daysUntilDue <= 90) return 'text-yellow-600 font-semibold'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Loading compliance data...</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Checking authentication and database access...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Error Loading Compliance Data</h2>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
            <div className="mt-3 text-sm text-red-600">
              {error.includes('Authentication') && (
                <p>• Please ensure you are logged in</p>
              )}
              {error.includes('permission') && (
                <p>• Check your access permissions for this data</p>
              )}
              {error.includes('relation') && (
                <p>• Database table may not exist or be accessible</p>
              )}
              {error.includes('JWT') && (
                <p>• Your session may have expired - try refreshing the page</p>
              )}
            </div>
            <BlocIQButton 
              onClick={fetchComplianceData}
              className="mt-4"
            >
              Try Again
            </BlocIQButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Compliance Overview</h1>
          </div>
          <p className="text-gray-600">
            Track compliance status across all buildings and assets
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Compliant</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.filter(item => item.status === 'compliant').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.filter(item => item.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.filter(item => item.status === 'overdue').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="unknown">Unknown</option>
            </select>
            
            <BlocIQButton 
              onClick={fetchComplianceData}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </BlocIQButton>
          </div>
        </div>

        {/* Compliance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Assets</h2>
          </div>
          
          {filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance data found</h3>
              <p className="text-gray-500">
                {filterStatus === 'all' 
                  ? 'No compliance assets have been configured yet.'
                  : `No assets with status "${filterStatus}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Renewed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contractor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => {
                    const daysUntilDue = getDaysUntilDue(item.next_due_date)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {item.buildings?.name || 'Unknown Building'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.compliance_assets?.name || 'Unknown Asset'}
                            </div>
                            {item.compliance_assets?.description && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {item.compliance_assets.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.compliance_assets?.category || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(item.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.next_due_date ? (
                            <div>
                              <div className={`text-sm ${getUrgencyColor(daysUntilDue)}`}>
                                {new Date(item.next_due_date).toLocaleDateString()}
                              </div>
                              {daysUntilDue !== null && (
                                <div className="text-xs text-gray-500">
                                  {daysUntilDue < 0 
                                    ? `${Math.abs(daysUntilDue)} days overdue`
                                    : daysUntilDue === 0
                                    ? 'Due today'
                                    : `${daysUntilDue} days remaining`
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.last_renewed_date 
                            ? new Date(item.last_renewed_date).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.contractor || 'Not assigned'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
