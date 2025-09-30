'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  CalculatorIcon, 
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DemandWizardProps {
  buildingId: string;
  onComplete?: (demands: any[]) => void;
}

interface DemandLine {
  description: string;
  amount: number;
  accountId?: string;
}

interface Leaseholder {
  id: string;
  full_name: string;
  unit_number: string;
  service_charge_percentage: number;
}

const DEMAND_TYPES = [
  { value: 'service_charge', label: 'Service Charge', description: 'Regular service charge demand' },
  { value: 'ground_rent', label: 'Ground Rent', description: 'Annual ground rent demand' },
  { value: 'major_works', label: 'Major Works', description: 'Section 20 major works contribution' },
  { value: 'insurance', label: 'Insurance', description: 'Building insurance contribution' },
  { value: 'other', label: 'Other', description: 'Other charges or adjustments' }
];

const WIZARD_STEPS = [
  { id: 'leaseholders', title: 'Select Leaseholders', icon: UserGroupIcon },
  { id: 'details', title: 'Demand Details', icon: DocumentTextIcon },
  { id: 'apportion', title: 'Apportion Amounts', icon: CalculatorIcon },
  { id: 'preview', title: 'Preview & Send', icon: PaperAirplaneIcon }
];

export function DemandWizard({ buildingId, onComplete }: DemandWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLeaseholders, setSelectedLeaseholders] = useState<string[]>([]);
  const [demandType, setDemandType] = useState('service_charge');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [demandLines, setDemandLines] = useState<DemandLine[]>([
    { description: '', amount: 0 }
  ]);
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Load leaseholders for the building
  useEffect(() => {
    const loadLeaseholders = async () => {
      try {
        const response = await fetch(`/api/buildings/${buildingId}/leaseholders`);
        if (response.ok) {
          const data = await response.json();
          setLeaseholders(data.leaseholders || []);
        }
      } catch (error) {
        console.error('Error loading leaseholders:', error);
      }
    };

    loadLeaseholders();
  }, [buildingId]);

  // Calculate total amount
  const totalAmount = demandLines.reduce((sum, line) => sum + (line.amount || 0), 0);

  // Calculate individual leaseholder amounts (for service charges)
  const getLeaseholderAmount = (leaseholder: Leaseholder) => {
    if (demandType === 'service_charge') {
      return (totalAmount * leaseholder.service_charge_percentage) / 100;
    }
    return totalAmount / selectedLeaseholders.length; // Equal split for other types
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddLine = () => {
    setDemandLines([...demandLines, { description: '', amount: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setDemandLines(demandLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof DemandLine, value: string | number) => {
    const newLines = [...demandLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setDemandLines(newLines);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/accounting/demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          leaseholderIds: selectedLeaseholders,
          demandType,
          description,
          dueDate,
          periodStart,
          periodEnd,
          demandLines: demandLines.filter(line => line.description && line.amount > 0)
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSubmissionResult({
          success: true,
          demands: data.demands,
          message: data.message
        });
        onComplete?.(data.demands);
      } else {
        setSubmissionResult({
          success: false,
          message: data.message || 'Failed to create demands'
        });
      }
    } catch (error) {
      setSubmissionResult({
        success: false,
        message: 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select Leaseholders
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Leaseholders
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {leaseholders.map((leaseholder) => (
                  <label key={leaseholder.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedLeaseholders.includes(leaseholder.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeaseholders([...selectedLeaseholders, leaseholder.id]);
                        } else {
                          setSelectedLeaseholders(selectedLeaseholders.filter(id => id !== leaseholder.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{leaseholder.full_name}</span>
                      <span className="text-gray-500 ml-2">Unit {leaseholder.unit_number}</span>
                      {demandType === 'service_charge' && (
                        <span className="text-blue-600 ml-2">
                          ({leaseholder.service_charge_percentage}%)
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 1: // Demand Details
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demand Type
              </label>
              <select
                value={demandType}
                onChange={(e) => setDemandType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEMAND_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter demand description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 2: // Apportion Amounts
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demand Lines
              </label>
              <div className="space-y-3">
                {demandLines.map((line, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={line.amount || ''}
                      onChange={(e) => handleLineChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={demandLines.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Line
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Amount:</span>
                <span className="text-xl font-bold text-gray-900">£{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case 3: // Preview & Send
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview Demands</h3>
              <div className="space-y-4">
                {selectedLeaseholders.map((leaseholderId) => {
                  const leaseholder = leaseholders.find(l => l.id === leaseholderId);
                  if (!leaseholder) return null;
                  
                  const amount = getLeaseholderAmount(leaseholder);
                  
                  return (
                    <div key={leaseholderId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{leaseholder.full_name}</h4>
                          <p className="text-sm text-gray-500">Unit {leaseholder.unit_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">£{amount.toFixed(2)}</p>
                          {demandType === 'service_charge' && (
                            <p className="text-sm text-gray-500">{leaseholder.service_charge_percentage}%</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="font-medium text-blue-900">Ready to Create Demands</p>
                  <p className="text-sm text-blue-700">
                    {selectedLeaseholders.length} demand{selectedLeaseholders.length !== 1 ? 's' : ''} will be created for £{totalAmount.toFixed(2)} total
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedLeaseholders.length > 0;
      case 1:
        return description && dueDate;
      case 2:
        return demandLines.some(line => line.description && line.amount > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  if (submissionResult?.success) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Demands Created Successfully!</h2>
          <p className="text-gray-600 mb-6">{submissionResult.message}</p>
          <div className="space-y-2">
            {submissionResult.demands.map((demand: any) => (
              <div key={demand.id} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium">{demand.demand_number}</p>
                <p className="text-sm text-gray-500">£{demand.total_amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Progress Steps */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  isActive ? 'bg-blue-600 text-white' :
                  isCompleted ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className="flex-1 mx-4 h-px bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="border-t border-gray-200 p-6">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Demands'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {submissionResult && !submissionResult.success && (
        <div className="border-t border-gray-200 p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{submissionResult.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
