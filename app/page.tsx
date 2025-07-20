import React from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, FileText, Calendar, Shield, Zap, Building2, Users, Home } from 'lucide-react'
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
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
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
              BlocIQ exists to reimagine property management through compliance intelligence, AI-enhanced workflows, and operational transparency. We&apos;re building the operating system for modern property teams — from prime city blocks to social housing estates.
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
              BlocIQ is one of the UK&apos;s first AI-powered proptech platforms built specifically for leasehold compliance.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-8">
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              While AI is being rapidly adopted across industries, most property firms are using generic tools like ChatGPT without oversight, data safeguards, or regulatory alignment. That&apos;s a risk — for firms, for clients, and for residents.
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
                BlocIQ isn&apos;t just another AI tool — it&apos;s a purpose-built assistant for professional property managers.
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

      {/* Building Summary Showcase */}
      <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-6">
              <Building2 className="h-4 w-4" />
              Building Intelligence Platform
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 via-teal-800 to-blue-800 bg-clip-text text-transparent">
              Complete Building Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get a comprehensive overview of every building in your portfolio with AI-powered insights and real-time data
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Enhanced Building Summary Card */}
            <div className="space-y-8">
              <div className="group bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-3xl">
                {/* Enhanced Building Header */}
                <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 p-8 text-white overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-bold">Ashwood House</h3>
                            <p className="text-teal-100 text-lg">123 Ashwood Street, London, SW1A 1AA</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold">24</div>
                        <div className="text-teal-100 text-sm font-medium">Total Units</div>
                      </div>
                    </div>
                    
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="text-2xl font-bold">22</div>
                        <div className="text-teal-100 text-xs">Occupied</div>
                      </div>
                      <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="text-2xl font-bold">2</div>
                        <div className="text-teal-100 text-xs">Available</div>
                      </div>
                      <div className="text-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="text-2xl font-bold">98%</div>
                        <div className="text-teal-100 text-xs">Occupancy</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Building Stats */}
                <div className="p-8">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="group cursor-pointer">
                      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 transition-all duration-300 hover:shadow-lg hover:scale-105">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                          <Users className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="text-3xl font-bold text-green-700 mb-1">22</div>
                        <div className="text-sm text-green-600 font-medium">With Leaseholders</div>
                      </div>
                    </div>
                    <div className="group cursor-pointer">
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl border border-blue-200 transition-all duration-300 hover:shadow-lg hover:scale-105">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                          <Home className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-blue-700 mb-1">22</div>
                        <div className="text-sm text-blue-600 font-medium">Currently Occupied</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Compliance Status */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-teal-600" />
                      </div>
                      Compliance Status
                    </h4>
                    <div className="space-y-3">
                      <div className="group cursor-pointer">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-md hover:border-green-300">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-gray-800">Fire Safety</span>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200">Compliant</span>
                        </div>
                      </div>
                      <div className="group cursor-pointer">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-md hover:border-green-300">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-gray-800">Asbestos Status</span>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200">Clear</span>
                        </div>
                      </div>
                      <div className="group cursor-pointer">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-md hover:border-yellow-300">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-gray-800">Energy Rating</span>
                          </div>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full border border-yellow-200">C</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-teal-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                      View Full Building Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Enhanced Features List */}
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  <Zap className="h-4 w-4" />
                  AI-Powered Features
                </div>
                <h3 className="text-3xl font-bold text-gray-900 leading-tight">
                  Everything You Need to Know
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  BlocIQ provides comprehensive building intelligence with real-time data, compliance tracking, and AI-powered insights.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="group cursor-pointer">
                  <div className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-teal-300 hover:scale-105">
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:from-teal-200 group-hover:to-teal-300 transition-all duration-300">
                      <Building2 className="h-7 w-7 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Building Structure & Legal Setup</h4>
                      <p className="text-gray-600 leading-relaxed">Complete freeholder/RMC tripartite lease information with client details and operational notes</p>
                    </div>
                  </div>
                </div>
                
                <div className="group cursor-pointer">
                  <div className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:scale-105">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                      <Users className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Unit & Leaseholder Management</h4>
                      <p className="text-gray-600 leading-relaxed">Detailed unit information with leaseholder contacts, occupier details, and rent information</p>
                    </div>
                  </div>
                </div>
                
                <div className="group cursor-pointer">
                  <div className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-green-300 hover:scale-105">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                      <Shield className="h-7 w-7 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Compliance & Safety Tracking</h4>
                      <p className="text-gray-600 leading-relaxed">Real-time compliance status, safety certificates, and automated deadline tracking</p>
                    </div>
                  </div>
                </div>
                
                <div className="group cursor-pointer">
                  <div className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:scale-105">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300">
                      <Calendar className="h-7 w-7 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Events & Maintenance</h4>
                      <p className="text-gray-600 leading-relaxed">Scheduled inspections, maintenance events, and important deadlines across your portfolio</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 p-8 rounded-2xl border border-teal-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-xl">AI-Powered Insights</h4>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Get instant summaries, compliance alerts, and intelligent recommendations for every building in your portfolio.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-teal-600 font-medium">
                    <span>Learn more</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
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
              BlocIQ&apos;s AI is pre-trained on property management logic, regulations, and best practices. It dynamically adapts to your specific portfolio using real-time data from Supabase, ensuring every recommendation and response is contextually relevant to your buildings, lease terms, and compliance requirements.
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
            BlocIQ&apos;s subsidised rollout strategy for housing associations to improve safety and response times. We believe everyone deserves safe, well-managed homes, regardless of income.
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
              Property management is broken. Here&apos;s what we&apos;re fixing:
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
                  <p className="text-gray-600 text-sm">Multiple disconnected systems that don&apos;t talk to each other</p>
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
                  <p className="text-gray-600 text-sm">Residents and stakeholders can&apos;t see what&apos;s happening</p>
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
                She&apos;s a mum to two brilliant little girls, kept firmly on her toes by a high-energy (and slightly unhinged) cocker spaniel.
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
              <a href="/privacy" className="text-gray-300 hover:text-white transition-colors">
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
