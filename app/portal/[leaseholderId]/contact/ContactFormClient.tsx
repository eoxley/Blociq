'use client';

import { useState } from 'react';
import { PaperAirplaneIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ContactFormClientProps {
  leaseholderId: string;
  leaseContext: {
    leaseholderName: string;
    unitNumber?: string;
    buildingId: string;
    buildingName: string;
  };
  recentCommunications: Array<{
    id: string;
    type: string;
    subject: string;
    sent_at: string;
    status: string;
  }>;
}

interface FormData {
  subject: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  category: 'general' | 'maintenance' | 'financial' | 'complaint' | 'other';
}

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'General inquiry, not urgent' },
  { value: 'medium', label: 'Medium', description: 'Important but not emergency' },
  { value: 'high', label: 'High', description: 'Urgent - requires immediate attention' }
];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Inquiry', description: 'General questions or information' },
  { value: 'maintenance', label: 'Maintenance', description: 'Repairs, maintenance requests' },
  { value: 'financial', label: 'Financial', description: 'Service charges, ground rent, payments' },
  { value: 'complaint', label: 'Complaint', description: 'Issues or concerns' },
  { value: 'other', label: 'Other', description: 'Something else' }
];

export function ContactFormClient({ leaseholderId, leaseContext, recentCommunications }: ContactFormClientProps) {
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    message: '',
    urgency: 'medium',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/portal/${leaseholderId}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          context: leaseContext
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();
      setSubmitStatus('success');
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        urgency: 'medium',
        category: 'general'
      });

      // Refresh recent communications after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Recent Communications */}
      {recentCommunications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Communications</h2>
          <div className="space-y-3">
            {recentCommunications.map((comm) => (
              <div key={comm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{comm.subject}</p>
                  <p className="text-sm text-gray-600">
                    {comm.type} • {new Date(comm.sent_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  comm.status === 'sent' ? 'bg-green-100 text-green-800' :
                  comm.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {comm.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Message</h2>
        
        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">Message sent successfully!</p>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Your message has been sent to the building management team. You should receive a response within 24-48 hours.
            </p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Failed to send message</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Brief description of your message"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_OPTIONS.map((option) => (
                <label key={option.value} className="relative">
                  <input
                    type="radio"
                    name="category"
                    value={option.value}
                    checked={formData.category === option.value}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.category === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Level *
            </label>
            <div className="space-y-2">
              {URGENCY_OPTIONS.map((option) => (
                <label key={option.value} className="relative">
                  <input
                    type="radio"
                    name="urgency"
                    value={option.value}
                    checked={formData.urgency === option.value}
                    onChange={(e) => handleInputChange('urgency', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.urgency === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        option.value === 'high' ? 'bg-red-100 text-red-800' :
                        option.value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {option.value}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Please provide details about your inquiry, request, or concern..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!formData.subject.trim() || !formData.message.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
