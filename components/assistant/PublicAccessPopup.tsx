"use client";

import React, { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PublicAccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (email: string) => void;
}

export default function PublicAccessPopup({ isOpen, onClose, onUnlock }: PublicAccessPopupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToResearch, setAgreedToResearch] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!agreedToResearch) {
      toast.error('Please agree to the terms to continue');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate a brief delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onUnlock(email.trim());
      toast.success('Welcome to AskBlocIQ! 🚀');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="rounded-xl bg-white p-6 max-w-lg mx-auto shadow-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">🚀 Try AskBlocIQ Today</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-gray-600 mb-6">
          Enter your email to unlock the chat assistant and see how BlocIQ works.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="research-consent"
              type="checkbox"
              checked={agreedToResearch}
              onChange={(e) => setAgreedToResearch(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="research-consent" className="text-sm text-gray-600">
              I agree to my queries being used for research and product improvement
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !agreedToResearch}
            className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white py-3 px-6 rounded-lg font-medium hover:from-[#4338ca] hover:to-[#9333ea] disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Unlocking...
              </div>
            ) : (
              'Unlock AskBlocIQ'
            )}
          </button>
        </form>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your queries may be stored anonymously for product improvement. We do not share your data.{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
            View our Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
