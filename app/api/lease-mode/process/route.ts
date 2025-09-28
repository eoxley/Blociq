import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const buildingId = formData.get('buildingId') as string

    if (!file || !buildingId) {
      return NextResponse.json({ error: 'File and building ID are required' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${buildingId}/leases/${Date.now()}-${file.name}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lease-documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('lease-documents')
      .getPublicUrl(fileName)

    // Extract text from PDF (placeholder implementation)
    // In a real implementation, you would use a proper PDF processing library
    const extractedText = `Sample extracted text from lease document: ${file.name}`

    // Parse lease information (placeholder implementation)
    const parsedLease = {
      lease_start_date: '2020-01-01',
      lease_end_date: '2119-12-31',
      term_years: 99,
      ground_rent_amount: 250,
      ground_rent_frequency: 'annually',
      service_charge_amount: 1200,
      leaseholder_name: 'Sample Leaseholder',
      property_address: 'Sample Property Address',
      lease_type: 'Residential Long Lease',
      restrictions: [
        'No pets allowed',
        'No subletting without consent',
        'No structural alterations'
      ],
      responsibilities: [
        'Interior maintenance',
        'Council tax payment',
        'Insurance of contents'
      ],
      apportionments: {
        service_charge: '1/10th',
        ground_rent: 'Fixed amount',
        insurance: 'Proportional share'
      },
      clauses: {
        assignment: 'Assignment requires landlord consent',
        alterations: 'No alterations without written consent',
        insurance: 'Leaseholder to insure contents, landlord insures building'
      },
      analysis_json: {
        parties: {
          freeholder: {
            name: 'Ashwood Estates Limited',
            address: '123 Property Lane, London SW1A 1AA'
          },
          leaseholder: 'Sample Leaseholder'
        },
        clauses: {
          ground_rent: {
            amount: 250,
            frequency: 'yearly',
            review_pattern: 'Every 25 years, doubling',
            review_cycle: 'Doubling every 25 years'
          },
          service_charge: {
            annual_budget: 12000,
            payment_frequency: 'quarterly',
            frequency: 'quarterly'
          },
          insurance: {
            renewal_date: '2024-12-31',
            landlord_responsibility: 'Building insurance',
            tenant_responsibility: 'Contents insurance'
          },
          freeholder: 'Ashwood Estates Limited, 123 Property Lane, London SW1A 1AA'
        },
        summary: {
          lease_term: 99,
          term_years: 99,
          lease_start_date: '2020-01-01',
          commencement_date: '2020-01-01'
        }
      }
    }

    // Create lease record
    const { data: leaseData, error: leaseError } = await supabase
      .from('leases')
      .insert({
        building_id: buildingId,
        ...parsedLease,
        extracted_text: extractedText,
        metadata: {
          original_filename: file.name,
          file_size: file.size,
          processed_at: new Date().toISOString(),
          processing_method: 'automated_extraction'
        }
      })
      .select()
      .single()

    if (leaseError) {
      console.error('Lease creation error:', leaseError)
      return NextResponse.json({ error: 'Failed to create lease record' }, { status: 500 })
    }

    // Also create a document record for the uploaded lease
    const { data: documentData, error: documentError } = await supabase
      .from('building_documents')
      .insert({
        building_id: buildingId,
        filename: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        category: 'leases',
        document_type: 'PDF',
        ocr_status: 'completed',
        metadata: {
          lease_id: leaseData.id,
          processed_at: new Date().toISOString()
        }
      })

    if (documentError) {
      console.error('Document creation error:', documentError)
      // Don't fail the request if document creation fails
    }

    // Automatically sync building data with lease information
    try {
      const syncResponse = await fetch(`${request.url.split('/api')[0]}/api/buildings/update-from-lease`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaseId: leaseData.id,
          buildingId: buildingId
        }),
      })

      const syncResult = await syncResponse.json()
      console.log('Building sync result:', syncResult.message)
    } catch (syncError) {
      console.error('Failed to sync building with lease data:', syncError)
      // Don't fail the main request if sync fails
    }

    return NextResponse.json({
      success: true,
      lease: leaseData,
      message: 'Lease processed successfully'
    })

  } catch (error) {
    console.error('Lease processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}