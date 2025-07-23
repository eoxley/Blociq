import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Test authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔧 Applying building column fixes...')

    // Add missing building columns
    const columnsToAdd = [
      'access_notes TEXT',
      'sites_staff TEXT', 
      'parking_info TEXT',
      'council_borough VARCHAR(255)',
      'building_manager_name VARCHAR(255)',
      'building_manager_email VARCHAR(255)',
      'building_manager_phone VARCHAR(50)',
      'emergency_contact_name VARCHAR(255)',
      'emergency_contact_phone VARCHAR(50)',
      'building_age VARCHAR(100)',
      'construction_type VARCHAR(100)',
      'total_floors VARCHAR(10)',
      'lift_available VARCHAR(10)',
      'heating_type VARCHAR(100)',
      'hot_water_type VARCHAR(100)',
      'waste_collection_day VARCHAR(20)',
      'recycling_info TEXT',
      'building_insurance_provider VARCHAR(255)',
      'building_insurance_expiry DATE',
      'fire_safety_status VARCHAR(100)',
      'asbestos_status VARCHAR(100)',
      'energy_rating VARCHAR(10)',
      'service_charge_frequency VARCHAR(50)',
      'ground_rent_amount DECIMAL(10,2)',
      'ground_rent_frequency VARCHAR(50)',
      'is_hrb BOOLEAN DEFAULT false'
    ]

    const results = []
    
    for (const columnDef of columnsToAdd) {
      try {
        const columnName = columnDef.split(' ')[0]
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE buildings ADD COLUMN IF NOT EXISTS ${columnDef}`
        })
        
        if (error) {
          console.warn(`⚠️ Could not add column ${columnName}:`, error)
          results.push({ column: columnName, status: 'failed', error: error.message })
        } else {
          console.log(`✅ Added column ${columnName}`)
          results.push({ column: columnName, status: 'success' })
        }
      } catch (error) {
        console.warn(`⚠️ Error adding column:`, error)
        results.push({ column: columnDef.split(' ')[0], status: 'failed', error: 'Unknown error' })
      }
    }

    // Test if total_floors column now exists
    const { data: testData, error: testError } = await supabase
      .from('buildings')
      .select('id, name, total_floors')
      .limit(1)

    const totalFloorsExists = !testError && testData

    return NextResponse.json({
      success: true,
      message: 'Building column fixes applied',
      results,
      totalFloorsExists,
      testError: testError?.message
    })

  } catch (error) {
    console.error('❌ Error applying building column fixes:', error)
    return NextResponse.json({ 
      error: 'Failed to apply fixes', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 