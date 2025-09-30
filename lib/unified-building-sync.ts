/**
 * Unified Building Data Synchronization System
 * Automatically updates building information from lease analysis, compliance documents, and major works
 * Ensures all sections (compliance, action tracker, financial info) stay synchronized
 */

import { createClient } from '@supabase/supabase-js'
import {
  extractBuildingDataFromLease,
  aggregateBuildingDataFromLeases,
  prepareBuildingUpdate,
  shouldUpdateBuildingField
} from './lease-to-building-mapper'
import {
  createComplianceActionsFromLeases
} from './lease-compliance-generator'

export interface SyncResult {
  buildingUpdated: boolean
  updatedFields: string[]
  skippedFields: string[]
  complianceActionsCreated: number
  majorWorksActionsCreated: number
  leaseDataSynced: boolean
  errors: string[]
  summary: string
}

export interface DocumentAnalysis {
  id: string
  document_type: 'lease' | 'compliance' | 'major_works' | 'certificate' | 'report'
  analysis_json: any
  created_at: string
  building_id: string
  filename?: string
}

/**
 * Main synchronization function - updates all building data from all sources
 */
export async function syncBuildingFromAllSources(
  supabase: any,
  buildingId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    buildingUpdated: false,
    updatedFields: [],
    skippedFields: [],
    complianceActionsCreated: 0,
    majorWorksActionsCreated: 0,
    leaseDataSynced: false,
    errors: [],
    summary: ''
  }

  try {
    // Get current building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      result.errors.push('Failed to fetch building data')
      return result
    }

    // 1. Sync from Lease Analysis
    const leaseSync = await syncFromLeaseAnalysis(supabase, buildingId, building)
    result.buildingUpdated = leaseSync.updated
    result.updatedFields.push(...leaseSync.updatedFields)
    result.skippedFields.push(...leaseSync.skippedFields)
    result.complianceActionsCreated += leaseSync.actionsCreated
    result.leaseDataSynced = leaseSync.updated

    // 2. Sync from Compliance Documents
    const complianceSync = await syncFromComplianceDocuments(supabase, buildingId, building)
    result.complianceActionsCreated += complianceSync.actionsCreated
    result.errors.push(...complianceSync.errors)

    // 3. Sync from Major Works Documents
    const majorWorksSync = await syncFromMajorWorks(supabase, buildingId, building)
    result.majorWorksActionsCreated += majorWorksSync.actionsCreated
    result.errors.push(...majorWorksSync.errors)

    // 4. Update compliance asset status based on documents
    await updateComplianceStatus(supabase, buildingId)

    // Generate summary
    result.summary = generateSyncSummary(result)

    return result

  } catch (error) {
    result.errors.push(`Sync failed: ${error}`)
    return result
  }
}

/**
 * Sync building data from lease analysis
 */
async function syncFromLeaseAnalysis(supabase: any, buildingId: string, currentBuilding: any) {
  const result = {
    updated: false,
    updatedFields: [] as string[],
    skippedFields: [] as string[],
    actionsCreated: 0
  }

  try {
    // Fetch all leases with analysis data
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, analysis_json, created_at')
      .eq('building_id', buildingId)
      .not('analysis_json', 'is', null)

    if (leasesError || !leases || leases.length === 0) {
      return result
    }

    // Aggregate building data from all leases
    const aggregatedData = aggregateBuildingDataFromLeases(leases)
    if (Object.keys(aggregatedData).length === 0) {
      return result
    }

    // Prepare update data
    const updateData = prepareBuildingUpdate(aggregatedData)

    // Filter fields that should be updated
    const fieldsToUpdate: any = {}
    Object.entries(updateData).forEach(([field, value]) => {
      if (field === 'updated_at' || field === 'lease_data_source') {
        fieldsToUpdate[field] = value
      } else if (shouldUpdateBuildingField(field, currentBuilding[field], value)) {
        fieldsToUpdate[field] = value
        result.updatedFields.push(field)
      } else {
        result.skippedFields.push(field)
      }
    })

    // Update building if needed
    if (Object.keys(fieldsToUpdate).length > 2) {
      const { error: updateError } = await supabase
        .from('buildings')
        .update(fieldsToUpdate)
        .eq('id', buildingId)

      if (!updateError) {
        result.updated = true
      }
    }

    // Generate compliance actions
    const actionsResult = await createComplianceActionsFromLeases(
      supabase,
      buildingId,
      currentBuilding.name || 'Building',
      leases
    )
    result.actionsCreated = actionsResult.created

    return result

  } catch (error) {
    console.error('Error syncing from lease analysis:', error)
    return result
  }
}

