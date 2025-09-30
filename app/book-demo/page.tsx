'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Mail, Building2, User, Phone, MessageSquare, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import BlocIQLogo from '@/components/BlocIQLogo'

export default function BookDemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    numberOfBuildings: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Send email via API
      const response = await fetch('/api/send-demo-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'eleanor.oxley@blociq.co.uk',
          ...formData
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        toast.success('Demo request sent successfully!')
      } else {
        toast.error('Failed to send demo request. Please try again.')
      }
    } catch (error) {
      console.error('Error sending demo request:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center border border-gray-200">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-lg text-gray-600 mb-8">
            Your demo request has been received. We'll be in touch shortly to schedule your personalized demo of BlocIQ.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header Section */}
          <div className="bg-white border-b border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Demo</h1>
            <p className="text-xl text-gray-600">
              See how BlocIQ transforms property management
            </p>
          </div>

          {/* Form Section */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                  placeholder="John Smith"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                  placeholder="john.smith@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                  placeholder="+44 20 1234 5678"
                />
              </div>

              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Building2 className="inline h-4 w-4 mr-2" />
                  Company Name *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                  placeholder="Property Management Ltd"
                />
              </div>

              {/* Number of Buildings */}
              <div>
                <label htmlFor="numberOfBuildings" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Building2 className="inline h-4 w-4 mr-2" />
                  Number of Buildings Under Management
                </label>
                <select
                  id="numberOfBuildings"
                  name="numberOfBuildings"
                  value={formData.numberOfBuildings}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all"
                >
                  <option value="">Select range</option>
                  <option value="1-5">1-5 buildings</option>
                  <option value="6-20">6-20 buildings</option>
                  <option value="21-50">21-50 buildings</option>
                  <option value="51-100">51-100 buildings</option>
                  <option value="100+">100+ buildings</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  <MessageSquare className="inline h-4 w-4 mr-2" />
                  Tell us about your needs (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6A00F5] focus:border-transparent transition-all resize-none"
                  placeholder="What features are you most interested in? What challenges are you facing?"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5" />
                    Request Demo
                  </>
                )}
              </button>

              <p className="text-sm text-gray-500 text-center">
                We'll get back to you within 24 hours to schedule your personalized demo.
              </p>
            </form>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Personalized Demo</h3>
            <p className="text-gray-600 text-sm">
              See BlocIQ tailored to your specific needs and portfolio size
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Expert Guidance</h3>
            <p className="text-gray-600 text-sm">
              Get answers to your questions from our property management experts
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Commitment</h3>
            <p className="text-gray-600 text-sm">
              Learn about BlocIQ with no pressure or obligation to purchase
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}