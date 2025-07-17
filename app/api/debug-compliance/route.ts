import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createClient(cookies())
    
    // Check all compliance-related tables
    const [
      { data: assets, error: assetsError },
      { data: items, error: itemsError },
      { data: buildingAssets, error: buildingAssetsError },
      { data: docs, error: docsError }
    ] = await Promise.all([
      supabase.from('compliance_assets').select('*'),
      supabase.from('compliance_items').select('*'),
      supabase.from('building_assets').select('*'),
      supabase.from('compliance_docs').select('*')
    ])

    return NextResponse.json({
      success: true,
      data: {
        compliance_assets: {
          count: assets?.length || 0,
          data: assets,
          error: assetsError?.message
        },
        compliance_items: {
          count: items?.length || 0,
          data: items,
          error: itemsError?.message
        },
        building_assets: {
          count: buildingAssets?.length || 0,
          data: buildingAssets,
          error: buildingAssetsError?.message
        },
        compliance_docs: {
          count: docs?.length || 0,
          data: docs,
          error: docsError?.message
        }
      }
    })
  } catch (error) {
    console.error('Debug compliance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 