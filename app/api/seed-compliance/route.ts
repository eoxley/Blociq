import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const basicComplianceAssets = [
  {
    id: 'fire-risk-assessment',
    name: 'Fire Risk Assessment',
    description: 'Legally required assessment of fire risks in communal areas',
    category: 'Safety'
  },
  {
    id: 'emergency-lighting',
    name: 'Emergency Lighting',
    description: 'Emergency lighting systems in communal areas and escape routes',
    category: 'Safety'
  },
  {
    id: 'fire-extinguishers',
    name: 'Fire Extinguishers',
    description: 'Portable fire extinguishers in communal areas',
    category: 'Safety'
  },
  {
    id: 'lift-inspections',
    name: 'Lift Inspections',
    description: 'Lift maintenance and safety inspections',
    category: 'Equipment'
  },
  {
    id: 'electrical-eicr',
    name: 'Electrical Installation Condition Report (EICR)',
    description: 'Periodic inspection of electrical installations',
    category: 'Electrical'
  },
  {
    id: 'gas-safety',
    name: 'Gas Safety Certificate',
    description: 'Gas safety inspection for communal gas systems',
    category: 'Gas'
  },
  {
    id: 'water-risk-assessment',
    name: 'Water Risk Assessment',
    description: 'Legionella risk assessment for water systems',
    category: 'Health'
  },
  {
    id: 'asbestos-survey',
    name: 'Asbestos Management Survey',
    description: 'Asbestos-containing material survey and management plan',
    category: 'Health'
  },
  {
    id: 'building-insurance',
    name: 'Building Insurance',
    description: 'Comprehensive building insurance policy',
    category: 'Insurance'
  }
]

export async function POST() {
  try {
    const supabase = createClient(cookies())
    
    // Check if compliance_assets table is empty
    const { data: existingAssets, error: checkError } = await supabase
      .from('compliance_assets')
      .select('id')
      .limit(1)

    if (checkError) {
      return NextResponse.json({ error: 'Failed to check existing assets' }, { status: 500 })
    }

    if (existingAssets && existingAssets.length > 0) {
      return NextResponse.json({ 
        message: 'Compliance assets already exist',
        count: existingAssets.length
      })
    }

    // Insert basic compliance assets
    const { data: insertedAssets, error: insertError } = await supabase
      .from('compliance_assets')
      .insert(basicComplianceAssets)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to insert compliance assets' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance assets seeded successfully',
      count: insertedAssets?.length || 0,
      assets: insertedAssets
    })

  } catch (error) {
    console.error('Seed compliance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 