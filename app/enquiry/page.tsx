'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, Building2, Users, Mail, User, Building, Brain } from 'lucide-react';
import Link from 'next/link';
import BlocIQLogo from '@/components/BlocIQLogo';

export default function EnquiryPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    blocksUnderManagement: '',
    staffNumbers: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create mailto link with form data
      const subject = 'BlocIQ Enquiry - New Property Management Lead';
      const body = `
Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company}
Blocks Under Management: ${formData.blocksUnderManagement}
Staff Numbers: ${formData.staffNumbers}

This enquiry was submitted through the BlocIQ landing page.
      `.trim();

      const mailtoLink = `mailto:eleanor.oxley@blociq.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Open email client
      window.location.href = mailtoLink;
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9]">
        {/* Header with BlocIQ Logo */}
        <div className="bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 text-white p-6">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30 mr-4">
              <BlocIQLogo size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BlocIQ</h1>
              <p className="text-white/90 text-sm">Property Management Platform</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Send className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 bg-clip-text text-transparent mb-6">
              Thank You for Your Interest!
            </h1>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Your enquiry has been prepared. Your email client should open with a pre-filled message to Eleanor. 
              If it doesn't open automatically, please email <span className="font-medium text-teal-600">eleanor.oxley@blociq.co.uk</span> directly.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 text-white px-8 py-4 rounded-2xl transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#f1f5f9]">
      {/* Header with BlocIQ Logo */}
      <div className="bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 text-white p-6">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30 mr-4">
            <BlocIQLogo size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">BlocIQ</h1>
            <p className="text-white/90 text-sm">Property Management Platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 bg-clip-text text-transparent mb-6">
              Book Your Demo
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
              Discover how BlocIQ's AI-powered platform transforms property management. 
              Tell us about your needs and we'll show you exactly how we can help.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    Full Name *
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg shadow-sm hover:shadow-md"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    Email Address *
                  </div>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg shadow-sm hover:shadow-md"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-semibold text-gray-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Building className="h-4 w-4 text-white" />
                  </div>
                  Company Name *
                </div>
              </label>
              <input
                type="text"
                id="company"
                name="company"
                required
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg shadow-sm hover:shadow-md"
                placeholder="Enter your company name"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Blocks Under Management */}
              <div>
                <label htmlFor="blocksUnderManagement" className="block text-sm font-semibold text-gray-800 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    Blocks Under Management *
                  </div>
                </label>
                <input
                  type="text"
                  id="blocksUnderManagement"
                  name="blocksUnderManagement"
                  required
                  value={formData.blocksUnderManagement}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg shadow-sm hover:shadow-md"
                  placeholder="e.g., 15 blocks, 500+ units"
                />
              </div>

              {/* Staff Numbers */}
              <div>
                <label htmlFor="staffNumbers" className="block text-sm font-semibold text-gray-800 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    Staff Numbers *
                  </div>
                </label>
                <input
                  type="text"
                  id="staffNumbers"
                  name="staffNumbers"
                  required
                  value={formData.staffNumbers}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg shadow-sm hover:shadow-md"
                  placeholder="e.g., 5 property managers, 2 admin staff"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 text-white py-5 px-8 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending Your Demo Request...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Send className="h-6 w-6" />
                    Book My Demo Now
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-gradient-to-r from-pink-500 via-teal-500 to-blue-500 border-opacity-20">
            <div className="text-center space-y-4">
              <p className="text-gray-600 leading-relaxed">
                By submitting this form, you agree to be contacted by BlocIQ regarding your demo request.
              </p>
              <p className="text-sm text-gray-500">
                🔒 We respect your privacy and will only use your information to schedule your personalized demo.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center py-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
} 