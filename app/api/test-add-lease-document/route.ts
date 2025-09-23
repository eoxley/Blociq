import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = '2beeec1d-a94e-4058-b881-213d74cc6830' // 5 Ashwood House

    console.log(`🏠 Adding test lease document for building: ${buildingId}`)

    // First check if building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      console.log('Building not found, creating it...')

      // Create the building if it doesn't exist
      const { data: newBuilding, error: createError } = await supabase
        .from('buildings')
        .insert({
          id: buildingId,
          name: '5 Ashwood House',
          address: '5 Ashwood Road, London',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create building:', createError)
        return NextResponse.json({ error: 'Failed to create building' }, { status: 500 })
      }

      console.log('✅ Building created:', newBuilding)
    } else {
      console.log('✅ Building found:', building)
    }

    // Create a test building document (lease)
    const leaseDocData = {
      building_id: buildingId,
      name: '5 Ashwood House Lease Agreement.pdf',
      type: 'application/pdf',
      category: 'Leases - Unit Specific',
      file_path: '/test-documents/5-ashwood-lease.pdf',
      file_size: 245760, // ~240KB
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
      ocr_status: 'completed',
      metadata: {
        source: 'test_data',
        unit: '5 Ashwood House',
        leaseholder: 'Test Leaseholder',
        lease_type: 'residential'
      }
    }

    const { data: doc, error: docError } = await supabase
      .from('building_documents')
      .insert(leaseDocData)
      .select()
      .single()

    if (docError) {
      console.error('Failed to create document:', docError)
      return NextResponse.json({ error: 'Failed to create document', details: docError }, { status: 500 })
    }

    console.log('✅ Test document created:', doc)

    return NextResponse.json({
      success: true,
      building: building || { id: buildingId, name: '5 Ashwood House' },
      document: doc
    })

  } catch (error) {
    console.error('❌ Error in test add lease document:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}