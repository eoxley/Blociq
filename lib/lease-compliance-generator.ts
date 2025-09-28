/**
 * Generate compliance actions from lease analysis data
 * Creates actionable items for the action tracker based on lease requirements
 */

export interface ComplianceAction {
  title: string;
  description: string;
  category: 'financial' | 'legal' | 'maintenance' | 'insurance' | 'review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  source: 'lease_analysis';
  metadata?: any;
}

/**
 * Extract compliance actions from lease analysis
 */
export function generateComplianceActionsFromLease(leaseAnalysis: any, buildingName: string): ComplianceAction[] {
  const actions: ComplianceAction[] = [];

  if (!leaseAnalysis) return actions;

  const clauses = leaseAnalysis.clauses || leaseAnalysis.extracted_clauses || {};
  const summary = leaseAnalysis.summary || {};
  const parties = leaseAnalysis.parties || {};

  // Ground rent review actions
  if (clauses.ground_rent) {
    const groundRent = clauses.ground_rent;

    if (groundRent.review_pattern || groundRent.review_cycle) {
      actions.push({
        title: 'Ground Rent Review Due',
        description: `Review ground rent for ${buildingName}. ${groundRent.review_pattern || groundRent.review_cycle}`,
        category: 'financial',
        priority: 'medium',
        source: 'lease_analysis',
        metadata: {
          type: 'ground_rent_review',
          current_amount: groundRent.amount,
          review_pattern: groundRent.review_pattern
        }
      });
    }

    // Create action for ground rent collection if amount specified
    if (groundRent.amount && groundRent.frequency) {
      actions.push({
        title: 'Ground Rent Collection',
        description: `Collect ground rent of £${groundRent.amount} ${groundRent.frequency} for ${buildingName}`,
        category: 'financial',
        priority: 'high',
        source: 'lease_analysis',
        metadata: {
          type: 'ground_rent_collection',
          amount: groundRent.amount,
          frequency: groundRent.frequency
        }
      });
    }
  }

  // Service charge actions
  if (clauses.service_charge || clauses.service_charges) {
    const serviceCharge = clauses.service_charge || clauses.service_charges;

    if (serviceCharge.annual_budget || serviceCharge.yearly_amount) {
      const frequency = serviceCharge.payment_frequency || serviceCharge.frequency || 'quarterly';
      actions.push({
        title: 'Service Charge Demands',
        description: `Issue ${frequency} service charge demands for ${buildingName}`,
        category: 'financial',
        priority: 'high',
        source: 'lease_analysis',
        metadata: {
          type: 'service_charge_demand',
          annual_budget: serviceCharge.annual_budget || serviceCharge.yearly_amount,
          frequency: frequency
        }
      });
    }

    // Service charge year-end actions
    actions.push({
      title: 'Service Charge Year-End Accounts',
      description: `Prepare year-end service charge accounts and certificates for ${buildingName}`,
      category: 'financial',
      priority: 'medium',
      source: 'lease_analysis',
      metadata: {
        type: 'service_charge_accounts',
        building: buildingName
      }
    });
  }

  // Insurance actions
  if (clauses.insurance) {
    const insurance = clauses.insurance;

    actions.push({
      title: 'Building Insurance Review',
      description: `Review and renew building insurance for ${buildingName}`,
      category: 'insurance',
      priority: 'high',
      due_date: insurance.renewal_date,
      source: 'lease_analysis',
      metadata: {
        type: 'insurance_renewal',
        renewal_date: insurance.renewal_date,
        responsibility: insurance.landlord_responsibility
      }
    });

    // Insurance apportionment action
    if (insurance.tenant_responsibility) {
      actions.push({
        title: 'Insurance Apportionment',
        description: `Calculate and recover insurance costs from leaseholders for ${buildingName}`,
        category: 'financial',
        priority: 'medium',
        source: 'lease_analysis',
        metadata: {
          type: 'insurance_apportionment',
          tenant_responsibility: insurance.tenant_responsibility
        }
      });
    }
  }

  // Lease expiry tracking
  if (summary.lease_end_date || summary.expiry_date) {
    const expiryDate = summary.lease_end_date || summary.expiry_date;
    const yearsRemaining = calculateYearsRemaining(expiryDate);

    if (yearsRemaining < 80) {
      actions.push({
        title: 'Lease Extension Review',
        description: `Review lease extension options for ${buildingName} - ${yearsRemaining} years remaining`,
        category: 'legal',
        priority: yearsRemaining < 70 ? 'urgent' : 'high',
        source: 'lease_analysis',
        metadata: {
          type: 'lease_extension',
          expiry_date: expiryDate,
          years_remaining: yearsRemaining
        }
      });
    }
  }

  // Maintenance and repair obligations
  if (clauses.repairs || clauses.maintenance) {
    const maintenance = clauses.repairs || clauses.maintenance;

    actions.push({
      title: 'Property Maintenance Review',
      description: `Review maintenance obligations and schedule for ${buildingName}`,
      category: 'maintenance',
      priority: 'medium',
      source: 'lease_analysis',
      metadata: {
        type: 'maintenance_review',
        obligations: typeof maintenance === 'string' ? maintenance : JSON.stringify(maintenance)
      }
    });
  }

  // Covenant compliance
  if (clauses.covenants || clauses.tenant_covenants || clauses.landlord_covenants) {
    actions.push({
      title: 'Covenant Compliance Check',
      description: `Review and ensure compliance with lease covenants for ${buildingName}`,
      category: 'legal',
      priority: 'medium',
      source: 'lease_analysis',
      metadata: {
        type: 'covenant_compliance',
        building: buildingName
      }
    });
  }

  // Assignment and subletting monitoring
  if (clauses.assignment || clauses.subletting) {
    actions.push({
      title: 'Assignment & Subletting Review',
      description: `Monitor assignment and subletting compliance for ${buildingName}`,
      category: 'legal',
      priority: 'low',
      source: 'lease_analysis',
      metadata: {
        type: 'assignment_monitoring',
        assignment_rules: clauses.assignment,
        subletting_rules: clauses.subletting
      }
    });
  }

  return actions;
}

