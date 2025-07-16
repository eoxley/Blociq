export interface ComplianceAsset {
  id: string
  name: string
  description: string
  required_if: 'always' | 'if present' | 'if HRB'
  default_frequency: string
  applies: boolean
  last_checked: string
  next_due: string
  category: string
}

export interface UKComplianceItem {
  id: number
  item_type: string
  category: string
  frequency: string
  status: string
  applies: boolean
  last_checked: string | null
  next_due: string | null
  notes: string | null
}

export interface BuildingAsset {
  id: number
  building_id: number
  compliance_item_id: number
  applies: boolean
  last_checked: string | null
  next_due: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

// UK-specific compliance items with proper terminology
export const UK_COMPLIANCE_ITEMS = [
  {
    id: 1,
    name: 'Fire Risk Assessment',
    description: 'Legally required assessment of fire risks in communal areas',
    required_if: 'always' as const,
    default_frequency: '1 year',
    category: 'Safety',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 2,
    name: 'Emergency Lighting',
    description: 'Emergency lighting systems in communal areas and escape routes',
    required_if: 'always' as const,
    default_frequency: '6 months',
    category: 'Safety',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 3,
    name: 'Fire Extinguishers',
    description: 'Portable fire extinguishers in communal areas',
    required_if: 'always' as const,
    default_frequency: '1 year',
    category: 'Safety',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 4,
    name: 'Lift Service',
    description: 'Lift maintenance and safety inspections',
    required_if: 'if present' as const,
    default_frequency: '6 months',
    category: 'Equipment',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 5,
    name: 'Ventilation Systems',
    description: 'Mechanical ventilation and air conditioning systems',
    required_if: 'if present' as const,
    default_frequency: '1 year',
    category: 'Equipment',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 6,
    name: 'Electrical Installation Condition Report (EICR)',
    description: 'Periodic inspection of electrical installations',
    required_if: 'always' as const,
    default_frequency: '5 years',
    category: 'Electrical',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 7,
    name: 'Gas Safety Certificate',
    description: 'Gas safety inspection for communal gas systems',
    required_if: 'if present' as const,
    default_frequency: '1 year',
    category: 'Gas',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 8,
    name: 'Water Risk Assessment',
    description: 'Legionella risk assessment for water systems',
    required_if: 'always' as const,
    default_frequency: '2 years',
    category: 'Health',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 9,
    name: 'Asbestos Management Survey',
    description: 'Asbestos-containing material survey and management plan',
    required_if: 'if HRB' as const,
    default_frequency: '5 years',
    category: 'Health',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 10,
    name: 'Energy Performance Certificate (EPC)',
    description: 'Energy efficiency rating for the building',
    required_if: 'always' as const,
    default_frequency: '10 years',
    category: 'Energy',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 11,
    name: 'Building Insurance',
    description: 'Comprehensive building insurance policy',
    required_if: 'always' as const,
    default_frequency: '1 year',
    category: 'Insurance',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 12,
    name: 'Public Liability Insurance',
    description: 'Public liability insurance for communal areas',
    required_if: 'always' as const,
    default_frequency: '1 year',
    category: 'Insurance',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 13,
    name: 'Employers Liability Insurance',
    description: 'Employers liability insurance for staff',
    required_if: 'if present' as const,
    default_frequency: '1 year',
    category: 'Insurance',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 14,
    name: 'Roof Inspection',
    description: 'Structural inspection of roof and roof covering',
    required_if: 'always' as const,
    default_frequency: '1 year',
    category: 'Structural',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 15,
    name: 'Drainage Survey',
    description: 'Inspection of drainage and sewerage systems',
    required_if: 'always' as const,
    default_frequency: '3 years',
    category: 'Structural',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 16,
    name: 'External Wall Survey',
    description: 'Survey of external walls for safety and compliance',
    required_if: 'if HRB' as const,
    default_frequency: '5 years',
    category: 'Structural',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 17,
    name: 'Communal Area Risk Assessment',
    description: 'General risk assessment for communal areas',
    required_if: 'always' as const,
    default_frequency: '1 year',
    category: 'Safety',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 18,
    name: 'Legionella Risk Assessment',
    description: 'Assessment of legionella risks in water systems',
    required_if: 'always' as const,
    default_frequency: '2 years',
    category: 'Health',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 19,
    name: 'PAT Testing',
    description: 'Portable appliance testing for electrical equipment',
    required_if: 'if present' as const,
    default_frequency: '1 year',
    category: 'Electrical',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: 20,
    name: 'Fire Door Inspection',
    description: 'Inspection of fire doors and door furniture',
    required_if: 'always' as const,
    default_frequency: '6 months',
    category: 'Safety',
    applies: false,
    last_checked: '',
    next_due: ''
  }
]

export type ComplianceStatus = 'Compliant' | 'Due Soon' | 'Overdue' | 'In Progress' | 'Not Started' | 'Not Applicable'

export const getComplianceStatus = (asset: ComplianceAsset): ComplianceStatus => {
  if (!asset.applies) return 'Not Applicable'
  if (!asset.last_checked) return 'Not Started'
  if (!asset.next_due) return 'In Progress'
  
  const nextDue = new Date(asset.next_due)
  const today = new Date()
  
  if (nextDue < today) return 'Overdue'
  if (nextDue.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) return 'Due Soon'
  return 'Compliant'
}

export const calculateNextDueDate = (lastChecked: string, frequency: string): string => {
  const lastCheckedDate = new Date(lastChecked)
  const nextDue = new Date(lastCheckedDate)
  
  if (frequency.includes('6 months')) {
    nextDue.setMonth(nextDue.getMonth() + 6)
  } else if (frequency.includes('1 year')) {
    nextDue.setFullYear(nextDue.getFullYear() + 1)
  } else if (frequency.includes('3 years')) {
    nextDue.setFullYear(nextDue.getFullYear() + 3)
  } else if (frequency.includes('5 years')) {
    nextDue.setFullYear(nextDue.getFullYear() + 5)
  } else if (frequency.includes('monthly')) {
    nextDue.setMonth(nextDue.getMonth() + 1)
  } else if (frequency.includes('quarterly')) {
    nextDue.setMonth(nextDue.getMonth() + 3)
  }
  
  return nextDue.toISOString().split('T')[0]
}

export const getDaysUntilDue = (nextDue: string): number => {
  const dueDate = new Date(nextDue)
  const today = new Date()
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export const getStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'Compliant':
      return 'text-green-600'
    case 'Due Soon':
      return 'text-yellow-600'
    case 'Overdue':
      return 'text-red-600'
    case 'In Progress':
      return 'text-blue-600'
    case 'Not Started':
      return 'text-gray-600'
    default:
      return 'text-gray-400'
  }
}

