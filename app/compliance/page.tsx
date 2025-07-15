import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceClient from './ComplianceClient'

// Sample compliance assets data
const complianceAssets = [
  {
    id: '1',
    name: 'Fire Safety Equipment',
    description: 'Fire extinguishers, smoke detectors, and emergency lighting systems',
    required_if: 'always' as const,
    default_frequency: '6 months',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '2',
    name: 'Elevator Inspections',
    description: 'Annual elevator safety inspections and maintenance records',
    required_if: 'if present' as const,
    default_frequency: '1 year',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '3',
    name: 'HVAC Systems',
    description: 'Heating, ventilation, and air conditioning system maintenance',
    required_if: 'always' as const,
    default_frequency: '6 months',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '4',
    name: 'Electrical Systems',
    description: 'Electrical panel inspections and wiring safety checks',
    required_if: 'always' as const,
    default_frequency: '1 year',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '5',
    name: 'Plumbing Systems',
    description: 'Water supply, drainage, and sewage system inspections',
    required_if: 'always' as const,
    default_frequency: '1 year',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '6',
    name: 'Roof Inspections',
    description: 'Roof condition assessments and maintenance',
    required_if: 'always' as const,
    default_frequency: '1 year',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '7',
    name: 'Structural Integrity',
    description: 'Building foundation and structural component assessments',
    required_if: 'always' as const,
    default_frequency: '3 years',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '8',
    name: 'Asbestos Management',
    description: 'Asbestos-containing material surveys and management plans',
    required_if: 'if HRB' as const,
    default_frequency: '5 years',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '9',
    name: 'Lead Paint Assessment',
    description: 'Lead-based paint inspections and abatement records',
    required_if: 'if HRB' as const,
    default_frequency: '5 years',
    applies: false,
    last_checked: '',
    next_due: ''
  },
  {
    id: '10',
    name: 'Energy Efficiency',
    description: 'Energy performance certificates and efficiency audits',
    required_if: 'if present' as const,
    default_frequency: '1 year',
    applies: false,
    last_checked: '',
    next_due: ''
  }
]

export default function CompliancePage() {
  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compliance Management</h1>
          <p className="mt-2 text-gray-600">
            Track and manage building compliance requirements and inspections
          </p>
        </div>
        
        <ComplianceClient complianceAssets={complianceAssets} />
      </div>
    </LayoutWithSidebar>
  )
}
