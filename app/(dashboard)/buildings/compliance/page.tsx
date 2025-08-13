import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ComplianceClient from './ComplianceClient'
import { redirect } from 'next/navigation'

export default async function CompliancePage() {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      redirect('/login')
    }

    // Fetch compliance assets
    const { data: complianceAssets, error } = await supabase
      .from('compliance_assets')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      console.error('Error fetching compliance assets:', error)
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <div>
                <p className="text-red-600 font-semibold">Error loading compliance data</p>
                <p className="text-red-500 text-sm">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Transform the data to match the expected ComplianceAsset interface
    const transformedAssets = (complianceAssets || []).map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description || '',
      category: asset.category,
      required_if: asset.required_if || 'if present',
      default_frequency: asset.recommended_frequency || '1 year',
      applies: false, // Default to false, will be set based on building-specific data
      last_checked: '', // Use empty string instead of null
      next_due: '', // Use empty string instead of null
      status: 'pending'
    }))

    return <ComplianceClient complianceAssets={transformedAssets} />
    
  } catch (error) {
    console.error('Unexpected error in compliance page:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-red-600 font-semibold">Unexpected error</p>
              <p className="text-red-500 text-sm">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 