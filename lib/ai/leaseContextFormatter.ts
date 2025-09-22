import { createClient } from '@/lib/supabase/server'

export interface LeaseClause {
  id: string
  clause_type: string
  original_text: string
  ai_summary: string
  interpretation: string
  parties: any
  obligations: any
  permissions: any
  restrictions_data: any
  confidence_score: number
  lease_id: string
  unit_number?: string
  leaseholder_name?: string
}

export interface BuildingLeaseSummary {
  building_id: string
  insurance_summary: any
  pets_summary: any
  subletting_summary: any
  alterations_summary: any
  business_use_summary: any
  discrepancies: any
  total_leases: number
  analyzed_leases: number
  last_analysis_date: string
}

/**
 * Formats building-wide lease summary for AI context
 */
export function formatBuildingLeaseSummaryForAI(summary: BuildingLeaseSummary | null): string {
  if (!summary) {
    return 'No building-wide lease analysis available.'
  }

  let context = `BUILDING-WIDE LEASE SUMMARY (${summary.analyzed_leases}/${summary.total_leases} leases analyzed):\n\n`

  // Insurance
  if (summary.insurance_summary) {
    const insurance = summary.insurance_summary as any
    context += `INSURANCE OBLIGATIONS:\n`
    context += `- Status: ${insurance.status || 'Mixed/Unclear'}\n`
    context += `- Summary: ${insurance.summary || 'Varies by lease'}\n`
    if (insurance.details?.length) {
      context += `- Details: ${insurance.details.join('; ')}\n`
    }
    context += '\n'
  }

  // Pets
  if (summary.pets_summary) {
    const pets = summary.pets_summary as any
    context += `PET POLICY:\n`
    context += `- Status: ${pets.status || 'Mixed/Unclear'}\n`
    context += `- Summary: ${pets.summary || 'Varies by lease'}\n`
    if (pets.details?.length) {
      context += `- Details: ${pets.details.join('; ')}\n`
    }
    context += '\n'
  }

  // Subletting
  if (summary.subletting_summary) {
    const subletting = summary.subletting_summary as any
    context += `SUBLETTING RULES:\n`
    context += `- Status: ${subletting.status || 'Mixed/Unclear'}\n`
    context += `- Summary: ${subletting.summary || 'Varies by lease'}\n`
    if (subletting.details?.length) {
      context += `- Details: ${subletting.details.join('; ')}\n`
    }
    context += '\n'
  }

  // Alterations
  if (summary.alterations_summary) {
    const alterations = summary.alterations_summary as any
    context += `ALTERATION RULES:\n`
    context += `- Status: ${alterations.status || 'Mixed/Unclear'}\n`
    context += `- Summary: ${alterations.summary || 'Varies by lease'}\n`
    if (alterations.details?.length) {
      context += `- Details: ${alterations.details.join('; ')}\n`
    }
    context += '\n'
  }

  // Business Use
  if (summary.business_use_summary) {
    const businessUse = summary.business_use_summary as any
    context += `BUSINESS USE POLICY:\n`
    context += `- Status: ${businessUse.status || 'Mixed/Unclear'}\n`
    context += `- Summary: ${businessUse.summary || 'Varies by lease'}\n`
    if (businessUse.details?.length) {
      context += `- Details: ${businessUse.details.join('; ')}\n`
    }
    context += '\n'
  }

  // Discrepancies
  if (summary.discrepancies && Object.keys(summary.discrepancies).length > 0) {
    context += `LEASE DISCREPANCIES DETECTED:\n`
    for (const [type, details] of Object.entries(summary.discrepancies)) {
      context += `- ${type}: ${typeof details === 'string' ? details : JSON.stringify(details)}\n`
    }
    context += '\n'
  }

  return context
}

/**
 * Formats specific lease clauses for AI context
 */
