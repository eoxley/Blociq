import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AnalysisAction {
  priority: 'High' | 'Medium' | 'Low'
  urgency: 'IMMEDIATE' | 'WITHIN 1 MONTH' | 'WITHIN 2 MONTHS' | 'WITHIN 3 MONTHS' | 'N/A'
  description: string
  location: string
  action: string
  reason?: string
  timeframe?: string
  reference?: string
}

interface AnalysisData {
  document_type: string
  compliance_status: string
  property_details: {
    address: string
    description: string
    client: string
  }
  inspection_details: {
    inspection_date: string
    next_inspection_due: string
    inspector: string
    company: string
    certificate_number: string
  }
  key_findings: AnalysisAction[]
  recommendations: {
    description: string
    reason: string
    timeframe: string
    reference: string
  }[]
  risk_assessment: {
    overall_risk: string
    immediate_hazards: string[]
  }
  regulatory_compliance: {
    meets_current_standards: boolean
    relevant_regulations: string
  }
  expiry_date: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { buildingId, analysisData, documentJobId } = body

    if (!buildingId || !analysisData) {
      return NextResponse.json({
        error: 'Missing required fields: buildingId and analysisData'
      }, { status: 400 })
    }

    const analysis = analysisData as AnalysisData

    console.log('🔍 Processing compliance analysis for building:', buildingId)
    console.log('📋 Document type:', analysis.document_type)
    console.log('📊 Compliance status:', analysis.compliance_status)

    // Create or update the compliance asset
    const assetName = analysis.document_type || 'Fire Risk Assessment'
    let category = 'Fire Safety'

    if (analysis.document_type?.toLowerCase().includes('electrical')) {
      category = 'Electrical Safety'
    } else if (analysis.document_type?.toLowerCase().includes('gas')) {
      category = 'Gas Safety'
    }

