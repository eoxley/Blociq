"use client";

import React from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Mail, Download } from 'lucide-react';
import BlocIQLogo from '@/components/BlocIQLogo';

export default function OutlookTrialSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                <BlocIQLogo className="text-white" size={24} />
              </div>
              <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] bg-clip-text text-transparent">
                BlocIQ
              </span>
            </div>
            <Link 
              href="/login"
              className="bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-6 py-2 rounded-lg hover:from-[#5A00E5] hover:to-[#7A2BE2] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Success Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your 30-Day Free Trial!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You're all set to experience BlocIQ Outlook Add-in. Your trial starts now and includes full access to all features.
          </p>
        </div>

        {/* Setup Steps */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Get Started in 3 Easy Steps
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Download the Add-in</h3>
              <p className="text-gray-600 text-sm">
                Install the BlocIQ Outlook add-in from the Microsoft AppSource store.
              </p>
              <button className="mt-4 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-6 py-2 rounded-lg hover:from-[#5A00E5] hover:to-[#7A2BE2] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Download className="h-4 w-4 inline mr-2" />
                Download Now
              </button>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to BlocIQ</h3>
              <p className="text-gray-600 text-sm">
                Use your email address to sign in and activate your trial account.
              </p>
              <Link 
                href="/login"
                className="mt-4 inline-block bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-6 py-2 rounded-lg hover:from-[#5A00E5] hover:to-[#7A2BE2] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign In
              </Link>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Using AI</h3>
              <p className="text-gray-600 text-sm">
                Open Outlook and start asking AI questions about property management.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                <Mail className="h-4 w-4 inline mr-1" />
                Available in Outlook
              </div>
            </div>
          </div>
        </div>

        {/* Trial Details */}
        <div className="bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl p-8 text-white mb-8">
          <h3 className="text-2xl font-bold mb-4">Your Trial Includes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>Full AI assistant access</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>Compliance guidance</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>Document analysis</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>Priority email support</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>UK leasehold expertise</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span>No setup fees</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Questions about your trial? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/enquiry"
              className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 text-[#6A00F5] px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-[#6A00F5]"
            >
              Contact Support
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="/login"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Access Your Account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
