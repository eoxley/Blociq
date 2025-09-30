'use client'

import React, { useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import AskBlocIQModal from './AskBlocIQModal'

export default function AskBlocIQSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      {/* AskBlocIQ AI */}
      <div className="bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl p-8 text-white md:col-span-2 lg:col-span-3">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mr-4 shadow-2xl backdrop-blur-sm">
              <Brain className="h-8 w-8 text-white stroke-2" />
            </div>
            <h3 className="text-2xl font-bold">AskBlocIQ AI</h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white text-[#6A00F5] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Sparkles className="h-5 w-5" />
            Try It Now
          </button>
        </div>
        <p className="text-white/90 mb-4 text-lg">
          The intelligence layer that ties it all together.
        </p>
        <p className="text-white/80 mb-6">
          AskBlocIQ is your secure AI assistant built specifically for UK leasehold property management. Embedded across communications, compliance, finance, and documents, it understands your questions and provides instant, intelligent answers.
        </p>

        <div className="space-y-4 mb-6">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h4 className="text-white font-semibold mb-2">How It Works</h4>
            <p className="text-white/80 text-sm">
              AskBlocIQ connects to your property data within BlocIQ and uses advanced AI to understand context and provide accurate answers. It works seamlessly within the main application and through our Outlook Add-in, so you can get answers wherever you work.
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h4 className="text-white font-semibold mb-2">Safe & Secure</h4>
            <p className="text-white/80 text-sm">
              All data is GDPR-compliant, ring-fenced, and stored securely on UK-based servers. Your information stays private and is never shared with third parties. Every conversation is confidential and fully encrypted.
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h4 className="text-white font-semibold mb-2">Integrated Everywhere</h4>
            <p className="text-white/80 text-sm">
              Access AskBlocIQ directly in the BlocIQ platform or from Microsoft Outlook with our Add-in. Get instant answers about compliance deadlines, financial summaries, document searches, and more — without leaving your inbox.
            </p>
          </div>
        </div>

        <p className="text-white/80 mb-4 font-medium">Try asking:</p>
        <div className="grid md:grid-cols-3 gap-4 text-white/80">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm">"What's our compliance status for Ashwood House?"</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm">"Show overdue invoices over £500."</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm">"Draft a Section 20 notice for a lift replacement."</p>
          </div>
        </div>
      </div>

      <AskBlocIQModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}