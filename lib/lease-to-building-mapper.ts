/**
 * Utility for mapping extracted lease information to building fields
 * Automatically populates building-wide information from lease analysis
 */

export interface LeaseExtractedData {
  freeholder_name?: string;
  freeholder_address?: string;
  ground_rent_amount?: number;
  ground_rent_frequency?: string;
  service_charge_budget?: number;
  service_charge_frequency?: string;
  management_start_date?: string;
  lease_term_years?: number;
  ground_rent_review_pattern?: string;
  insurance_renewal_date?: string;
  reserve_fund_balance?: number;
}

export interface BuildingUpdateData {
  freeholder_name?: string;
  freeholder_address?: string;
  ground_rent_amount?: number;
  ground_rent_frequency?: string;
  service_charge_budget?: number;
  service_charge_frequency?: string;
  management_start_date?: string;
  lease_term_years?: number;
  ground_rent_review_pattern?: string;
  insurance_renewal_date?: string;
  reserve_fund_balance?: number;
  updated_at?: string;
  lease_data_source?: string; // Track that this came from lease analysis
}

/**
 * Extract building-wide information from lease analysis JSON
 */
export function extractBuildingDataFromLease(leaseAnalysis: any): LeaseExtractedData {
  const extracted: LeaseExtractedData = {};

  if (!leaseAnalysis) return extracted;

  // Extract from different possible structures in lease analysis
  const clauses = leaseAnalysis.clauses || leaseAnalysis.extracted_clauses || {};
  const parties = leaseAnalysis.parties || {};
  const financials = leaseAnalysis.financials || {};
  const summary = leaseAnalysis.summary || {};

  // Freeholder information
  if (parties.freeholder || parties.landlord) {
    const freeholder = parties.freeholder || parties.landlord;
    if (typeof freeholder === 'string') {
      extracted.freeholder_name = freeholder;
    } else if (typeof freeholder === 'object') {
      extracted.freeholder_name = freeholder.name || freeholder.company;
      extracted.freeholder_address = freeholder.address;
    }
  }

  // Extract from clauses if not in parties
  if (!extracted.freeholder_name && clauses.freeholder) {
    const freeholderText = typeof clauses.freeholder === 'string' ? clauses.freeholder : JSON.stringify(clauses.freeholder);
    // Try to extract name from clause text
    const nameMatch = freeholderText.match(/(?:freeholder|landlord):\s*([^,\n]+)/i);
    if (nameMatch) {
      extracted.freeholder_name = nameMatch[1].trim();
    }
  }

  // Ground rent information
  if (clauses.ground_rent || financials.ground_rent) {
    const groundRent = clauses.ground_rent || financials.ground_rent;
    if (typeof groundRent === 'object') {
      extracted.ground_rent_amount = groundRent.amount || groundRent.yearly_amount;
      extracted.ground_rent_frequency = groundRent.frequency || 'yearly';
      extracted.ground_rent_review_pattern = groundRent.review_pattern || groundRent.review_cycle;
    } else if (typeof groundRent === 'string') {
      // Try to extract amount from text
      const amountMatch = groundRent.match(/£(\d+(?:,\d+)*(?:\.\d{2})?)/);
      if (amountMatch) {
        extracted.ground_rent_amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      // Extract frequency
      if (groundRent.toLowerCase().includes('per annum') || groundRent.toLowerCase().includes('yearly')) {
        extracted.ground_rent_frequency = 'yearly';
      } else if (groundRent.toLowerCase().includes('quarterly')) {
        extracted.ground_rent_frequency = 'quarterly';
      }
    }
  }

  // Service charge information
  if (clauses.service_charge || clauses.service_charges || financials.service_charge) {
    const serviceCharge = clauses.service_charge || clauses.service_charges || financials.service_charge;
    if (typeof serviceCharge === 'object') {
      extracted.service_charge_budget = serviceCharge.annual_budget || serviceCharge.yearly_amount;
      extracted.service_charge_frequency = serviceCharge.frequency || serviceCharge.payment_frequency;
    } else if (typeof serviceCharge === 'string') {
      // Try to extract budget from text
      const budgetMatch = serviceCharge.match(/£(\d+(?:,\d+)*(?:\.\d{2})?)/);
      if (budgetMatch) {
        extracted.service_charge_budget = parseFloat(budgetMatch[1].replace(/,/g, ''));
      }

      // Extract frequency
      if (serviceCharge.toLowerCase().includes('quarterly')) {
        extracted.service_charge_frequency = 'quarterly';
      } else if (serviceCharge.toLowerCase().includes('half-yearly') || serviceCharge.toLowerCase().includes('6 month')) {
        extracted.service_charge_frequency = 'half-yearly';
      } else {
        extracted.service_charge_frequency = 'yearly';
      }
    }
  }

  // Lease term information
  if (summary.lease_term || summary.term_years) {
    extracted.lease_term_years = summary.lease_term || summary.term_years;
  }

  // Management start date (lease commencement)
  if (summary.lease_start_date || summary.commencement_date) {
    extracted.management_start_date = summary.lease_start_date || summary.commencement_date;
  }

  // Insurance renewal date
  if (clauses.insurance && typeof clauses.insurance === 'object') {
    extracted.insurance_renewal_date = clauses.insurance.renewal_date;
  }

  return extracted;
}

/**
 * Aggregate building data from multiple leases, prioritizing most recent/complete information
 */
export function aggregateBuildingDataFromLeases(leaseAnalyses: any[]): LeaseExtractedData {
  const aggregated: LeaseExtractedData = {};
  const sources: Record<string, string[]> = {};

  leaseAnalyses.forEach((lease, index) => {
    const extracted = extractBuildingDataFromLease(lease.analysis_json);

    Object.entries(extracted).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Track sources for transparency
        if (!sources[key]) sources[key] = [];
        sources[key].push(`Lease ${index + 1}`);

        // Use the first valid value found, or update if this one seems more complete
        if (!aggregated[key as keyof LeaseExtractedData]) {
          aggregated[key as keyof LeaseExtractedData] = value as any;
        } else if (typeof value === 'string' && value.length > (aggregated[key as keyof LeaseExtractedData] as string)?.length) {
          // Prefer longer, more detailed strings
          aggregated[key as keyof LeaseExtractedData] = value as any;
        }
      }
    });
  });

  return aggregated;
}

