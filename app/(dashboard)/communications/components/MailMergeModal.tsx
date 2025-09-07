'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Mail, Download, Eye, AlertCircle, CheckCircle } from 'lucide-react';

interface MailMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId?: string;
  buildingName?: string;
}

interface Template {
  id: string;
  name: string;
  type: 'letter' | 'email';
  description?: string;
}

interface Recipient {
  leaseholder_id: string;
  leaseholder_name: string;
  salutation: string;
  email?: string;
  postal_address?: string;
  unit_label: string;
  opt_out_email?: boolean;
}

interface PreviewData {
  recipient: Recipient;
  subject?: string;
  html: string;
  text?: string;
  warnings: string[];
}

export default function MailMergeModal({ isOpen, onClose, buildingId, buildingName }: MailMergeModalProps) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(true);

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      if (buildingId) {
        loadRecipients();
      }
    }
  }, [isOpen, buildingId]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/comms/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadRecipients = async () => {
    if (!buildingId) return;
    
    try {
      const response = await fetch(`/api/comms/recipients?buildingId=${buildingId}`);
      if (response.ok) {
        const data = await response.json();
        setRecipients(data);
      }
    } catch (error) {
      console.error('Failed to load recipients:', error);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setStep(2);
  };

  const handlePreview = async () => {
    if (!selectedTemplate || !buildingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/comms/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          templateId: selectedTemplate.id,
          testMode: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.preview);
        setStep(3);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate preview');
      }
    } catch (error) {
      setError('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !buildingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = selectedTemplate.type === 'letter' 
        ? '/api/comms/generate-letters'
        : '/api/comms/send-emails';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          templateId: selectedTemplate.id,
          testMode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setStep(4);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate communications');
      }
    } catch (error) {
      setError('Failed to generate communications');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!buildingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/comms/export-word-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          templateId: selectedTemplate?.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Open download link
        window.open(data.downloadUrl, '_blank');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to export Word CSV');
      }
    } catch (error) {
      setError('Failed to export Word CSV');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedTemplate(null);
    setPreviewData([]);
    setError(null);
    setTestMode(true);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Mail Merge</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Step 1: Select Template */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Select Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center mb-2">
                      {template.type === 'letter' ? (
                        <FileText className="w-5 h-5 text-blue-500 mr-2" />
                      ) : (
                        <Mail className="w-5 h-5 text-green-500 mr-2" />
                      )}
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                    <span className="text-xs text-gray-500 capitalize">{template.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Preview & Field Check */}
          {step === 2 && selectedTemplate && (
            <div>
              <h3 className="text-lg font-medium mb-4">Preview & Field Check</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Building: <span className="font-medium">{buildingName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Recipients: <span className="font-medium">{recipients.length}</span>
                </p>
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="testMode"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="testMode" className="text-sm text-gray-600">
                  Test mode (preview only, no actual sending)
                </label>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>
                <button
                  onClick={handleExportWord}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Word CSV
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview Results */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Preview Results</h3>
              <div className="space-y-4">
                {previewData.slice(0, 3).map((preview, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{preview.recipient.salutation}</span>
                      <span className="text-sm text-gray-500">{preview.recipient.unit_label}</span>
                    </div>
                    {preview.subject && (
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Subject: {preview.subject}
                      </p>
                    )}
                    <div className="text-sm text-gray-600 mb-2">
                      <div dangerouslySetInnerHTML={{ __html: preview.html }} />
                    </div>
                    {preview.warnings.length > 0 && (
                      <div className="text-sm text-yellow-600">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        {preview.warnings.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
                {previewData.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {previewData.length - 3} more recipients
                  </p>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Communications'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Communications Generated Successfully!</h3>
              <p className="text-gray-600 mb-6">
                {selectedTemplate?.type === 'letter' 
                  ? 'Letters have been generated and saved to storage.'
                  : 'Emails have been queued for sending.'
                }
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Generate More
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
