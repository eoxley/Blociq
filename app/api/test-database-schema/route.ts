import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(cookies())

  try {
    console.log('🔍 Testing database schema...')

    // Test 1: Check if buildings table exists and has expected columns
    const { data: buildingsColumns, error: buildingsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'buildings')
      .order('ordinal_position')

    console.log('✅ Buildings table columns:', buildingsColumns)

    // Test 2: Check if building_setup table exists and has expected columns
    const { data: buildingSetupColumns, error: buildingSetupError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'building_setup')
      .order('ordinal_position')

    console.log('✅ Building setup table columns:', buildingSetupColumns)

    // Test 3: Check if units table exists
    const { data: unitsColumns, error: unitsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'units')
      .order('ordinal_position')

    console.log('✅ Units table columns:', unitsColumns)

    // Test 4: Check if leaseholders table exists
    const { data: leaseholdersColumns, error: leaseholdersError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'leaseholders')
      .order('ordinal_position')

    console.log('✅ Leaseholders table columns:', leaseholdersColumns)

    // Test 5: Check if building_compliance_assets table exists
    const { data: complianceAssetsColumns, error: complianceAssetsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'building_compliance_assets')
      .order('ordinal_position')

    console.log('✅ Building compliance assets table columns:', complianceAssetsColumns)

    // Test 6: Check if compliance_documents table exists
    const { data: complianceDocsColumns, error: complianceDocsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'compliance_documents')
      .order('ordinal_position')

    console.log('✅ Compliance documents table columns:', complianceDocsColumns)

    // Test 7: Check if incoming_emails table exists
    const { data: emailsColumns, error: emailsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'incoming_emails')
      .order('ordinal_position')

    console.log('✅ Incoming emails table columns:', emailsColumns)

    // Test 8: Check if communications table exists
    const { data: communicationsColumns, error: communicationsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'communications')
      .order('ordinal_position')

    console.log('✅ Communications table columns:', communicationsColumns)

    return NextResponse.json({
      success: true,
      schema: {
        buildings: { columns: buildingsColumns, error: buildingsError },
        building_setup: { columns: buildingSetupColumns, error: buildingSetupError },
        units: { columns: unitsColumns, error: unitsError },
        leaseholders: { columns: leaseholdersColumns, error: leaseholdersError },
        building_compliance_assets: { columns: complianceAssetsColumns, error: complianceAssetsError },
        compliance_documents: { columns: complianceDocsColumns, error: complianceDocsError },
        incoming_emails: { columns: emailsColumns, error: emailsError },
        communications: { columns: communicationsColumns, error: communicationsError }
      }
    })

  } catch (error) {
    console.error('❌ Database schema test error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 