/**
 * Sync from compliance documents and create relevant actions
 */
async function syncFromComplianceDocuments(supabase: any, buildingId: string, building: any) {
  const result = {
    actionsCreated: 0,
    errors: [] as string[]
  }

  try {
    // Fetch compliance documents with analysis
    const { data: documents, error } = await supabase
      .from('building_documents')
      .select('*')
      .eq('building_id', buildingId)
      .in('category', ['compliance', 'certificates', 'safety'])
      .not('analysis_json', 'is', null)

    if (error || !documents) {
      return result
    }

    // Process each compliance document
    for (const doc of documents) {
      const actions = extractComplianceActionsFromDocument(doc, building.name)

      // Insert actions
      for (const action of actions) {
        try {
          const { error: insertError } = await supabase
            .from('building_action_tracker')
            .insert({
              building_id: buildingId,
              item_text: action.title,
              notes: action.description,
              priority: action.priority,
              due_date: action.due_date,
              completed: false,
              source: 'Manual'
            })

          if (!insertError) {
            result.actionsCreated++
          } else if (!insertError.message.includes('duplicate')) {
            result.errors.push(`Failed to create compliance action: ${insertError.message}`)
          }
        } catch (e) {
          result.errors.push(`Error creating compliance action: ${e}`)
        }
      }
    }

    return result

  } catch (error) {
    result.errors.push(`Error syncing compliance documents: ${error}`)
    return result
  }
}

/**
 * Sync from major works documents and create relevant actions
 */
async function syncFromMajorWorks(supabase: any, buildingId: string, building: any) {
  const result = {
    actionsCreated: 0,
    errors: [] as string[]
  }

  try {
    // Fetch major works documents
    const { data: documents, error } = await supabase
      .from('building_documents')
      .select('*')
      .eq('building_id', buildingId)
      .eq('category', 'major-works')
      .not('analysis_json', 'is', null)

    if (error || !documents) {
      return result
    }

    // Process each major works document
    for (const doc of documents) {
      const actions = extractMajorWorksActionsFromDocument(doc, building.name)

      // Insert actions
      for (const action of actions) {
        try {
          const { error: insertError } = await supabase
            .from('building_action_tracker')
            .insert({
              building_id: buildingId,
              item_text: action.title,
              notes: action.description,
              priority: action.priority,
              due_date: action.due_date,
              completed: false,
              source: 'Manual'
            })

          if (!insertError) {
            result.actionsCreated++
          } else if (!insertError.message.includes('duplicate')) {
            result.errors.push(`Failed to create major works action: ${insertError.message}`)
          }
        } catch (e) {
          result.errors.push(`Error creating major works action: ${e}`)
        }
      }
    }

    return result

  } catch (error) {
    result.errors.push(`Error syncing major works: ${error}`)
    return result
  }
}

/**
 * Update compliance asset status based on available documents
 */
