"use client";

import React, { useState } from 'react';
import { X, Mail, Lock, Shield, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface EmailConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (email: string) => void;
}

export default function EmailConsentModal({ isOpen, onClose, onUnlock }: EmailConsentModalProps) {
  const [email, setEmail] = useState('');
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!agreedToConsent) {
      toast.error('Please agree to the terms to continue');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Store email and consent in localStorage
      localStorage.setItem('askBlocEmail', email);
      localStorage.setItem('askBlocConsent', 'true');
      localStorage.setItem('askBlocConsentDate', new Date().toISOString());

      toast.success('Welcome to BlocIQ!');
      onUnlock(email);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Unlock Ask BlocIQ</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Enter your email to start using Ask BlocIQ and experience AI-powered property management.
            </p>
            
            {/* Email Input */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="mb-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToConsent}
                  onChange={(e) => setAgreedToConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <span className="text-sm text-gray-700">
                  I agree to my email and chat queries being stored for research and product improvement.
                </span>
              </label>
            </div>

            {/* Disclaimer */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  We do not share your data. View our{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  <span>Unlock Chat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
