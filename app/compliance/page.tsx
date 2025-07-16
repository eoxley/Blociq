import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import ComplianceClient from './ComplianceClient'
import UKComplianceSetup from './UKComplianceSetup'
import { UK_COMPLIANCE_ITEMS } from '../../lib/complianceUtils'

export default function CompliancePage() {
  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">UK Compliance Management</h1>
          <p className="mt-2 text-gray-600">
            Track and manage building compliance requirements using UK leasehold standards
          </p>
        </div>
        
        {/* For now, show the UK compliance setup for a demo building */}
        <UKComplianceSetup buildingId={1} buildingName="Demo Building" />
      </div>
    </LayoutWithSidebar>
  )
}