async function updateComplianceStatus(supabase: any, buildingId: string) {
  try {
    // Get compliance assets for this building
    const { data: assets, error } = await supabase
      .from('building_compliance_assets')
      .select('*, compliance_assets(*)')
      .eq('building_id', buildingId)

    if (error || !assets) return

    // Check which documents we have for each asset
    const { data: documents } = await supabase
      .from('building_documents')
      .select('filename, category, created_at')
      .eq('building_id', buildingId)
      .in('category', ['compliance', 'certificates', 'safety'])

    if (!documents) return

    // Update asset status based on available documents
    for (const asset of assets) {
      const assetName = asset.compliance_assets?.name?.toLowerCase() || ''
      const hasRelevantDoc = documents.some(doc =>
        doc.filename.toLowerCase().includes(assetName) ||
        doc.filename.toLowerCase().includes(asset.compliance_assets?.asset_type?.toLowerCase() || '')
      )

      if (hasRelevantDoc && asset.status !== 'compliant') {
        await supabase
          .from('building_compliance_assets')
          .update({
            status: 'compliant',
            last_checked: new Date().toISOString(),
            notes: 'Updated from document analysis'
          })
          .eq('id', asset.id)
      }
    }

  } catch (error) {
    console.error('Error updating compliance status:', error)
  }
}

/**
 * Extract compliance actions from document analysis
 */
function extractComplianceActionsFromDocument(doc: any, buildingName: string) {
  const actions: any[] = []

  if (!doc.analysis_json) return actions

  const analysis = doc.analysis_json

  // Certificate expiry actions
  if (analysis.expiry_date || analysis.valid_until) {
    const expiryDate = analysis.expiry_date || analysis.valid_until
    actions.push({
      title: `${doc.filename} - Certificate Renewal`,
      description: `Renew ${doc.filename} for ${buildingName} - expires ${expiryDate}`,
      category: 'compliance',
      priority: isExpiryUrgent(expiryDate) ? 'urgent' : 'high',
      due_date: expiryDate,
      metadata: {
        type: 'certificate_renewal',
        document_type: doc.category,
        expiry_date: expiryDate
      }
    })
  }

  // Compliance requirements
  if (analysis.requirements) {
    const requirements = Array.isArray(analysis.requirements) ? analysis.requirements : [analysis.requirements]
    requirements.forEach((req: string, index: number) => {
      actions.push({
        title: `Compliance Requirement - ${doc.filename}`,
        description: `${req} for ${buildingName}`,
        category: 'compliance',
        priority: 'medium',
        metadata: {
          type: 'compliance_requirement',
          requirement: req,
          document_source: doc.filename
        }
      })
    })
  }

  return actions
}

/**
 * Extract major works actions from document analysis
 */
function extractMajorWorksActionsFromDocument(doc: any, buildingName: string) {
  const actions: any[] = []

  if (!doc.analysis_json) return actions

  const analysis = doc.analysis_json

  // Recommended works
  if (analysis.recommendations) {
    const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [analysis.recommendations]
    recommendations.forEach((rec: any) => {
      actions.push({
        title: `Major Works - ${rec.title || 'Recommendation'}`,
        description: `${rec.description || rec} for ${buildingName}`,
        category: 'maintenance',
        priority: rec.priority || 'medium',
        due_date: rec.target_date,
        metadata: {
          type: 'major_works_recommendation',
          cost_estimate: rec.cost_estimate,
          urgency: rec.urgency,
          document_source: doc.filename
        }
      })
    })
  }

  return actions
}

/**
 * Check if expiry date is urgent (within 30 days)
 */
function isExpiryUrgent(expiryDate: string): boolean {
  try {
    const expiry = new Date(expiryDate)
    const now = new Date()
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry <= 30
  } catch {
    return false
  }
}

/**
 * Generate human-readable sync summary
 */
function generateSyncSummary(result: SyncResult): string {
  const parts: string[] = []

  if (result.buildingUpdated) {
    parts.push(`Updated ${result.updatedFields.length} building fields`)
  }

  if (result.complianceActionsCreated > 0) {
    parts.push(`Created ${result.complianceActionsCreated} compliance actions`)
  }

  if (result.majorWorksActionsCreated > 0) {
    parts.push(`Created ${result.majorWorksActionsCreated} major works actions`)
  }

  if (result.leaseDataSynced) {
    parts.push('Synced lease information')
  }

  if (parts.length === 0) {
    return 'No updates needed - all data is current'
  }

  return parts.join(', ')
}