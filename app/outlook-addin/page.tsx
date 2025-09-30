'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Brain, Zap, Shield, CheckCircle, Sparkles, Clock, BarChart3, MessageSquare, FileText, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import BlocIQLogo from '@/components/BlocIQLogo'

export default function OutlookAddinPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'monthly' | 'annual'>('trial')

  const handleStartTrial = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      // Get the appropriate price ID based on selection
      const priceIds = {
        trial: 'price_outlook_trial', // Replace with your actual Stripe price IDs
        monthly: 'price_outlook_monthly',
        annual: 'price_outlook_annual'
      }

      // For trial, use the simple checkout session
      if (selectedPlan === 'trial') {
        const response = await fetch('/api/stripe/create-checkout-session?product=outlook-addin-trial')
        const data = await response.json()

        if (data.url) {
          window.location.href = data.url
        } else {
          toast.error('Failed to start checkout')
        }
      } else {
        // For paid plans, use the outlook subscription endpoint
        const response = await fetch('/api/stripe/create-outlook-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            priceId: priceIds[selectedPlan],
            successUrl: `${window.location.origin}/outlook-subscription-success`,
            cancelUrl: `${window.location.origin}/outlook-addin`
          }),
        })

        const data = await response.json()

        if (data.url) {
          window.location.href = data.url
        } else {
          toast.error(data.error || 'Failed to create subscription')
        }
      }
    } catch (error) {
      console.error('Error starting trial:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                <BlocIQLogo className="text-white" size={24} />
              </div>
              <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] bg-clip-text text-transparent">
                BlocIQ
              </span>
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2]">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-2xl">
              <Mail className="h-10 w-10 text-white stroke-2" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              BlocIQ Outlook Add-in
            </h1>
            <p className="text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              AI-powered property management, directly in your inbox.
            </p>
            <p className="text-lg text-white/80 mb-12 max-w-2xl mx-auto">
              Transform how you manage properties with intelligent email automation, AI-powered responses, and seamless integration with your existing workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              See It In Action
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Watch how the BlocIQ Outlook Add-in transforms your email workflow
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <video
              controls
              className="w-full"
              poster="/outlook-addin-poster.jpg"
            >
              <source src="/outlook-addin-new-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* What It Is Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What is the BlocIQ Outlook Add-in?
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              The BlocIQ Outlook Add-in brings AI-powered property management directly into Microsoft Outlook.
              Manage communications, automate responses, and access property data without leaving your inbox.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 shadow-lg border border-purple-100">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6 border-2 border-purple-200">
                <Brain className="h-8 w-8 text-purple-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">AI-Powered Responses</h3>
              <p className="text-gray-600">
                Generate professional, context-aware email responses instantly. Choose the right tone and let AI draft the perfect reply.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 shadow-lg border border-blue-100">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-200">
                <Zap className="h-8 w-8 text-blue-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Categorization</h3>
              <p className="text-gray-600">
                Automatically categorize and prioritize incoming emails based on urgency, topic, and sender.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 shadow-lg border border-green-100">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6 border-2 border-green-200">
                <MessageSquare className="h-8 w-8 text-green-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Template Management</h3>
              <p className="text-gray-600">
                Access and use your saved templates directly from Outlook. Create, edit, and manage templates on the fly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl p-8 shadow-lg border border-teal-100">
              <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mb-6 border-2 border-teal-200">
                <CalendarIcon className="h-8 w-8 text-teal-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Calendar Integration</h3>
              <p className="text-gray-600">
                Create events, set reminders, and manage your property calendar without switching applications.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 shadow-lg border border-orange-100">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border-2 border-orange-200">
                <FileText className="h-8 w-8 text-orange-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Document Access</h3>
              <p className="text-gray-600">
                Quick access to building documents, compliance records, and leases directly from email conversations.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-white rounded-2xl p-8 shadow-lg border border-pink-100">
              <div className="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center mb-6 border-2 border-pink-200">
                <Shield className="h-8 w-8 text-pink-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Secure & Compliant</h3>
              <p className="text-gray-600">
                GDPR-compliant, secure, and built for UK property management. All data is encrypted and stored on UK servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes with seamless Outlook integration.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-purple-200">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Up</h3>
              <p className="text-gray-600 text-sm">Start your 30-day free trial with no credit card required</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-200">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Install Add-in</h3>
              <p className="text-gray-600 text-sm">Download from Microsoft AppSource or install directly in Outlook</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-teal-200">
                <span className="text-2xl font-bold text-teal-600">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Connect</h3>
              <p className="text-gray-600 text-sm">Link your BlocIQ account and start using AI features</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-200">
                <span className="text-2xl font-bold text-green-600">4</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Transform</h3>
              <p className="text-gray-600 text-sm">Experience AI-powered property management in your inbox</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start with a 30-day free trial, then choose the plan that works for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Trial */}
            <div className={`bg-white rounded-2xl p-8 shadow-lg border-2 ${selectedPlan === 'trial' ? 'border-[#6A00F5]' : 'border-gray-200'} hover:shadow-xl transition-all cursor-pointer`}
                 onClick={() => setSelectedPlan('trial')}>
              <div className="text-center mb-6">
                <Clock className="h-12 w-12 text-[#6A00F5] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Trial</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">£0</div>
                <p className="text-gray-600">30 days, full access</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">AI-powered email responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Smart categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Template management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Calendar integration</span>
                </li>
              </ul>
            </div>

            {/* Monthly */}
            <div className={`bg-white rounded-2xl p-8 shadow-lg border-2 ${selectedPlan === 'monthly' ? 'border-[#6A00F5]' : 'border-gray-200'} hover:shadow-xl transition-all cursor-pointer`}
                 onClick={() => setSelectedPlan('monthly')}>
              <div className="text-center mb-6">
                <CalendarIcon className="h-12 w-12 text-[#6A00F5] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Monthly</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">£29</div>
                <p className="text-gray-600">per month</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Everything in Free Trial</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Advanced AI features</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Cancel anytime</span>
                </li>
              </ul>
            </div>

            {/* Annual */}
            <div className={`bg-white rounded-2xl p-8 shadow-lg border-2 ${selectedPlan === 'annual' ? 'border-[#6A00F5]' : 'border-gray-200'} hover:shadow-xl transition-all cursor-pointer relative`}
                 onClick={() => setSelectedPlan('annual')}>
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-xl rounded-tr-xl text-sm font-semibold">
                Save 20%
              </div>
              <div className="text-center mb-6">
                <BarChart3 className="h-12 w-12 text-[#6A00F5] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Annual</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">£278</div>
                <p className="text-gray-600">per year (£23.17/mo)</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Everything in Monthly</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">20% discount</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Premium support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Early access to features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <Sparkles className="h-16 w-16 text-[#6A00F5] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to Transform Your Inbox?
              </h2>
              <p className="text-lg text-gray-600">
                Start your 30-day free trial today. No credit card required.
              </p>
            </div>

            <form onSubmit={handleStartTrial} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Selected Plan:</strong> {selectedPlan === 'trial' ? 'Free Trial' : selectedPlan === 'monthly' ? 'Monthly (£29/mo)' : 'Annual (£278/year)'}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedPlan === 'trial'
                    ? 'Start with a 30-day free trial, no credit card required.'
                    : 'Includes 30-day free trial, then billing begins.'
                  }
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Start Free Trial
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}