/**
 * Calculate years remaining on a lease
 */
function calculateYearsRemaining(expiryDate: string): number {
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const yearsRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(yearsRemaining);
  } catch (e) {
    return 0;
  }
}

/**
 * Create actions in the database
 */
export async function createComplianceActionsFromLeases(
  supabase: any,
  buildingId: string,
  buildingName: string,
  leaseAnalyses: any[]
): Promise<{ created: number; errors: string[] }> {
  const allActions: ComplianceAction[] = [];
  const errors: string[] = [];

  // Generate actions from all leases
  leaseAnalyses.forEach((lease, index) => {
    try {
      const actions = generateComplianceActionsFromLease(lease.analysis_json, buildingName);
      allActions.push(...actions);
    } catch (error) {
      errors.push(`Failed to generate actions from lease ${index + 1}: ${error}`);
    }
  });

  if (allActions.length === 0) {
    return { created: 0, errors };
  }

  // Deduplicate actions by title and type
  const uniqueActions = allActions.filter((action, index, arr) => {
    return arr.findIndex(a =>
      a.title === action.title &&
      a.metadata?.type === action.metadata?.type
    ) === index;
  });

  // Insert actions into action tracker
  let created = 0;
  for (const action of uniqueActions) {
    try {
      const { error } = await supabase
        .from('building_todos')
        .insert({
          building_id: buildingId,
          title: action.title,
          description: action.description,
          category: action.category,
          priority: action.priority,
          due_date: action.due_date,
          status: 'pending',
          source: action.source,
          metadata: action.metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        // Skip if duplicate (likely already exists)
        if (!error.message.includes('duplicate')) {
          errors.push(`Failed to create action "${action.title}": ${error.message}`);
        }
      } else {
        created++;
      }
    } catch (error) {
      errors.push(`Failed to create action "${action.title}": ${error}`);
    }
  }

  return { created, errors };
}