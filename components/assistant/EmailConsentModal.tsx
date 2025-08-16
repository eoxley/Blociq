"use client";

import React, { useState } from 'react';
import { Brain, X, Mail, Shield } from 'lucide-react';
import { startPublicChat } from '@/lib/publicChatClient';

interface EmailConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (email: string, sessionId?: string) => void;
}

export default function EmailConsentModal({ isOpen, onClose, onUnlock }: EmailConsentModalProps) {
  const [email, setEmail] = useState('');
  const [agreedToResearch, setAgreedToResearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!agreedToResearch) {
      setError('Please agree to the terms to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      // Start public chat session
      const sessionId = await startPublicChat(email, agreedToResearch);
      
      // Save to localStorage (legacy support)
      localStorage.setItem('askBlocEmail', email);
      
      // Call the unlock function with session ID
      onUnlock(email, sessionId);
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Failed to start session:', error);
      setError('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[500px] rounded-2xl bg-white shadow-2xl z-[10000] border border-gray-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Unlock Ask BlocIQ</h2>
                <p className="text-sm text-gray-600">Your UK leasehold co-pilot</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              Open the brain in the bottom-right to get instant help with block management: draft replies, summarise documents, and spin up contractor works orders — in seconds.
            </p>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>UK leasehold guidance aligned with RICS & TPI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Instant document analysis & compliance dates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Smart suggestions: emails, tasks, works orders</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start gap-3">
              <input
                id="consent"
                type="checkbox"
                checked={agreedToResearch}
                onChange={(e) => setAgreedToResearch(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed">
                I agree to my email and chat queries being stored for research and product improvement.
              </label>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Privacy & Data Protection</p>
                  <p>Your data stays within your BlocIQ account and is handled in line with GDPR. View our{' '}
                    <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                      Privacy Policy
                    </a>.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !agreedToResearch}
              className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Unlocking...' : 'Open Ask BlocIQ'}
            </button>

            {/* Not Now Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl font-medium transition-all duration-200"
            >
              Not now
            </button>

            {/* Free Trial Badge */}
            <div className="text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Free trial available
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