export function formatLeaseClausesForAI(clauses: LeaseClause[]): string {
  if (!clauses || clauses.length === 0) {
    return 'No detailed lease clauses available for analysis.'
  }

  let context = `DETAILED LEASE CLAUSES (${clauses.length} clauses):\n\n`

  // Group clauses by type
  const clausesByType = clauses.reduce((acc, clause) => {
    if (!acc[clause.clause_type]) {
      acc[clause.clause_type] = []
    }
    acc[clause.clause_type].push(clause)
    return acc
  }, {} as Record<string, LeaseClause[]>)

  for (const [type, typeClause] of Object.entries(clausesByType)) {
    context += `${type.toUpperCase().replace('_', ' ')} CLAUSES:\n`

    typeClause.forEach((clause, index) => {
      context += `  ${index + 1}. Unit: ${clause.unit_number || 'Unknown'} | Leaseholder: ${clause.leaseholder_name || 'Unknown'}\n`

      if (clause.ai_summary) {
        context += `     Summary: ${clause.ai_summary}\n`
      }

      if (clause.interpretation) {
        context += `     Interpretation: ${clause.interpretation}\n`
      }

      if (clause.obligations) {
        const obligations = typeof clause.obligations === 'string'
          ? clause.obligations
          : JSON.stringify(clause.obligations)
        context += `     Obligations: ${obligations}\n`
      }

      if (clause.permissions) {
        const permissions = typeof clause.permissions === 'string'
          ? clause.permissions
          : JSON.stringify(clause.permissions)
        context += `     Permissions: ${permissions}\n`
      }

      if (clause.restrictions_data) {
        const restrictions = typeof clause.restrictions_data === 'string'
          ? clause.restrictions_data
          : JSON.stringify(clause.restrictions_data)
        context += `     Restrictions: ${restrictions}\n`
      }

      if (clause.confidence_score) {
        context += `     Confidence: ${Math.round(clause.confidence_score * 100)}%\n`
      }

      context += '\n'
    })
  }

  return context
}

/**
 * Fetches and formats lease context for a building
 */
export async function fetchBuildingLeaseContext(buildingId: string, specificLeaseholderId?: string): Promise<string> {
  const supabase = await createClient()

  try {
    // Get building lease summary
    const { data: buildingSummary } = await supabase
      .from('building_lease_summary')
      .select('*')
      .eq('building_id', buildingId)
      .single()

    // Get lease clauses
    let clauseQuery = supabase
      .from('lease_clauses')
      .select(`
        *,
        leases!inner(unit_number, leaseholder_name)
      `)
      .eq('building_id', buildingId)

    // Filter to specific leaseholder if provided
    if (specificLeaseholderId) {
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .eq('building_id', buildingId)
        .ilike('leaseholder_name', `%${specificLeaseholderId}%`)

      if (leases && leases.length > 0) {
        clauseQuery = clauseQuery.in('lease_id', leases.map(l => l.id))
      }
    }

    const { data: clauses } = await clauseQuery

    // Format clauses with lease information
    const formattedClauses: LeaseClause[] = (clauses || []).map(clause => ({
      ...clause,
      unit_number: clause.leases?.unit_number,
      leaseholder_name: clause.leases?.leaseholder_name
    }))

    // Combine contexts
    let context = ''

    if (buildingSummary) {
      context += formatBuildingLeaseSummaryForAI(buildingSummary)
      context += '\n---\n\n'
    }

    context += formatLeaseClausesForAI(formattedClauses)

    return context

  } catch (error) {
    console.error('Error fetching lease context:', error)
    return 'Error loading lease context for this building.'
  }
}

/**
 * Detects if a query is lease-related
 */
export function isLeaseRelatedQuery(query: string): boolean {
  const leaseKeywords = [
    'lease', 'pet', 'pets', 'sublet', 'subletting', 'alter', 'alteration', 'renovation',
    'business', 'insurance', 'ground rent', 'service charge', 'consent', 'permission',
    'allowed', 'forbidden', 'restrict', 'obligation', 'responsibility', 'clause',
    'terms', 'condition', 'landlord', 'leaseholder', 'tenant', 'assignment',
    'forfeiture', 'notice', 'repair', 'maintenance'
  ]

  return leaseKeywords.some(keyword =>
    query.toLowerCase().includes(keyword.toLowerCase())
  )
}