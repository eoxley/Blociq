'use client'

import React, { useState } from 'react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceClient from './ComplianceClient'
import UKComplianceSetup from './UKComplianceSetup'
import ComplianceBuildingsView from './ComplianceBuildingsView'
import BuildingComplianceDetail from './BuildingComplianceDetail'
import { UK_COMPLIANCE_ITEMS } from '../../lib/complianceUtils'

type ComplianceView = 'setup' | 'buildings' | 'building-detail'

interface BuildingDetailState {
  buildingId: number
  buildingName: string
}

export default function CompliancePage() {
  const [currentView, setCurrentView] = useState<ComplianceView>('buildings')
  const [buildingDetail, setBuildingDetail] = useState<BuildingDetailState | null>(null)

  const handleViewBuilding = (buildingId: number, buildingName: string) => {
    setBuildingDetail({ buildingId, buildingName })
    setCurrentView('building-detail')
  }

  const handleBackToBuildings = () => {
    setBuildingDetail(null)
    setCurrentView('buildings')
  }

  const renderView = () => {
    switch (currentView) {
      case 'setup':
        return <UKComplianceSetup onSaveSuccess={() => {
          // Optionally refresh the buildings view if needed
          console.log('Compliance setup saved successfully')
        }} />
      case 'buildings':
        return <ComplianceBuildingsView onViewBuilding={handleViewBuilding} />
      case 'building-detail':
        if (!buildingDetail) return null
        return (
          <BuildingComplianceDetail
            buildingId={buildingDetail.buildingId}
            buildingName={buildingDetail.buildingName}
            onBack={handleBackToBuildings}
          />
        )
      default:
        return <ComplianceBuildingsView onViewBuilding={handleViewBuilding} />
    }
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">UK Compliance Management</h1>
          <p className="mt-2 text-gray-600">
            Track and manage building compliance requirements using UK leasehold standards
          </p>
        </div>

        {/* Navigation Tabs */}
        {currentView !== 'building-detail' && (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('buildings')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'buildings' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Buildings Overview
              </button>
              <button
                onClick={() => setCurrentView('setup')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'setup' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Setup Configuration
              </button>
            </div>
          </div>
        )}
        
        {renderView()}
      </div>
    </LayoutWithSidebar>
  )
}
