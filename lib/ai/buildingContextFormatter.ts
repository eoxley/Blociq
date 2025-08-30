import { displayUnit, fmtPct, safe } from "@/components/buildings/format";

export interface BuildingContextData {
  building: any;
  buildingSetup: any;
  unitsLeaseholders: any[];
  complianceSummary: any;
  complianceAssets: any[];
  callLogs: any[];
  correspondence: any[];
  financialData: any[];
  metadata: any;
}

export function formatBuildingContextForAI(data: BuildingContextData): string {
  const { building, buildingSetup, unitsLeaseholders, complianceSummary, complianceAssets, callLogs, correspondence, financialData, metadata } = data;

  let context = `BUILDING INFORMATION CONTEXT
=======================

BUILDING DETAILS:
- Name: ${building?.name || 'Not set'}
- Address: ${building?.address || 'Not set'}
- Status: ${building?.is_hrb ? 'HRB' : 'Standard'}
- Total Units: ${metadata.totalUnits}
- Units with Leaseholders: ${metadata.unitsWithLeaseholders}
- Directors: ${metadata.directors}

BUILDING SETUP:
- Structure Type: ${buildingSetup?.structure_type || 'Not set'}
- Freeholder/RMC: ${buildingSetup?.client_name || 'Not set'}
- Managing Agent: ${buildingSetup?.client_contact || 'Not set'}
- Managing Agent Email: ${buildingSetup?.client_email || 'Not set'}
- Operational Notes: ${buildingSetup?.operational_notes || 'Not set'}

COMPLIANCE STATUS:
- Total Assets: ${complianceSummary.total}
- Compliant: ${complianceSummary.compliant}
- Pending: ${complianceSummary.pending}
- Overdue: ${complianceSummary.overdue}

UNITS AND LEASEHOLDERS:
`;

  // Add each unit's information
  unitsLeaseholders.forEach((unit, index) => {
    context += `
Unit ${index + 1}: ${displayUnit(unit.unit_label, unit.unit_number)}
- Apportionment: ${fmtPct(unit.apportionment_percent)}
- Leaseholder: ${safe(unit.leaseholder_name)}
- Email: ${safe(unit.leaseholder_email)}
- Phone: ${safe(unit.leaseholder_phone)}
- Director Role: ${unit.is_director ? (unit.director_role || 'Director') : 'Not a director'}
${unit.is_director ? `- Director Since: ${unit.director_since ? new Date(unit.director_since).toLocaleDateString() : 'Not set'}` : ''}
${unit.is_director ? `- Director Notes: ${safe(unit.director_notes)}` : ''}
`;
  });

  // Add compliance assets
  if (complianceAssets.length > 0) {
    context += `
COMPLIANCE ASSETS:
`;
    complianceAssets.forEach(asset => {
      // Defensive handling for missing title/name columns
      const title = asset.compliance_assets?.title || 
                   asset.compliance_assets?.name || 
                   asset.compliance_assets?.category || 
                   'Unknown Asset';
      context += `- ${title}: ${asset.status} (Due: ${asset.due_date || 'Not set'})
`;
    });
  }

  // Add recent call logs
  if (callLogs.length > 0) {
    context += `
RECENT CALL LOGS:
`;
    callLogs.slice(0, 5).forEach(log => {
      context += `- ${new Date(log.logged_at).toLocaleDateString()}: ${log.call_type} call to ${log.leaseholder_name || 'Unknown'} (${log.duration} mins)
  Notes: ${log.notes || 'No notes'}
`;
    });
  }

  // Add recent correspondence
  if (correspondence.length > 0) {
    context += `
RECENT CORRESPONDENCE:
`;
    correspondence.slice(0, 5).forEach(corr => {
      context += `- ${new Date(corr.created_at).toLocaleDateString()}: ${corr.type || 'Communication'} with ${corr.leaseholder_name || 'Unknown'}
  Subject: ${corr.subject || 'No subject'}
  Status: ${corr.status || 'Unknown'}
`;
    });
  }

  // Add financial summary
  if (financialData.length > 0) {
    context += `
FINANCIAL SUMMARY:
`;
    const totalArrears = financialData.reduce((sum, item) => sum + (item.arrears_amount || 0), 0);
    const totalServiceCharges = financialData.reduce((sum, item) => sum + (item.service_charge_amount || 0), 0);
    
    context += `- Total Service Charges: £${totalServiceCharges.toFixed(2)}
- Total Arrears: £${totalArrears.toFixed(2)}
- Outstanding Payments: ${financialData.filter(item => item.status === 'outstanding').length}
`;
  }

  context += `
CONTEXT METADATA:
- Last Updated: ${metadata.lastUpdated}
- Data Source: BlocIQ Building Management System
`;

  return context;
}

export function formatUnitSpecificContext(unit: any, building: any): string {
  return `
UNIT SPECIFIC CONTEXT
====================

UNIT DETAILS:
- Unit: ${displayUnit(unit.unit_label, unit.unit_number)}
- Building: ${building?.name || 'Unknown'}
- Apportionment: ${fmtPct(unit.apportionment_percent)}

LEASEHOLDER INFORMATION:
- Name: ${safe(unit.leaseholder_name)}
- Email: ${safe(unit.leaseholder_email)}
- Phone: ${safe(unit.leaseholder_phone)}
- Director Status: ${unit.is_director ? 'Yes' : 'No'}
${unit.is_director ? `- Director Role: ${unit.director_role || 'Director'}` : ''}
${unit.is_director ? `- Director Since: ${unit.director_since ? new Date(unit.director_since).toLocaleDateString() : 'Not set'}` : ''}
${unit.is_director ? `- Director Notes: ${safe(unit.director_notes)}` : ''}

BUILDING CONTEXT:
- Building Type: ${building?.is_hrb ? 'HRB' : 'Standard'}
- Structure: ${building?.structure_type || 'Not specified'}
- Managing Agent: ${building?.client_contact || 'Not specified'}
`;
}
