'use client'

import { useState } from 'react'
import { X, Save, Building2, MapPin, Shield, Users } from 'lucide-react'

interface BuildingEditModalProps {
  isOpen: boolean
  onClose: () => void
  building: {
    id: string
    name: string
    address: string | null
  }
  buildingSetup?: {
    structure_type: string | null
    operational_notes: string | null
  } | null
  onSave: (data: {
    name: string
    address: string
    structure_type: string
    is_hrb: boolean
  }) => Promise<void>
}

export default function BuildingEditModal({
  isOpen,
  onClose,
  building,
  buildingSetup,
  onSave
}: BuildingEditModalProps) {
  const [formData, setFormData] = useState({
    name: building.name || '',
    address: building.address || '',
    structure_type: buildingSetup?.structure_type || 'Freehold',
    is_hrb: false // This will need to be fetched from the building table
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save building information')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Building Information</h2>
              <p className="text-sm text-gray-600">Update building details and configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Building Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Building Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter building name"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter building address"
              />
            </div>
          </div>

          {/* Structure Type */}
          <div>
            <label htmlFor="structure_type" className="block text-sm font-medium text-gray-700 mb-2">
              Structure Type
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="structure_type"
                value={formData.structure_type}
                onChange={(e) => setFormData(prev => ({ ...prev, structure_type: e.target.value }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Freehold">Freehold</option>
                <option value="RMC">RMC (Resident Management Company)</option>
                <option value="Tripartite">Tripartite</option>
                <option value="Leasehold">Leasehold</option>
              </select>
            </div>
          </div>

          {/* HRB Status */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_hrb}
                onChange={(e) => setFormData(prev => ({ ...prev, is_hrb: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">HRB (High Rise Building)</span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              Mark if this building is classified as a High Rise Building requiring additional compliance
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}