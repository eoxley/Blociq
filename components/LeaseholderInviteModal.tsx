'use client';

import { useState } from 'react';
import { XMarkIcon, UserPlusIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface LeaseholderInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaseholderId: string;
  leaseholderName: string;
  unitNumber?: string;
  buildingName: string;
}

interface InviteFormData {
  email: string;
  name: string;
}

interface InviteResult {
  success: boolean;
  message: string;
  magicLink?: string;
  portalUrl?: string;
}

export function LeaseholderInviteModal({
  isOpen,
  onClose,
  leaseholderId,
  leaseholderName,
  unitNumber,
  buildingName
}: LeaseholderInviteModalProps) {
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    name: leaseholderName
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/leaseholders/${leaseholderId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Leaseholder invited successfully!',
          magicLink: data.magic_link,
          portalUrl: data.portal_url
        });
        
        // Reset form
        setFormData({
          email: '',
          name: leaseholderName
        });
      } else {
        setResult({
          success: false,
          message: data.message || 'Failed to invite leaseholder'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof InviteFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    setResult(null);
    setFormData({
      email: '',
      name: leaseholderName
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserPlusIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Invite Leaseholder</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Leaseholder Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Leaseholder Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Name:</span> {leaseholderName}</p>
              {unitNumber && <p><span className="font-medium">Unit:</span> {unitNumber}</p>}
              <p><span className="font-medium">Building:</span> {buildingName}</p>
            </div>
          </div>

          {/* Result Message */}
          {result && (
            <div className={`mb-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {result.success ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                )}
                <p className={`font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
              </div>
              
              {result.success && result.magicLink && (
                <div className="mt-4 space-y-3">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Magic Link:</p>
                    <p className="text-xs text-gray-600 break-all">{result.magicLink}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Portal URL:</p>
                    <p className="text-xs text-gray-600">{result.portalUrl}</p>
                  </div>
                  <p className="text-sm text-green-700">
                    Send this link to the leaseholder to give them access to their portal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Invite Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• A user account will be created for the leaseholder</li>
                <li>• They'll receive a magic link to access their portal</li>
                <li>• They can view their lease details, payments, and documents</li>
                <li>• They can contact building management through the portal</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.email || !formData.name || isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