/**
 * Convert extracted lease data to building update format
 */
export function prepareBuildingUpdate(extractedData: LeaseExtractedData): BuildingUpdateData {
  const update: BuildingUpdateData = {
    ...extractedData,
    updated_at: new Date().toISOString(),
    lease_data_source: 'lease_analysis'
  };

  // Convert date strings to proper format if needed
  if (update.management_start_date) {
    try {
      const date = new Date(update.management_start_date);
      update.management_start_date = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      // If date parsing fails, remove it
      delete update.management_start_date;
    }
  }

  if (update.insurance_renewal_date) {
    try {
      const date = new Date(update.insurance_renewal_date);
      update.insurance_renewal_date = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      delete update.insurance_renewal_date;
    }
  }

  return update;
}

/**
 * Check if building should be updated based on existing data
 * Only update fields that are empty or have placeholder values
 */
export function shouldUpdateBuildingField(
  fieldName: string,
  currentValue: any,
  newValue: any
): boolean {
  // Don't update if new value is empty
  if (newValue === undefined || newValue === null || newValue === '') {
    return false;
  }

  // Update if current value is empty
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return true;
  }

  // Don't overwrite manually entered data with lease data if the current value looks substantial
  // This prevents overwriting good manual data with potentially extracted partial data
  if (typeof currentValue === 'string' && currentValue.length > 10 &&
      typeof newValue === 'string' && newValue.length < currentValue.length) {
    return false;
  }

  // For financial fields, prefer non-zero values
  if (fieldName.includes('amount') || fieldName.includes('budget')) {
    return currentValue === 0 || currentValue === null;
  }

  return true;
}