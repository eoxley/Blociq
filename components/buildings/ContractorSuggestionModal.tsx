'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Phone,
  Mail,
  Star,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { AISuggestion } from './AISuggestionsPanel';

interface ContractorSuggestionModalProps {
  isOpen: boolean;
  suggestion: AISuggestion | null;
  onClose: () => void;
  onCreateWorkOrder: (suggestion: AISuggestion, contractorInfo: any) => void;
}

interface Contractor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  specializations: string[];
  rating?: number;
  averageCost?: number;
}

const ContractorSuggestionModal: React.FC<ContractorSuggestionModalProps> = ({
  isOpen,
  suggestion,
  onClose,
  onCreateWorkOrder
}) => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [workOrderTemplate, setWorkOrderTemplate] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [step, setStep] = useState<'select' | 'preview' | 'create'>('select');

  // Mock contractor data - in real implementation, this would fetch from your contractors table
  const mockContractors: Contractor[] = [
    {
      id: '1',
      name: 'ABC Fire Safety Ltd',
      email: 'contact@abcfire.co.uk',
      phone: '020 1234 5678',
      specializations: ['Fire Safety', 'Emergency Systems'],
      rating: 4.8,
      averageCost: 150,
      notes: 'Certified fire safety specialists with 15+ years experience'
    },
    {
      id: '2',
      name: 'London Gas Safe Engineers',
      email: 'info@londongassafe.co.uk',
      phone: '020 2345 6789',
      specializations: ['Gas Safety', 'Boiler Maintenance'],
      rating: 4.6,
      averageCost: 120,
      notes: 'Gas Safe registered engineers available 24/7'
    },
    {
      id: '3',
      name: 'Elite Building Maintenance',
      email: 'jobs@elitebuilding.co.uk',
      phone: '020 3456 7890',
      specializations: ['General Maintenance', 'Electrical', 'Plumbing'],
      rating: 4.5,
      averageCost: 80,
      notes: 'Full-service building maintenance company'
    }
  ];

  const fetchMatchingContractors = async () => {
    if (!suggestion?.contractorSuggestion) return;

    setLoading(true);
    try {
      // In real implementation, this would call an API to find matching contractors
      // For now, we'll filter mock data based on contractor type
      const contractorType = suggestion.contractorSuggestion.type.toLowerCase();
      const matching = mockContractors.filter(contractor =>
        contractor.specializations.some(spec =>
          spec.toLowerCase().includes(contractorType) ||
          contractorType.includes(spec.toLowerCase())
        )
      );

      setContractors(matching.length > 0 ? matching : mockContractors.slice(0, 2));

      // Generate work order template using AI
      await generateWorkOrderTemplate();

    } catch (error) {
      console.error('Error fetching contractors:', error);
      setContractors(mockContractors.slice(0, 2));
    } finally {
      setLoading(false);
    }
  };

  const generateWorkOrderTemplate = async () => {
    if (!suggestion) return;

    const template = `WORK ORDER REQUEST

Property: [Building Name]
Unit/Area: [Specific Location]
Contact: [Property Manager Details]

WORK DESCRIPTION:
${suggestion.text}

SCOPE OF WORK:
- ${suggestion.contractorSuggestion?.type || 'Professional service'} required
- Urgency Level: ${suggestion.contractorSuggestion?.urgency || 'Standard'}
- Expected Completion: ${suggestion.suggestedDueDate ? new Date(suggestion.suggestedDueDate).toLocaleDateString('en-GB') : 'TBD'}

REQUIREMENTS:
- Valid insurance and certifications required
- All work must comply with current regulations
- Safety protocols must be followed
- Certificate/documentation required upon completion

ADDITIONAL NOTES:
${suggestion.reasoning}

Please provide:
1. Detailed quote for the work described
2. Proposed timeline for completion
3. Confirmation of relevant certifications
4. Method statement if applicable

Contact for access arrangements and further details.`;

    setWorkOrderTemplate(template);
  };

  const handleSelectContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setStep('preview');
  };

  const handleCreateWorkOrder = () => {
    if (!selectedContractor || !suggestion) return;

    const workOrderData = {
      contractor: selectedContractor,
      template: workOrderTemplate,
      customNotes,
      suggestion
    };

    onCreateWorkOrder(suggestion, workOrderData);
    toast.success(`✅ Work order created for ${selectedContractor.name}`);
    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setSelectedContractor(null);
    setCustomNotes('');
    onClose();
  };

  useEffect(() => {
    if (isOpen && suggestion?.contractorSuggestion) {
      fetchMatchingContractors();
    }
  }, [isOpen, suggestion]);

  if (!isOpen || !suggestion?.contractorSuggestion) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Wrench className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Contractor Suggestion</h3>
              <p className="text-sm text-gray-600">{suggestion.contractorSuggestion.type}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Action Item Summary */}
          <div className="p-6 bg-blue-50 border-b">
            <h4 className="font-medium text-blue-900 mb-2">Action Item</h4>
            <p className="text-blue-800">{suggestion.text}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Urgency: {suggestion.contractorSuggestion.urgency}</span>
              </div>
              {suggestion.suggestedDueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {new Date(suggestion.suggestedDueDate).toLocaleDateString('en-GB')}</span>
                </div>
              )}
            </div>
          </div>

          {step === 'select' && (
            <div className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Select a Contractor</h4>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Finding matching contractors...</span>
                </div>
              ) : contractors.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Contractors Found</h4>
                  <p className="text-gray-600">No contractors match the required specialization.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contractors.map((contractor) => (
                    <div
                      key={contractor.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectContractor(contractor)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{contractor.name}</h5>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {contractor.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{contractor.email}</span>
                              </div>
                            )}
                            {contractor.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{contractor.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contractor.specializations.map((spec) => (
                              <span
                                key={spec}
                                className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                          {contractor.notes && (
                            <p className="text-sm text-gray-600 mt-2">{contractor.notes}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          {contractor.rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span>{contractor.rating}</span>
                            </div>
                          )}
                          {contractor.averageCost && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                              <DollarSign className="h-4 w-4" />
                              <span>£{contractor.averageCost}/hr avg</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && selectedContractor && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Work Order Preview</h4>
                <button
                  onClick={() => setStep('select')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Change Contractor
                </button>
              </div>

              {/* Selected Contractor */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Selected: {selectedContractor.name}</span>
                </div>
                <div className="text-sm text-green-700">
                  {selectedContractor.email} • {selectedContractor.phone}
                </div>
              </div>

              {/* Work Order Template */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Order Template
                </label>
                <textarea
                  value={workOrderTemplate}
                  onChange={(e) => setWorkOrderTemplate(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Work order details..."
                />
              </div>

              {/* Custom Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full h-20 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional instructions or requirements..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCreateWorkOrder}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Create Work Order
                </button>
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractorSuggestionModal;