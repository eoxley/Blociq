'use client'

import React, { useState } from 'react'
import EnhancedEditAssetModal from '@/components/compliance/EnhancedEditAssetModal'

export default function ComplianceModalTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [testAsset, setTestAsset] = useState(null)

  const handleOpenModal = () => {
    setTestAsset({
      compliance_asset_id: 'test-asset-1',
      asset_name: 'EICR (Electrical Installation Condition Report)',
      description: 'Electrical safety inspection and testing',
      status: 'compliant',
      last_carried_out: '2024-01-15',
      next_due_date: '2025-01-15',
      inspector_provider: 'Test Electrical Ltd',
      certificate_reference: 'EICR-2024-001'
    })
    setIsModalOpen(true)
  }

  const handleSave = (updatedAsset: any) => {
    console.log('Asset saved:', updatedAsset)
    alert('Asset saved successfully! Check console for details.')
    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Compliance Modal Test</h1>
          <p className="text-lg text-gray-600">
            Test the Edit Compliance Asset modal functionality
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Controls</h2>
            
            <button
              onClick={handleOpenModal}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Open Edit Compliance Asset Modal
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Expected Behavior:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Modal should open with EICR asset pre-filled</li>
                <li>Update Asset button should be visible in the footer</li>
                <li>Button should be enabled (not grayed out)</li>
                <li>Button should have proper styling and hover effects</li>
                <li>Debug info should show validation status (in development)</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">Troubleshooting:</h3>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>If button is missing, check modal height and overflow settings</li>
                <li>If button is disabled, check required field validation</li>
                <li>If button is grayed out, check form data state</li>
                <li>Check browser console for any JavaScript errors</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal */}
        <EnhancedEditAssetModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          buildingId="test-building-123"
          assetId="test-asset-1"
          asset={testAsset}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
