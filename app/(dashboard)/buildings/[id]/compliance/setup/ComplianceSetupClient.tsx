"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ComplianceSetupWizard from './ComplianceSetupWizard'

interface Building {
  id: string
  name: string
  address: string
  building_type: string
  is_hrb: boolean
  floors?: number
}

interface BuildingSetup {
  id: string
  building_id: string
  structure_type: string
  operational_notes?: string
  client_name?: string
  client_contact?: string
  assigned_manager?: string
  key_location?: string
  emergency_access?: string
  site_staff?: string
  insurance_provider?: string
  cleaning_contractor?: string
  other_contractors?: string
  created_at: string
  updated_at: string
}

interface ComplianceAsset {
  id: string
  name: string
  category: string
  description: string
  inspection_frequency: string
  is_required: boolean
  priority: string
  frequency_months: number
  created_at: string
  updated_at: string
}

interface BuildingComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  status: string
  compliance_assets: ComplianceAsset | null
}

interface ComplianceSetupClientProps {
  building: Building
  buildingSetup: BuildingSetup | null
  existingAssets: BuildingComplianceAsset[]
  allAssets: ComplianceAsset[]
  buildingId: string
}

export default function ComplianceSetupClient({
  building,
  buildingSetup,
  existingAssets,
  allAssets,
  buildingId
}: ComplianceSetupClientProps) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAssetsUpdated = () => {
    // Force a refresh of the page data
    setRefreshKey(prev => prev + 1)
    // Also refresh the router to get fresh data
    router.refresh()
  }

  return (
    <ComplianceSetupWizard
      key={refreshKey}
      building={building}
      buildingSetup={buildingSetup}
      existingAssets={existingAssets}
      allAssets={allAssets}
      buildingId={buildingId}
      onAssetsUpdated={handleAssetsUpdated}
    />
  )
}
