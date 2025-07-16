'use client'

import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, Eye, Upload, Bell } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getActiveComplianceAssets, ActiveComplianceAsset } from '../../lib/complianceUtils'

interface BuildingComplianceSummary {
  id: number
  name: string
  complianceRate: number
  compliantCount: number
  overdueCount: number
  missingCount: number
  dueSoonCount: number
  nextInspectionDue: string | null
  totalAssets: number
}

interface ComplianceBuildingsViewProps {
  onViewBuilding: (buildingId: number, buildingName: string) => void
}

export default function ComplianceBuildingsView({ onViewBuilding }: ComplianceBuildingsViewProps) {
  const [buildings, setBuildings] = useState<BuildingComplianceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadBuildingsCompliance()
  }, [])

  const loadBuildingsCompliance = async () => {
    try {
      setLoading(true)
      
      // Fetch all buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name')

      if (buildingsError) {
        console.error('Error fetching buildings:', buildingsError)
        return
      }

      // Calculate compliance summary for each building
      const buildingSummaries: BuildingComplianceSummary[] = []
      
      for (const building of buildingsData || []) {
        try {
          const activeAssets = await getActiveComplianceAssets(supabase, building.id.toString())
          
          const compliantCount = activeAssets.filter(asset => asset.status === 'compliant').length
          const overdueCount = activeAssets.filter(asset => asset.status === 'overdue').length
          const missingCount = activeAssets.filter(asset => asset.status === 'missing').length
          const dueSoonCount = activeAssets.filter(asset => asset.status === 'due_soon').length
          const totalAssets = activeAssets.length
          
          const complianceRate = totalAssets > 0 ? Math.round((compliantCount / totalAssets) * 100) : 0
          
          // Find next inspection due date
          const nextDueAsset = activeAssets
            .filter(asset => asset.expiry_date && asset.status !== 'compliant')
            .sort((a, b) => {
              if (!a.expiry_date) return 1
              if (!b.expiry_date) return -1
              return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            })[0]
          
          buildingSummaries.push({
            id: building.id,
            name: building.name,
            complianceRate,
            compliantCount,
            overdueCount,
            missingCount,
            dueSoonCount,
            nextInspectionDue: nextDueAsset?.expiry_date || null,
            totalAssets
          })
        } catch (error) {
          console.error(`Error loading compliance for building ${building.id}:`, error)
          // Add building with zero compliance if there's an error
          buildingSummaries.push({
            id: building.id,
            name: building.name,
            complianceRate: 0,
            compliantCount: 0,
            overdueCount: 0,
            missingCount: 0,
            dueSoonCount: 0,
            nextInspectionDue: null,
            totalAssets: 0
          })
        }
      }

      setBuildings(buildingSummaries)
    } catch (error) {
      console.error('Error loading buildings compliance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getComplianceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComplianceRateBg = (rate: number) => {
    if (rate >= 90) return 'bg-green-100'
    if (rate >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Building Compliance Overview
        </h2>
        <p className="text-gray-600">
          Track compliance status across all buildings in your portfolio
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-teal-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Buildings</p>
              <p className="text-2xl font-bold text-gray-900">{buildings.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Fully Compliant</p>
              <p className="text-2xl font-bold text-gray-900">
                {buildings.filter(b => b.complianceRate === 100).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {buildings.reduce((sum, b) => sum + b.overdueCount, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Due Soon</p>
              <p className="text-2xl font-bold text-gray-900">
                {buildings.reduce((sum, b) => sum + b.dueSoonCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Building Compliance Status</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Building
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compliance Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assets Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Inspection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {buildings.map((building) => (
                <tr key={building.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{building.name}</div>
                    <div className="text-sm text-gray-500">{building.totalAssets} assets</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceRateBg(building.complianceRate)} ${getComplianceRateColor(building.complianceRate)}`}>
                      {building.complianceRate}%
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {building.compliantCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {building.compliantCount}
                        </span>
                      )}
                      {building.overdueCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {building.overdueCount}
                        </span>
                      )}
                      {building.dueSoonCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {building.dueSoonCount}
                        </span>
                      )}
                      {building.missingCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Shield className="h-3 w-3 mr-1" />
                          {building.missingCount}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(building.nextInspectionDue)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onViewBuilding(building.id, building.name)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {buildings.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No buildings found</h3>
            <p className="text-gray-500">Add buildings to start tracking compliance.</p>
          </div>
        )}
      </div>
    </div>
  )
} 