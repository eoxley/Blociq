'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  MapPin, 
  Users, 
  Shield, 
  Key, 
  Phone, 
  Mail, 
  FileText, 
  Save, 
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Settings,
  Home,
  Wrench
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  notes: string | null
  is_hrb: boolean | null
  created_at: string
  updated_at: string
}

interface BuildingSetup {
  id?: string
  building_id: string
  structure_type: 'Freehold' | 'RMC' | 'Tripartite' | null
  operational_notes: string | null
  client_type: string | null
  client_name: string | null
  client_contact: string | null
  client_email: string | null
  keys_location: string | null
  emergency_access: string | null
  site_staff: string | null
  insurance_contact: string | null
  cleaners: string | null
  contractors: string | null
  assigned_manager: string | null
}

interface BuildingSetupClientProps {
  building: Building
  existingSetup: BuildingSetup | null
  buildingId: string
}

export default function BuildingSetupClient({ 
  building, 
  existingSetup, 
  buildingId 
}: BuildingSetupClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<BuildingSetup>({
    building_id: buildingId,
    structure_type: existingSetup?.structure_type || null,
    operational_notes: existingSetup?.operational_notes || '',
    client_type: existingSetup?.client_type || '',
    client_name: existingSetup?.client_name || '',
    client_contact: existingSetup?.client_contact || '',
    client_email: existingSetup?.client_email || '',
    keys_location: existingSetup?.keys_location || '',
    emergency_access: existingSetup?.emergency_access || '',
    site_staff: existingSetup?.site_staff || '',
    insurance_contact: existingSetup?.insurance_contact || '',
    cleaners: existingSetup?.cleaners || '',
    contractors: existingSetup?.contractors || '',
    assigned_manager: existingSetup?.assigned_manager || ''
  })

  const steps = [
    {
      id: 'basic',
      title: 'Building Information',
      description: 'Basic building details and structure type',
      icon: Building2
    },
    {
      id: 'client',
      title: 'Client & Management',
      description: 'Client information and assigned management',
      icon: Users
    },
    {
      id: 'operations',
      title: 'Operations & Access',
      description: 'Keys, emergency access, and operational details',
      icon: Key
    },
    {
      id: 'services',
      title: 'Services & Contractors',
      description: 'Insurance, cleaning, and contractor information',
      icon: Wrench
    }
  ]

  const handleInputChange = (field: keyof BuildingSetup, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/building-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to save building setup')
      }

      toast.success('Building setup saved successfully!')
      
      // Navigate to compliance setup
      router.push(`/buildings/${buildingId}/compliance/setup`)
    } catch (error) {
      console.error('Error saving building setup:', error)
      toast.error('Failed to save building setup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isStepValid = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Basic info
        return formData.structure_type !== null
      case 1: // Client info
        return formData.client_type && formData.client_name
      case 2: // Operations
        return true // Optional fields
      case 3: // Services
        return true // Optional fields
      default:
        return true
    }
  }

  const canProceed = isStepValid(currentStep)
  const isLastStep = currentStep === steps.length - 1

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building Structure Type *
              </label>
              <select
                value={formData.structure_type || ''}
                onChange={(e) => handleInputChange('structure_type', e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select structure type...</option>
                <option value="Freehold">Freehold</option>
                <option value="RMC">RMC (Resident Management Company)</option>
                <option value="Tripartite">Tripartite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                High-Risk Building (HRB)
              </label>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="is_hrb"
                  checked={building.is_hrb || false}
                  readOnly
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="is_hrb" className="text-sm text-gray-700">
                  This building is classified as a High-Risk Building under the Building Safety Act
                </label>
              </div>
              {building.is_hrb && (
                <p className="mt-2 text-sm text-amber-600">
                  Additional compliance requirements will apply for HRB properties.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operational Notes
              </label>
              <textarea
                value={formData.operational_notes || ''}
                onChange={(e) => handleInputChange('operational_notes', e.target.value)}
                placeholder="Any important operational notes about this building..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Type *
                </label>
                <select
                  value={formData.client_type || ''}
                  onChange={(e) => handleInputChange('client_type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select client type...</option>
                  <option value="Freeholder">Freeholder</option>
                  <option value="RMC">RMC</option>
                  <option value="Management Company">Management Company</option>
                  <option value="RTM">RTM (Right to Manage)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.client_name || ''}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Client or company name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Contact
                </label>
                <input
                  type="tel"
                  value={formData.client_contact || ''}
                  onChange={(e) => handleInputChange('client_contact', e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Email
                </label>
                <input
                  type="email"
                  value={formData.client_email || ''}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned Manager
              </label>
              <input
                type="text"
                value={formData.assigned_manager || ''}
                onChange={(e) => handleInputChange('assigned_manager', e.target.value)}
                placeholder="Property manager assigned to this building"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keys Location
              </label>
              <input
                type="text"
                value={formData.keys_location || ''}
                onChange={(e) => handleInputChange('keys_location', e.target.value)}
                placeholder="Where are the building keys stored?"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Access
              </label>
              <textarea
                value={formData.emergency_access || ''}
                onChange={(e) => handleInputChange('emergency_access', e.target.value)}
                placeholder="Emergency access procedures and contact information..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Staff
              </label>
              <input
                type="text"
                value={formData.site_staff || ''}
                onChange={(e) => handleInputChange('site_staff', e.target.value)}
                placeholder="On-site staff or caretaker information"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Contact
              </label>
              <input
                type="text"
                value={formData.insurance_contact || ''}
                onChange={(e) => handleInputChange('insurance_contact', e.target.value)}
                placeholder="Insurance provider contact details"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cleaners
              </label>
              <input
                type="text"
                value={formData.cleaners || ''}
                onChange={(e) => handleInputChange('cleaners', e.target.value)}
                placeholder="Cleaning service provider"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contractors
              </label>
              <textarea
                value={formData.contractors || ''}
                onChange={(e) => handleInputChange('contractors', e.target.value)}
                placeholder="Key contractors and service providers..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push(`/buildings/${buildingId}`)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-[#004AAD] via-[#3B82F6] to-[#7209B7] rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#004AAD] to-[#7209B7] bg-clip-text text-transparent">
                  Building Setup
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />
                  {building.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep || (index === currentStep && isStepValid(index))
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    isCompleted 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isActive 
                        ? 'border-blue-600 text-blue-600 bg-blue-50' 
                        : 'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted && index < currentStep ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-20 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 mt-1">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <BlocIQCard variant="elevated" className="mb-8">
          <BlocIQCardContent className="p-8">
            {renderStepContent()}
          </BlocIQCardContent>
        </BlocIQCard>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {!canProceed && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Please complete required fields
              </div>
            )}
            
            {isLastStep ? (
              <BlocIQButton
                onClick={handleSave}
                disabled={!canProceed || saving}
                className="bg-gradient-to-r from-[#004AAD] to-[#7209B7] hover:from-[#003A8C] hover:to-[#5A078F]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </BlocIQButton>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={!canProceed}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}