export const getStatusBadgeColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'Compliant':
      return 'bg-green-100 text-green-800'
    case 'Due Soon':
      return 'bg-yellow-100 text-yellow-800'
    case 'Overdue':
      return 'bg-red-100 text-red-800'
    case 'In Progress':
      return 'bg-blue-100 text-blue-800'
    case 'Not Started':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const calculateComplianceStats = (assets: ComplianceAsset[]) => {
  const total = assets.length
  const applicable = assets.filter(asset => asset.applies).length
  const compliant = assets.filter(asset => getComplianceStatus(asset) === 'Compliant').length
  const overdue = assets.filter(asset => getComplianceStatus(asset) === 'Overdue').length
  const dueSoon = assets.filter(asset => getComplianceStatus(asset) === 'Due Soon').length
  const notStarted = assets.filter(asset => getComplianceStatus(asset) === 'Not Started').length
  const inProgress = assets.filter(asset => getComplianceStatus(asset) === 'In Progress').length

  return {
    total,
    applicable,
    compliant,
    overdue,
    dueSoon,
    notStarted,
    inProgress,
    complianceRate: applicable > 0 ? Math.round((compliant / applicable) * 100) : 0
  }
}

export const getUpcomingDueAssets = (assets: ComplianceAsset[], limit: number = 5) => {
  return assets
    .filter(asset => asset.applies && asset.next_due)
    .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
    .slice(0, limit)
}

export const getOverdueAssets = (assets: ComplianceAsset[]) => {
  return assets.filter(asset => getComplianceStatus(asset) === 'Overdue')
}

export const getDueSoonAssets = (assets: ComplianceAsset[]) => {
  return assets.filter(asset => getComplianceStatus(asset) === 'Due Soon')
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else {
    return `Due in ${diffDays} days`
  }
} 