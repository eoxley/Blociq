import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createClient(cookies())

    // Test basic database connectivity
    const { data: testData, error: testError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(1)

    if (testError) {
      console.error('Database connection error:', testError)
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: testError.message || 'Unknown error',
        code: testError.code || null,
        details: testError.details || null,
        hint: testError.hint || null
      }, { status: 500 })
    }

    // Test compliance tables
    const { data: complianceAssets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select('id, name, category')
      .limit(1)

    const { data: buildingComplianceAssets, error: buildingAssetsError } = await supabase
      .from('building_compliance_assets')
      .select('id, building_id, asset_id')
      .limit(1)

    return NextResponse.json({
      status: 'healthy',
      message: 'Database connection successful',
      tables: {
        buildings: {
          accessible: !testError,
          recordCount: testData?.length || 0,
          error: null
        },
        compliance_assets: {
          accessible: !assetsError,
          recordCount: complianceAssets?.length || 0,
          error: assetsError?.message || null
        },
        building_compliance_assets: {
          accessible: !buildingAssetsError,
          recordCount: buildingComplianceAssets?.length || 0,
          error: buildingAssetsError?.message || null
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