    // First check if a compliance asset of this type already exists for the building
    const { data: existingAssets, error: existingError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        compliance_assets (
          name,
          category
        )
      `)
      .eq('building_id', buildingId)
      .ilike('compliance_assets.name', `%${assetName}%`)

    let complianceAssetId: string

    if (existingAssets && existingAssets.length > 0) {
      // Use existing asset
      complianceAssetId = existingAssets[0].id
      console.log('✅ Using existing compliance asset:', complianceAssetId)
    } else {
      // First, we need to create or find a base compliance asset
      const { data: baseAsset, error: baseAssetError } = await supabase
        .from('compliance_assets')
        .select('id')
        .eq('name', assetName)
        .eq('category', category)
        .single()

      let baseAssetId: string

      if (baseAssetError && baseAssetError.code === 'PGRST116') {
        // Create new base compliance asset
        const { data: newBaseAsset, error: createBaseError } = await supabase
          .from('compliance_assets')
          .insert({
            name: assetName,
            category: category,
            description: `${analysis.document_type} for building compliance monitoring`,
            frequency_months: 12 // Default annual frequency
          })
          .select()
          .single()

        if (createBaseError) {
          console.error('❌ Failed to create base compliance asset:', createBaseError)
          return NextResponse.json({
            error: 'Failed to create base compliance asset',
            details: createBaseError.message
          }, { status: 500 })
        }

        baseAssetId = newBaseAsset.id
        console.log('✅ Created new base compliance asset:', baseAssetId)
      } else if (baseAssetError) {
        console.error('❌ Error finding base compliance asset:', baseAssetError)
        return NextResponse.json({
          error: 'Error finding base compliance asset',
          details: baseAssetError.message
        }, { status: 500 })
      } else {
        baseAssetId = baseAsset.id
        console.log('✅ Using existing base compliance asset:', baseAssetId)
      }

      // Create new building compliance asset entry
      const { data: newAsset, error: createError } = await supabase
        .from('building_compliance_assets')
        .insert({
          building_id: buildingId,
          compliance_asset_id: baseAssetId,
          status: analysis.compliance_status === 'Requires-Action' ? 'remedial_action_pending' : 'compliant',
          next_due_date: analysis.inspection_details?.next_inspection_due || analysis.expiry_date,
          last_renewed_date: analysis.inspection_details?.inspection_date,
          notes: `Created from ${analysis.document_type} analysis`,
          contractor: analysis.inspection_details?.company
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Failed to create compliance asset:', createError)
        return NextResponse.json({
          error: 'Failed to create compliance asset',
          details: createError.message
        }, { status: 500 })
      }

      complianceAssetId = newAsset.id
      console.log('✅ Created new compliance asset:', complianceAssetId)
    }

    // Create action items from key findings
    const actionItems = []

    if (analysis.key_findings && Array.isArray(analysis.key_findings)) {
      for (const finding of analysis.key_findings) {
        if (finding.urgency !== 'N/A' && finding.action && finding.action !== 'No action required') {
          const priority = finding.priority === 'High' ? 'high' :
                          finding.priority === 'Medium' ? 'medium' : 'low'

          const dueDate = calculateDueDate(finding.urgency, analysis.inspection_details?.inspection_date)

          actionItems.push({
            building_id: buildingId,
            item_text: `${finding.description} - ${finding.action}`,
            priority: priority,
            notes: `Location: ${finding.location || 'Not specified'}. Urgency: ${finding.urgency}. Source: Compliance Analysis`,
            due_date: dueDate,
            completed: false,
            source: 'Manual',
            created_by: user.id
          })
        }
      }
    }

    // Create action items from recommendations
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      for (const recommendation of analysis.recommendations) {
        const dueDate = parseTimeframe(recommendation.timeframe, analysis.inspection_details?.inspection_date)

        actionItems.push({
          building_id: buildingId,
          item_text: recommendation.description,
          priority: 'medium',
          notes: `Reason: ${recommendation.reason}. Reference: ${recommendation.reference || 'N/A'}. Source: Compliance Recommendation`,
          due_date: dueDate,
          completed: false,
          source: 'Manual',
          created_by: user.id
        })
      }
    }

    // Insert all action items
    if (actionItems.length > 0) {
      const { data: insertedActions, error: actionError } = await supabase
        .from('building_action_tracker')
        .insert(actionItems)
        .select()

      if (actionError) {
        console.error('❌ Failed to create action items:', actionError)
        return NextResponse.json({
          error: 'Failed to create action items',
          details: actionError.message
        }, { status: 500 })
      }

      console.log(`✅ Created ${insertedActions.length} action items`)
    }

    // Update the compliance asset status based on findings
    const hasHighPriorityFindings = analysis.key_findings?.some(f => f.priority === 'High')
    const hasMediumPriorityFindings = analysis.key_findings?.some(f => f.priority === 'Medium')

    let finalStatus = 'compliant'
    if (hasHighPriorityFindings) {
      finalStatus = 'remedial_action_pending'
    } else if (hasMediumPriorityFindings) {
      finalStatus = 'upcoming'
    }

    const { error: updateError } = await supabase
      .from('building_compliance_assets')
      .update({
        status: finalStatus,
        notes: `Analysis complete. ${actionItems.length} action items created.`,
        updated_at: new Date().toISOString()
      })
      .eq('id', complianceAssetId)

    if (updateError) {
      console.warn('⚠️ Failed to update compliance asset status:', updateError)
    }

    return NextResponse.json({
      success: true,
      compliance_asset_id: complianceAssetId,
      actions_created: actionItems.length,
      status: finalStatus,
      message: `Successfully processed ${analysis.document_type} and created ${actionItems.length} action items`
    })

  } catch (error) {
    console.error('❌ Error processing compliance analysis:', error)
    return NextResponse.json({
      error: 'Failed to process compliance analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateDueDate(urgency: string, inspectionDate?: string): string | null {
  const baseDate = inspectionDate ? new Date(inspectionDate) : new Date()

  switch (urgency) {
    case 'IMMEDIATE':
      return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case 'WITHIN 1 MONTH':
      return new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'WITHIN 2 MONTHS':
      return new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
    case 'WITHIN 3 MONTHS':
      return new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return null
  }
}

function parseTimeframe(timeframe: string, inspectionDate?: string): string | null {
  if (!timeframe) return null

  const baseDate = inspectionDate ? new Date(inspectionDate) : new Date()

  const timeframeLower = timeframe.toLowerCase()

  if (timeframeLower.includes('24 hours') || timeframeLower.includes('immediate')) {
    return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframeLower.includes('1 month') || timeframeLower.includes('month')) {
    return new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if (timeframeLower.includes('3 months')) {
    return new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  return null
}