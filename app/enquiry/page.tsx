'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, Building2, Users, Mail, User, Building } from 'lucide-react';
import Link from 'next/link';
import BlocIQLogo from '@/components/BlocIQLogo';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

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
      <LayoutWithSidebar>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank You for Your Interest!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your enquiry has been prepared. Your email client should open with a pre-filled message to Eleanor. 
              If it doesn't open automatically, please email eleanor.oxley@blociq.co.uk directly.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Homepage
            </Link>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Get Started with BlocIQ
            </h1>
            <p className="text-lg text-gray-600">
              Tell us about your property management needs and we'll get back to you within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-600" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-teal-600" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                placeholder="Enter your email address"
              />
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-teal-600" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                placeholder="Enter your company name"
              />
            </div>

            {/* Blocks Under Management */}
            <div>
              <label htmlFor="blocksUnderManagement" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-600" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                placeholder="e.g., 15 blocks, 500+ units"
              />
            </div>

            {/* Staff Numbers */}
            <div>
              <label htmlFor="staffNumbers" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                placeholder="e.g., 5 property managers, 2 admin staff"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-4 px-6 rounded-lg font-semibold hover:from-teal-700 hover:to-teal-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending Enquiry...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Enquiry
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              By submitting this form, you agree to be contacted by BlocIQ regarding your enquiry. 
              We respect your privacy and will only use your information to respond to your request.
            </p>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
} 