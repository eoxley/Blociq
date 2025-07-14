import React from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, FileText, Calendar, Shield, Users, Zap, CheckCircle } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BlocIQ | AI-Powered Property Management',
  description: 'BlocIQ helps you stay compliant, work faster, and manage smarter — from inbox to inspection. AI-powered property management reimagined.',
  keywords: 'property management, AI, compliance, housing, real estate, property software',
  openGraph: {
    title: 'BlocIQ | AI-Powered Property Management',
    description: 'BlocIQ helps you stay compliant, work faster, and manage smarter — from inbox to inspection.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">BlocIQ</span>
            </div>
            <Link 
              href="/login"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Property Management,{' '}
              <span className="text-teal-600">Reimagined</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              BlocIQ helps you stay compliant, work faster, and manage smarter — from inbox to inspection.
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg"
            >
              Log in to your account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Vision Statement */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              BlocIQ Vision Statement
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              BlocIQ exists to reimagine property management through compliance intelligence, AI-enhanced workflows, and operational transparency. We're building the operating system for modern property teams — from prime city blocks to social housing estates.
            </p>
          </div>
        </div>
      </section>

      {/* Why BlocIQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why BlocIQ?
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              BlocIQ is one of the UK's first AI-powered proptech platforms built specifically for leasehold compliance.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-8">
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              While AI is being rapidly adopted across industries, most property firms are using generic tools like ChatGPT without oversight, data safeguards, or regulatory alignment. That's a risk — for firms, for clients, and for residents.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              At BlocIQ, we do things differently:
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">GDPR by design</h3>
                  <p className="text-gray-600">UK data stays secure, with every interaction traceable and compliant</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏢</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Built for UK property law</h3>
                  <p className="text-gray-600">From the Building Safety Act to leaseholder rights</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">AI with governance</h3>
                  <p className="text-gray-600">No black-box answers, only transparent and legally-aligned outputs</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-lg text-gray-600 leading-relaxed font-medium">
                BlocIQ isn't just another AI tool — it's a purpose-built assistant for professional property managers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What BlocIQ Does */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What BlocIQ Does
            </h2>
            <p className="text-lg text-gray-600">
              Three powerful tools that transform how you manage properties
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* AI Inbox Assistant */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  AI Inbox Assistant 🤖
                </h3>
                <p className="text-gray-600">
                  Automatically categorize, prioritize, and draft responses to resident emails using AI trained on property management best practices.
                </p>
              </div>
            </div>

            {/* Compliance & Documents */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Compliance & Documents 📂
                </h3>
                <p className="text-gray-600">
                  Track compliance deadlines, store documents securely, and maintain audit trails for all your property requirements.
                </p>
              </div>
            </div>

            {/* Portfolio Calendar & Events */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Portfolio Calendar & Events 📅
                </h3>
                <p className="text-gray-600">
                  Manage inspections, maintenance schedules, and important deadlines across your entire property portfolio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Model Summary */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Purpose-Built AI — Trained for Property, Tailored to You
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              BlocIQ's AI is pre-trained on property management logic, regulations, and best practices. It dynamically adapts to your specific portfolio using real-time data from Supabase, ensuring every recommendation and response is contextually relevant to your buildings, lease terms, and compliance requirements.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Property-Trained</h3>
              <p className="text-sm text-gray-600">Built on property management knowledge and regulations</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Dynamic Adaptation</h3>
              <p className="text-sm text-gray-600">Learns from your portfolio and building context</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Compliance-Aware</h3>
              <p className="text-sm text-gray-600">Understands legal requirements and deadlines</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Housing Impact */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Improving Lives Through Better Buildings
          </h2>
          <p className="text-xl text-teal-100 leading-relaxed">
            BlocIQ's subsidised rollout strategy for housing associations to improve safety and response times. We believe everyone deserves safe, well-managed homes, regardless of income.
          </p>
        </div>
      </section>

      {/* Industry Problem */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Fixing an Industry Full of Friction
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Property management is broken. Here's what we're fixing:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Fragmented Tools</h3>
                  <p className="text-gray-600 text-sm">Multiple disconnected systems that don't talk to each other</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Lack of Transparency</h3>
                  <p className="text-gray-600 text-sm">Residents and stakeholders can't see what's happening</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">GDPR Vulnerabilities</h3>
                  <p className="text-gray-600 text-sm">Sensitive data scattered across insecure systems</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Manual Processes</h3>
                  <p className="text-gray-600 text-sm">Time-consuming tasks that could be automated</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Request Demo Section */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Request a Demo
            </h2>
            <p className="text-lg text-gray-600">
              See BlocIQ in action with a personalized demo
            </p>
          </div>
          
          <div className="text-center">
            <a 
              href="/login"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started with BlocIQ
            </a>
            <p className="text-sm text-gray-500 mt-4">
              Sign in to access your personalized demo
            </p>
          </div>
        </div>
      </section>

      {/* About the Founder */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              About the Founder
            </h2>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
            <div className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                BlocIQ was founded by Eleanor Oxley, a UK-based property manager with years of experience managing complex leasehold blocks, navigating compliance, and wrestling with inefficient systems.
              </p>
              
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Born and bred in London, now based in Kent and working across the capital, Eleanor brings not only deep industry knowledge — but the lived reality of juggling it all.
              </p>
              
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                She's a mum to two brilliant little girls, kept firmly on her toes by a high-energy (and slightly unhinged) cocker spaniel.
              </p>
              
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                After seeing firsthand how outdated processes and unmanaged AI use were putting buildings — and people — at risk, Eleanor built BlocIQ to raise the standard.
              </p>
              
              <p className="text-lg text-gray-700 leading-relaxed font-medium">
                Her mission: Bring AI into the property world the right way — with full governance, UK regulation at its core, and tools that actually help property professionals do their jobs better.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="ml-2 text-xl font-bold">BlocIQ</span>
            </div>
            
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-gray-300 hover:text-white transition-colors">
                Terms
              </a>
              <a href="mailto:eleanor.oxley@blociq.co.uk" className="text-gray-300 hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm">
                © BlocIQ 2025. All rights reserved.
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">
                BlocIQ Ltd<br />
                Registered in England & Wales: Company No. 16533839<br />
                Registered Office: 3 Cliveden Court, The Broadway, TN3 8DA
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Google Analytics Placeholder */}
      {/* 
      <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');
      </script>
      */}
    </div>
  )
}