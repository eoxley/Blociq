'use client'

import React, { useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import AskBlocIQModal from './AskBlocIQModal'

export default function AskBlocIQSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      {/* AskBlocIQ AI */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-3">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <Brain className="h-8 w-8 text-white stroke-2" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">AskBlocIQ AI</h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Sparkles className="h-5 w-5" />
            Try It Now
          </button>
        </div>
        <p className="text-gray-600 mb-4 text-lg font-medium">
          The intelligence layer that ties it all together.
        </p>
        <p className="text-gray-600 mb-6">
          AskBlocIQ is your secure AI assistant built specifically for UK leasehold property management. Embedded across communications, compliance, finance, and documents, it understands your questions and provides instant, intelligent answers.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h4 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              How It Works
            </h4>
            <p className="text-gray-600 text-sm">
              AskBlocIQ connects to your property data within BlocIQ and uses advanced AI to understand context and provide accurate answers. It works seamlessly within the main application and through our Outlook Add-in, so you can get answers wherever you work.
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h4 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Safe & Secure
            </h4>
            <p className="text-gray-600 text-sm">
              All data is GDPR-compliant, ring-fenced, and stored securely on UK-based servers. Your information stays private and is never shared with third parties. Every conversation is confidential and fully encrypted.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Integrated Everywhere
            </h4>
            <p className="text-gray-600 text-sm">
              Access AskBlocIQ directly in the BlocIQ platform or from Microsoft Outlook with our Add-in. Get instant answers about compliance deadlines, financial summaries, document searches, and more — without leaving your inbox.
            </p>
          </div>
        </div>

      </div>

      <AskBlocIQModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}