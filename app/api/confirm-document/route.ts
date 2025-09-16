import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      buildingId,
      fileName,
      fileUrl,
      classification,
      documentType,
      summary,
      inspectionDate,
      nextDueDate,
      responsibleParty,
      actionRequired,
      suggestedComplianceAsset
    } = body

    if (!buildingId || !fileName || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert document into building_documents table
    const { data: documentData, error: documentError } = await supabase
      .from('building_documents')
      .insert({
        building_id: buildingId,
        file_name: fileName,
        file_url: fileUrl,
        classification: classification || 'Other',
        document_type: documentType || 'Unknown',
        summary: summary || '',
        inspection_date: inspectionDate || null,
        next_due_date: nextDueDate || null,
        responsible_party: responsibleParty || 'Management Company',
        action_required: actionRequired || 'Review document',
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (documentError) {
      console.error('Error saving document:', documentError)
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      )
    }

    // If this is a compliance document, link it to compliance assets
    if (classification === 'Compliance' && suggestedComplianceAsset) {
      await linkToComplianceAsset(buildingId, documentData.id, suggestedComplianceAsset, nextDueDate)
    }

    return NextResponse.json({
      success: true,
      document: documentData
    })

  } catch (error) {
    console.error('Error confirming document:', error)
    return NextResponse.json(
      { error: 'Failed to confirm document' },
      { status: 500 }
    )
  }
}

async function linkToComplianceAsset(
  buildingId: string,
  documentId: string,
  complianceAssetType: string,
  nextDueDate: string | null
) {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  try {
    // Find the relevant compliance asset
    const { data: complianceAsset, error } = await supabase
      .from('compliance_assets')
      .select('id')
      .eq('building_id', buildingId)
      .eq('asset_type', complianceAssetType)
      .single()

    if (error || !complianceAsset) {
      console.log(`No compliance asset found for type: ${complianceAssetType}`)
      return
    }

    // Update the compliance asset with the new document and due date
    const updateData: any = {
      last_evidence_document_id: documentId,
      last_updated: new Date().toISOString()
    }

    if (nextDueDate) {
      updateData.next_due_date = nextDueDate
    }

    const { error: updateError } = await supabase
      .from('compliance_assets')
      .update(updateData)
      .eq('id', complianceAsset.id)

    if (updateError) {
      console.error('Error updating compliance asset:', updateError)
    }

  } catch (error) {
    console.error('Error linking to compliance asset:', error)
  }
} 