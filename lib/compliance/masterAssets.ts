export interface ComplianceAsset {
  id: string;
  title: string;
  category: string;
  description: string;
  frequency_months: number;
  is_required: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  legal_requirement: boolean;
  default_notes?: string;
}

export const MASTER_COMPLIANCE_ASSETS: ComplianceAsset[] = [
  // Fire Safety (8 items)
  {
    id: 'fire-risk-assessment',
    title: 'Fire Risk Assessment',
    category: 'Fire Safety',
    description: 'Annual fire safety assessment required by law',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Required by Regulatory Reform (Fire Safety) Order 2005'
  },
  {
    id: 'fire-alarm-system-test',
    title: 'Fire Alarm System Test',
    category: 'Fire Safety',
    description: 'Weekly fire alarm system test and monthly full system test',
    frequency_months: 1,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Weekly testing required by BS 5839-1'
  },
  {
    id: 'fire-extinguisher-inspection',
    title: 'Fire Extinguisher Inspection',
    category: 'Fire Safety',
    description: 'Monthly visual inspection and annual service',
    frequency_months: 1,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Annual service by qualified technician required'
  },
  {
    id: 'emergency-lighting-test',
    title: 'Emergency Lighting Test',
    category: 'Fire Safety',
    description: 'Monthly function test and annual full duration test',
    frequency_months: 1,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Annual test must last full duration (3 hours)'
  },
  {
    id: 'fire-door-inspection',
    title: 'Fire Door Inspection',
    category: 'Fire Safety',
    description: 'Quarterly inspection of fire doors and self-closing devices',
    frequency_months: 3,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Check door closers, seals, and signage'
  },
  {
    id: 'fire-safety-training',
    title: 'Fire Safety Training',
    category: 'Fire Safety',
    description: 'Annual fire safety training for staff and residents',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Document all training sessions and attendees'
  },
  {
    id: 'fire-escape-routes',
    title: 'Fire Escape Routes',
    category: 'Fire Safety',
    description: 'Monthly inspection of fire escape routes and signage',
    frequency_months: 1,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Ensure routes are clear and signage is visible'
  },
  {
    id: 'fire-safety-policy-review',
    title: 'Fire Safety Policy Review',
    category: 'Fire Safety',
    description: 'Annual review and update of fire safety policy',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Update policy based on building changes or incidents'
  },

  // Gas Safety (4 items)
  {
    id: 'gas-safety-certificate',
    title: 'Gas Safety Certificate',
    category: 'Gas Safety',
    description: 'Annual gas safety inspection certificate',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Required by Gas Safety (Installation and Use) Regulations 1998'
  },
  {
    id: 'gas-appliance-service',
    title: 'Gas Appliance Service',
    category: 'Gas Safety',
    description: 'Annual service of gas appliances and flues',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Service must be carried out by Gas Safe registered engineer'
  },
  {
    id: 'gas-emergency-procedures',
    title: 'Gas Emergency Procedures',
    category: 'Gas Safety',
    description: 'Annual review of gas emergency procedures',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Ensure all staff know emergency contact numbers'
  },
  {
    id: 'gas-safety-training',
    title: 'Gas Safety Training',
    category: 'Gas Safety',
    description: 'Annual gas safety awareness training',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Train staff on gas leak recognition and response'
  },

  // Electrical Safety (6 items)
  {
    id: 'electrical-installation-certificate',
    title: 'Electrical Installation Certificate (EICR)',
    category: 'Electrical Safety',
    description: 'EICR certificate every 5 years',
    frequency_months: 60,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Required by Electricity at Work Regulations 1989'
  },
  {
    id: 'pat-testing',
    title: 'PAT Testing',
    category: 'Electrical Safety',
    description: 'Portable appliance testing annually',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Test all portable electrical equipment'
  },
  {
    id: 'emergency-lighting-electrical',
    title: 'Emergency Lighting Electrical',
    category: 'Electrical Safety',
    description: 'Annual electrical inspection of emergency lighting',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Check battery condition and charging systems'
  },
  {
    id: 'electrical-safety-training',
    title: 'Electrical Safety Training',
    category: 'Electrical Safety',
    description: 'Annual electrical safety awareness training',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Train staff on electrical hazard recognition'
  },
  {
    id: 'electrical-maintenance',
    title: 'Electrical Maintenance',
    category: 'Electrical Safety',
    description: 'Quarterly electrical system maintenance',
    frequency_months: 3,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Inspect distribution boards and wiring'
  },
  {
    id: 'electrical-safety-policy',
    title: 'Electrical Safety Policy',
    category: 'Electrical Safety',
    description: 'Annual review of electrical safety policy',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Update policy based on building electrical systems'
  },

  // Structural & Condition (4 items)
  {
    id: 'building-survey',
    title: 'Building Survey',
    category: 'Structural & Condition',
    description: 'Comprehensive building survey every 5 years',
    frequency_months: 60,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Identify structural issues and maintenance needs'
  },
  {
    id: 'structural-inspection',
    title: 'Structural Inspection',
    category: 'Structural & Condition',
    description: 'Annual structural integrity inspection',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Check for cracks, movement, and deterioration'
  },
  {
    id: 'roof-inspection',
    title: 'Roof Inspection',
    category: 'Structural & Condition',
    description: 'Annual roof condition inspection',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Check for leaks, damage, and maintenance needs'
  },
  {
    id: 'drainage-inspection',
    title: 'Drainage Inspection',
    category: 'Structural & Condition',
    description: 'Annual drainage system inspection',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Check for blockages and structural integrity'
  },

  // Operational & Contracts (4 items)
  {
    id: 'lift-inspection',
    title: 'Lift Inspection',
    category: 'Operational & Contracts',
    description: 'Annual lift inspection and testing',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: true,
    default_notes: 'Required by Lifting Operations and Lifting Equipment Regulations 1998'
  },
  {
    id: 'heating-system-service',
    title: 'Heating System Service',
    category: 'Operational & Contracts',
    description: 'Annual heating system service and maintenance',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Service boilers, radiators, and controls'
  },
  {
    id: 'water-system-testing',
    title: 'Water System Testing',
    category: 'Operational & Contracts',
    description: 'Annual water system testing and treatment',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Legionella testing required by law'
  },
  {
    id: 'contractor-management',
    title: 'Contractor Management',
    category: 'Operational & Contracts',
    description: 'Annual review of contractor qualifications and insurance',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Ensure all contractors are properly qualified and insured'
  },

  // Insurance (3 items)
  {
    id: 'building-insurance',
    title: 'Building Insurance',
    category: 'Insurance',
    description: 'Annual building insurance renewal',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: false,
    default_notes: 'Ensure adequate coverage for building value and risks'
  },
  {
    id: 'liability-insurance',
    title: 'Liability Insurance',
    category: 'Insurance',
    description: 'Annual public liability insurance renewal',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: false,
    default_notes: 'Protect against claims from third parties'
  },
  {
    id: 'directors-officers-insurance',
    title: 'Directors & Officers Insurance',
    category: 'Insurance',
    description: 'Annual D&O insurance renewal',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Protect directors and officers from personal liability'
  },

  // Lease & Documentation (3 items)
  {
    id: 'lease-compliance-review',
    title: 'Lease Compliance Review',
    category: 'Lease & Documentation',
    description: 'Annual review of lease compliance requirements',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Ensure all lease obligations are being met'
  },
  {
    id: 'document-management',
    title: 'Document Management',
    category: 'Lease & Documentation',
    description: 'Annual review of document management systems',
    frequency_months: 12,
    is_required: true,
    priority: 'low',
    legal_requirement: false,
    default_notes: 'Ensure all compliance documents are properly stored'
  },
  {
    id: 'regulatory-updates',
    title: 'Regulatory Updates',
    category: 'Lease & Documentation',
    description: 'Quarterly review of regulatory changes',
    frequency_months: 3,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Stay updated on changes to building regulations'
  },

  // Admin & Reporting (3 items)
  {
    id: 'compliance-reporting',
    title: 'Compliance Reporting',
    category: 'Admin & Reporting',
    description: 'Monthly compliance status reporting',
    frequency_months: 1,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Report compliance status to stakeholders'
  },
  {
    id: 'audit-preparation',
    title: 'Audit Preparation',
    category: 'Admin & Reporting',
    description: 'Annual preparation for compliance audits',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Prepare all documentation for external audits'
  },
  {
    id: 'staff-training-records',
    title: 'Staff Training Records',
    category: 'Admin & Reporting',
    description: 'Annual review of staff training records',
    frequency_months: 12,
    is_required: true,
    priority: 'low',
    legal_requirement: false,
    default_notes: 'Ensure all staff training is properly documented'
  },

  // Smart Records (3 items)
  {
    id: 'digital-record-keeping',
    title: 'Digital Record Keeping',
    category: 'Smart Records',
    description: 'Annual review of digital compliance systems',
    frequency_months: 12,
    is_required: true,
    priority: 'low',
    legal_requirement: false,
    default_notes: 'Ensure digital systems are up to date and secure'
  },
  {
    id: 'smart-building-systems',
    title: 'Smart Building Systems',
    category: 'Smart Records',
    description: 'Annual review of smart building technology',
    frequency_months: 12,
    is_required: true,
    priority: 'low',
    legal_requirement: false,
    default_notes: 'Review and update smart building systems'
  },
  {
    id: 'data-protection-compliance',
    title: 'Data Protection Compliance',
    category: 'Smart Records',
    description: 'Annual GDPR and data protection review',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: true,
    default_notes: 'Ensure compliance with data protection regulations'
  },

  // BSA Safety (3 items)
  {
    id: 'bsa-safety-audit',
    title: 'BSA Safety Audit',
    category: 'BSA Safety',
    description: 'Annual BSA safety standards audit',
    frequency_months: 12,
    is_required: true,
    priority: 'high',
    legal_requirement: false,
    default_notes: 'BSA member requirement for safety standards'
  },
  {
    id: 'safety-policy-review',
    title: 'Safety Policy Review',
    category: 'BSA Safety',
    description: 'Annual review of safety policies and procedures',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Update safety policies based on best practices'
  },
  {
    id: 'incident-reporting',
    title: 'Incident Reporting',
    category: 'BSA Safety',
    description: 'Annual review of incident reporting procedures',
    frequency_months: 12,
    is_required: true,
    priority: 'medium',
    legal_requirement: false,
    default_notes: 'Ensure all incidents are properly reported and recorded'
  }
];

export const COMPLIANCE_CATEGORIES = [
  'Fire Safety',
  'Gas Safety', 
  'Electrical Safety',
  'Structural & Condition',
  'Operational & Contracts',
  'Insurance',
  'Lease & Documentation',
  'Admin & Reporting',
  'Smart Records',
  'BSA Safety'
];

export function getAssetsByCategory(category: string): ComplianceAsset[] {
  return MASTER_COMPLIANCE_ASSETS.filter(asset => asset.category === category);
}

export function getAssetById(id: string): ComplianceAsset | undefined {
  return MASTER_COMPLIANCE_ASSETS.find(asset => asset.id === id);
}
