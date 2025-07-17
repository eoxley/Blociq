import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { buildingId, assetName, apply } = await request.json()

    if (!buildingId || !assetName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert building ID to numeric for database
    const numericBuildingId = parseInt(buildingId, 10)
    if (isNaN(numericBuildingId)) {
      return NextResponse.json({ error: 'Invalid building ID' }, { status: 400 })
    }

    if (apply) {
      // Add compliance asset to building
      // First, get the compliance asset ID
      const { data: complianceAsset, error: assetError } = await supabase
        .from('compliance_assets')
        .select('id')
        .eq('name', assetName)
        .maybeSingle()

      if (assetError || !complianceAsset) {
        return NextResponse.json({ error: 'Compliance asset not found' }, { status: 404 })
      }

      // Check if already exists
      const { data: existingAsset } = await supabase
        .from('building_compliance_assets')
        .select('id')
        .eq('building_id', numericBuildingId)
        .eq('asset_id', complianceAsset.id)
        .maybeSingle()

      if (existingAsset) {
        return NextResponse.json({ message: 'Asset already applied' })
      }

      // Insert new building compliance asset
      const { error: insertError } = await supabase
        .from('building_compliance_assets')
        .insert({
          building_id: numericBuildingId,
          asset_id: complianceAsset.id,
          status: 'Not Started',
          notes: null,
          last_updated: new Date().toISOString()
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to apply asset' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Asset applied successfully' })
    } else {
      // Remove compliance asset from building
      // First, get the compliance asset ID
      const { data: complianceAsset, error: assetError } = await supabase
        .from('compliance_assets')
        .select('id')
        .eq('name', assetName)
        .maybeSingle()

      if (assetError || !complianceAsset) {
        return NextResponse.json({ error: 'Compliance asset not found' }, { status: 404 })
      }

      // Delete the building compliance asset
      const { error: deleteError } = await supabase
        .from('building_compliance_assets')
        .delete()
        .eq('building_id', numericBuildingId)
        .eq('asset_id', complianceAsset.id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return NextResponse.json({ error: 'Failed to remove asset' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Asset removed successfully' })
    }
  } catch (error) {
    console.error('Compliance assets API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 