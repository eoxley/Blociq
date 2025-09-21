import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const buildingId = formData.get('building_id') as string

    if (!file || !buildingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `buildings/${buildingId}/leases/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Process lease document (simplified - in production, use proper lease parsing)
    const leaseData = await processLeaseDocument(file, filePath)

    // Save lease to database
    const { data: lease, error: dbError } = await supabase
      .from('leases')
      .insert({
        building_id: buildingId,
        unit_number: leaseData.unit_number,
        leaseholder_name: leaseData.leaseholder_name,
        start_date: leaseData.start_date,
        end_date: leaseData.end_date,
        status: leaseData.status,
        ground_rent: leaseData.ground_rent,
        service_charge_percentage: leaseData.service_charge_percentage,
        responsibilities: leaseData.responsibilities,
        restrictions: leaseData.restrictions,
        rights: leaseData.rights,
        file_path: filePath,
        ocr_text: leaseData.ocr_text,
        metadata: leaseData.metadata
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save lease data' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      lease: {
        id: lease.id,
        unit_number: lease.unit_number,
        leaseholder_name: lease.leaseholder_name,
        start_date: lease.start_date,
        end_date: lease.end_date,
        status: lease.status,
        ground_rent: lease.ground_rent,
        service_charge_percentage: lease.service_charge_percentage,
        responsibilities: lease.responsibilities,
        restrictions: lease.restrictions,
        rights: lease.rights,
        file_path: lease.file_path,
        ocr_text: lease.ocr_text,
        metadata: lease.metadata
      }
    })

  } catch (error) {
    console.error('Lease upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processLeaseDocument(file: File, filePath: string) {
  // This is a simplified lease processing function
  // In production, you would integrate with a proper lease parsing service
  
  // Simulate lease data extraction
  const mockLeaseData = {
    unit_number: '3B',
    leaseholder_name: 'Valeria Lopez',
    start_date: '2020-01-01',
    end_date: '2145-12-31',
    status: 'active',
    ground_rent: 'peppercorn',
    service_charge_percentage: 1.23,
    responsibilities: [
      'Internal repairs and maintenance',
      'Keep property in good condition',
      'Comply with building regulations'
    ],
    restrictions: [
      'No subletting without consent',
      'No alterations without permission',
      'No commercial use'
    ],
    rights: [
      'Access to communal areas',
      'Right to quiet enjoyment',
      'Access to utilities'
    ],
    ocr_text: `Lease document for Unit 3B, Ashwood House. Leaseholder: Valeria Lopez. Term: 125 years from 1st January 2020. Ground rent: Peppercorn. Service charge: 1.23% of total service costs.`,
    metadata: {
      document_type: 'lease',
      page_count: 1,
      language: 'en',
      confidence: 0.95,
      extracted_at: new Date().toISOString()
    }
  }

  return mockLeaseData
}
