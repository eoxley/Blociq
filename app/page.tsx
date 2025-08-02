import React from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, FileText, Calendar, Shield, Zap, Building2, Users, Home, CheckCircle, Star, MessageSquare, Settings, BarChart3 } from 'lucide-react'
import { Metadata } from 'next'
import BlocIQLogo from '@/components/BlocIQLogo'

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
      {/* Enhanced Navigation */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BlocIQLogo className="text-white" size={40} />
              </div>
              <span className="ml-4 text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BlocIQ</span>
            </div>
            <Link 
              href="/login"
              className="bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:via-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 py-24">
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <div className="mb-6">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-2 animate-fade-in text-center">
                AI-Powered Property Management,{' '}
                <span className="text-teal-200">Reimagined</span>
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-teal-100 mb-10 max-w-4xl mx-auto leading-relaxed">
              BlocIQ helps you stay compliant, work faster, and manage smarter — from inbox to inspection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/login"
                className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Log in to your account
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                href="#features"
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/20"
              >
                Explore Features
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-8 right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-8 left-8 w-24 h-24 bg-white/5 rounded-full"></div>
      </section>



      {/* Enhanced Vision Statement */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Star className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              BlocIQ Vision Statement
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              BlocIQ exists to reimagine property management through compliance intelligence, AI-enhanced workflows, and operational transparency. We&apos;re building the operating system for modern property teams — from prime city blocks to social housing estates.
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced Why BlocIQ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why BlocIQ?
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              BlocIQ is one of the UK&apos;s first AI-powered proptech platforms built specifically for leasehold compliance.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-10 shadow-xl border border-gray-100 mb-12">
            <p className="text-xl text-gray-600 leading-relaxed mb-8 text-center">
              While AI is being rapidly adopted across industries, most property firms are using generic tools like ChatGPT without oversight, data safeguards, or regulatory alignment. That&apos;s a risk — for firms, for clients, and for residents.
            </p>
            <p className="text-xl text-gray-600 leading-relaxed mb-8 text-center">
              At BlocIQ, we do things differently:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">GDPR by design</h3>
                  <p className="text-gray-600">Built with data protection at its core, ensuring compliance with UK and EU regulations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">AI with oversight</h3>
                  <p className="text-gray-600">Human-in-the-loop AI that learns from your team while maintaining control.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Regulatory alignment</h3>
                  <p className="text-gray-600">Built specifically for UK property compliance and leasehold management.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">AI you can trust</h3>
                  <p className="text-gray-600">Regulation-aware, data-secure, and never shared outside BlocIQ.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Powerful Features for Modern Property Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage properties efficiently, stay compliant, and provide exceptional service
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* AI Inbox Assistant */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                AI Inbox Assistant
              </h3>
              <div className="text-3xl mb-4">🤖</div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Automatically categorize, prioritize, and draft responses to resident emails using AI trained on property management best practices.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Smart email categorization</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Auto-draft responses</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Priority flagging</span>
                </div>
              </div>
            </div>

            {/* Compliance & Documents */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Compliance & Documents 📂
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Track compliance deadlines, store documents securely, and maintain audit trails for all your property requirements.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automated deadline tracking</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Secure document storage</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Instant AI document location</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Audit trail maintenance</span>
                </div>
              </div>
            </div>

            {/* Portfolio Calendar & Events */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Portfolio Calendar & Events 📅
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage inspections, maintenance schedules, and property events with intelligent scheduling and automated reminders.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Intelligent scheduling</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automated reminders</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Event management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm shadow-lg">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Property Management?
          </h2>
          <Link 
            href="/enquiry"
            className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-10 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started Today
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <BlocIQLogo className="text-white" size={40} />
              </div>
              <span className="ml-4 text-4xl font-extrabold bg-gradient-to-r from-[#0d9488] to-[#14b8a6] bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BlocIQ</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 BlocIQ. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

