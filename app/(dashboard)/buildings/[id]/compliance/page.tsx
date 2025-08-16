import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Shield, AlertTriangle, CheckCircle, Clock, Calendar, FileText, Upload, Settings } from 'lucide-react'
import BuildingComplianceClient from './components/BuildingComplianceClient'
import NotFound from '../../../../../components/NotFound'

interface BuildingCompliancePageProps {
  params: {
    buildingId: string
  }
}

// Type definitions for compliance data
interface Building {
  id: string
  name: string
  address: string | null
}

interface ComplianceAsset {
  id: string
  category: string
  title: string
  description: string | null
  frequency_months: number | null
  created_at: string
}

interface BuildingComplianceAsset {
  id: string
  building_id: string
  compliance_asset_id: string
  due_date: string | null
  status: 'pending' | 'compliant' | 'overdue' | 'due_soon'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  compliance_asset: ComplianceAsset
}

interface ComplianceSummary {
  total: number
  compliant: number
  pending: number
  overdue: number
  due_soon: number
}

export default async function BuildingCompliancePage({ params }: BuildingCompliancePageProps) {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    // Validate building ID format
    if (!params.id || typeof params.id !== 'string') {
      console.error('Invalid building ID:', params.id)
      notFound()
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.error('Invalid UUID format for building ID:', params.id)
      notFound()
    }

    // Fetch building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, address')
      .eq('id', params.id)
      .single()

    if (buildingError || !building) {
      console.error('Error fetching building:', buildingError)
      return <NotFound title="Building Not Found" message="We couldn't find the building you're looking for." />
    }

    // Fetch master compliance assets (agency-wide list)
    const { data: masterAssets, error: masterAssetsError } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true })

    if (masterAssetsError) {
      console.error('Error fetching master compliance assets:', masterAssetsError)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Database Error
            </h1>
            <p className="text-gray-600 text-center">
              Failed to load compliance assets. Please try again later.
            </p>
          </div>
        </div>
      )
    }

    // Fetch building-specific compliance assets
    const { data: buildingAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_asset:compliance_assets(*)
      `)
      .eq('building_id', params.id)
      .order('created_at', { ascending: true })

    if (buildingAssetsError) {
      console.error('Error fetching building compliance assets:', buildingAssetsError)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Database Error
            </h1>
            <p className="text-gray-600 text-center">
              Failed to load building compliance data. Please try again later.
            </p>
          </div>
        </div>
      )
    }

    // Calculate compliance summary
    const summary: ComplianceSummary = {
      total: buildingAssets?.length || 0,
      compliant: buildingAssets?.filter(asset => asset.status === 'compliant').length || 0,
      pending: buildingAssets?.filter(asset => asset.status === 'pending').length || 0,
      overdue: buildingAssets?.filter(asset => asset.status === 'overdue').length || 0,
      due_soon: buildingAssets?.filter(asset => asset.status === 'due_soon').length || 0
    }

    // Check if building has any compliance assets set up
    const hasComplianceSetup = buildingAssets && buildingAssets.length > 0

    return (
      <BuildingComplianceClient
        building={building}
        masterAssets={masterAssets || []}
        buildingAssets={buildingAssets || []}
        summary={summary}
        hasComplianceSetup={hasComplianceSetup}
      />
    )

  } catch (error) {
    console.error('Error in BuildingCompliancePage:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Unexpected Error
          </h1>
          <p className="text-gray-600 text-center">
            An unexpected error occurred. Please try again later.
          </p>
        </div>
      </div>
    )
  }
}