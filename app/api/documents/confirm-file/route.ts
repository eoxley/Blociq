import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const supabase = createClient()

    // Get current user for RLS
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract form data
    const file_url = form.get('file_url') as string
    const document_type = form.get('document_type') as string
    const classification = form.get('classification') as string
    const summary = form.get('summary') as string
    const inspection_date = form.get('inspection_date') as string
    const next_due_date = form.get('next_due_date') as string
    const responsible_party = form.get('responsible_party') as string
    const action_required = form.get('action_required') as string
    const contractor_name = form.get('contractor_name') as string
    const building_id = form.get('building_id') as string
    const unit_id = form.get('unit_id') as string
    const leaseholder_id = form.get('leaseholder_id') as string
    const confidence = form.get('confidence') as string
    const suggested_compliance_asset = form.get('suggested_compliance_asset') as string
    
    // New lease-specific fields
    const leaseholder_name = form.get('leaseholder_name') as string
    const lease_start_date = form.get('lease_start_date') as string
    const lease_end_date = form.get('lease_end_date') as string
    const apportionment = form.get('apportionment') as string

    if (!file_url || !document_type) {
      return NextResponse.json({ error: 'File URL and document type are required' }, { status: 400 })
    }

    // Validate building access permissions (RLS-safe)
    let buildingId: number | null = null
    if (building_id) {
      buildingId = parseInt(building_id, 10)
      
      // Check if user has access to this building
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('building_id, agency_id')
        .eq('id', user.id)
        .single()

      // If user is assigned to a specific building, verify access
      if (userProfile?.building_id && userProfile.building_id !== buildingId) {
        return NextResponse.json({ error: 'Access denied to this building' }, { status: 403 })
      }
    }

    // Extract filename from URL
    const file_name = file_url.split('/').pop() || 'document.pdf'

    // 1. Save document to building_documents table
    const { data: savedDocument, error: docError } = await supabase
      .from('building_documents')
      .insert({
        file_url,
        file_name,
        type: document_type,
        building_id: buildingId,
        unit_id: unit_id ? parseInt(unit_id, 10) : null,
        leaseholder_id: leaseholder_id || null,
      })
      .select()
      .single()

    if (docError) {
      console.error('❌ Error saving document:', docError)
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    console.log("✅ Document saved:", savedDocument.id)

    // 2. Link the document analysis to the saved document
    try {
      const { error: analysisError } = await supabase
        .from('document_analysis')
        .update({ document_id: savedDocument.id })
        .is('document_id', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (analysisError) {
        console.error('⚠️ Error linking document analysis:', analysisError);
      } else {
        console.log("✅ Document analysis linked");
      }
    } catch (error) {
      console.error('⚠️ Error in document analysis linking:', error);
      // Don't fail the whole operation if analysis linking fails
    }

    // 3. Handle compliance documents - link to compliance_assets
    if (isComplianceDocument(classification) && buildingId && suggested_compliance_asset) {
      try {
        // Lookup compliance asset
        const { data: complianceAsset } = await supabase
          .from('compliance_assets')
          .select('*')
          .ilike('name', `%${suggested_compliance_asset}%`)
          .maybeSingle()

        if (complianceAsset) {
          // Update building compliance asset
          const { error: complianceError } = await supabase
            .from('building_compliance_assets')
            .upsert({
              building_id: buildingId,
              asset_id: complianceAsset.id,
              status: 'Compliant',
              notes: `Document: ${document_type} - ${summary}`,
              next_due_date: next_due_date || null,
              last_updated: new Date().toISOString(),
            })

          if (complianceError) {
            console.error('⚠️ Error linking to compliance asset:', complianceError)
          } else {
            console.log("✅ Linked to compliance asset:", complianceAsset.id)
          }
        } else {
          // Show fallback option for creating new compliance asset
          console.log("⚠️ No matching compliance asset found for:", suggested_compliance_asset)
          // In a full implementation, you might want to return this info to the UI
        }
      } catch (error) {
        console.error('⚠️ Error in compliance linking:', error)
        // Don't fail the whole operation if compliance linking fails
      }
    }

    // 4. Handle contractor creation/update
    if (contractor_name && buildingId) {
      try {
        const { data: existingContractor } = await supabase
          .from('contractors')
          .select('id')
          .ilike('name', `%${contractor_name}%`)
          .maybeSingle()

        if (!existingContractor) {
          // Create new contractor
          const { error: contractorError } = await supabase
            .from('contractors')
            .insert({
              name: contractor_name,
              notes: `Added via document upload: ${document_type}`,
            })

          if (contractorError) {
            console.error('⚠️ Error creating contractor:', contractorError)
          } else {
            console.log("✅ Created new contractor:", contractor_name)
          }
        }
      } catch (error) {
        console.error('⚠️ Error in contractor handling:', error)
        // Don't fail the whole operation if contractor handling fails
      }
    }

    // 5. Handle lease documents - link to units/leaseholders
    if (classification === 'Lease' && buildingId) {
      try {
        // If leaseholder name was extracted, create/update leaseholder record
        if (leaseholder_name) {
          const { data: existingLeaseholder } = await supabase
            .from('leaseholders')
            .select('id')
            .ilike('name', `%${leaseholder_name}%`)
            .maybeSingle()

          if (!existingLeaseholder) {
            // Create new leaseholder
            const { data: newLeaseholder, error: leaseholderError } = await supabase
              .from('leaseholders')
              .insert({
                name: leaseholder_name,
                unit_id: unit_id ? parseInt(unit_id, 10) : null,
              })
              .select()
              .single()

            if (leaseholderError) {
              console.error('⚠️ Error creating leaseholder:', leaseholderError)
            } else {
              console.log("✅ Created new leaseholder:", leaseholder_name)
              
              // Update document with leaseholder ID
              await supabase
                .from('building_documents')
                .update({ leaseholder_id: newLeaseholder.id })
                .eq('id', savedDocument.id)
            }
          }
        }

        // Create lease record if dates are available
        if (lease_start_date || lease_end_date) {
          const { error: leaseError } = await supabase
            .from('leases')
            .insert({
              building_id: buildingId,
              unit_id: unit_id ? parseInt(unit_id, 10) : null,
              start_date: lease_start_date || null,
              expiry_date: lease_end_date || null,
              doc_url: file_url,
              doc_type: document_type,
              user_id: user.id,
            })

          if (leaseError) {
            console.error('⚠️ Error creating lease record:', leaseError)
          } else {
            console.log("✅ Created lease record")
          }
        }
      } catch (error) {
        console.error('⚠️ Error in lease document handling:', error)
        // Don't fail the whole operation if lease handling fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      document_id: savedDocument.id,
      building_id: buildingId,
      message: 'Document saved and linked successfully'
    })

  } catch (error) {
    console.error('❌ Confirm file error:', error)
    return NextResponse.json({ 
      error: 'Failed to save document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to determine if a document is compliance-related
function isComplianceDocument(classification: string): boolean {
  const complianceTypes = [
    'Fire Risk Assessment',
    'EICR',
    'Insurance Certificate',
    'Lift Maintenance'
  ]
  return complianceTypes.includes(classification)
} 