"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Brain, FileText, Calendar, Shield, Zap, Building2, Users, Home, CheckCircle, Star, MessageSquare, Settings, BarChart3, Mail, Lock, Eye, Heart } from 'lucide-react';
import BlocIQLogo from '@/components/BlocIQLogo';

export default function LandingPage() {
  const featuresRef = useRef<HTMLElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Navigation */}
      <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
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
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/pricing" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                Pricing
              </Link>
              <Link href="/onboarding" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                Onboarding
              </Link>
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

      {/* Hero Section */}
      <section className="hero-banner relative overflow-hidden py-16 mx-6" style={{ background: 'linear-gradient(135deg, #6A00F5 0%, #7A2BE2 50%, #8A2BE2 100%)' }}>
        {/* Abstract background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-2xl"></div>
        </div>
        
        <div className="max-w-none mx-auto px-6">
          <div className="text-center text-white">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in text-center">
                AI-Powered Property Management,{' '}
                <span className="text-teal-200">Reimagined</span>
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed">
              BlocIQ helps property managers stay compliant, work faster, and deliver better service — from inbox to inspection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/pricing"
                className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get started today
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button 
                onClick={scrollToFeatures}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/20"
              >
                Explore Features
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Vision & Why BlocIQ */}
      <section className="hero-banner py-16 mx-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Our Vision */}
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Star className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Our Vision
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
              BlocIQ exists to transform property management through compliance intelligence, AI-enhanced workflows, and operational transparency.
            </p>
          </div>

          {/* Why BlocIQ */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why BlocIQ?
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              BlocIQ is among the UK's earliest AI-powered proptech platforms purpose-built for leasehold compliance.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-10 shadow-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">GDPR by design</h3>
                  <p className="text-gray-600">Built with data protection at its core, ensuring compliance with UK and EU regulations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">AI with oversight</h3>
                  <p className="text-gray-600">Human-in-the-loop AI that learns from your team while maintaining control.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Regulatory alignment</h3>
                  <p className="text-gray-600">Built specifically for UK property compliance and leasehold management.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="h-6 w-6 text-white" />
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

      {/* Section 2: Features That Make the Difference */}
      <section ref={featuresRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Features That Make the Difference
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage properties efficiently, stay compliant, and provide exceptional service
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Inbox Assistant */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                AI Inbox Assistant 🤖
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Automatically categorize, prioritize, and draft responses to resident emails using AI trained on property management best practices.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Smart email categorization</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Auto-draft responses</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Priority flagging</span>
                </div>
              </div>
            </div>

            {/* Compliance & Document Hub */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Compliance & Document Hub 📂
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Track compliance deadlines, store documents securely, and maintain audit trails for all your property requirements.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automated deadline tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Secure document storage</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Instant AI document location</span>
                </div>
              </div>
            </div>

            {/* Portfolio Calendar & Events */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Portfolio Calendar & Events 📅
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage inspections, maintenance schedules, and property events with intelligent scheduling and automated reminders.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Intelligent scheduling</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automated reminders</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Event management</span>
                </div>
              </div>
            </div>

            {/* UK-Based AI Assistant */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                UK-Based AI Assistant 🧠
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Get instant answers to property management questions with AI trained specifically on UK leasehold law and regulations.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>UK leasehold expertise</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Regulatory guidance</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>24/7 availability</span>
                </div>
              </div>
            </div>

            {/* Agency-Wide Document Vault */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Agency-Wide Document Vault 📂
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Centralized document storage with AI-powered search and organization across your entire property portfolio.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Centralized storage</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>AI-powered search</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Secure access control</span>
                </div>
              </div>
            </div>

            {/* Communication & Logging */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Communication & Logging 📨
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Track all communications with residents, contractors, and stakeholders with automated logging and audit trails.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Automated logging</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Audit trails</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Communication templates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How We Work */}
      <section className="hero-banner py-16 mx-6" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              How We Work
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get up and running with BlocIQ in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Simple Setup</h3>
              <p className="text-gray-600">Onboarding call, upload docs, and we'll handle the rest.</p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">We Do the Heavy Lifting</h3>
              <p className="text-gray-600">Data import and Outlook sync completed by our team.</p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Training That Fits</h3>
              <p className="text-gray-600">Short session, simple UI, and you're ready to go.</p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Go Live</h3>
              <p className="text-gray-600">All-in-one platform, no more spreadsheets.</p>
            </div>
          </div>

          <div className="text-center mt-16">
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 max-w-4xl mx-auto">
              <p className="text-xl text-gray-600 leading-relaxed">
                No more spreadsheets. No more filing cabinets. No more inbox chaos. BlocIQ gives you a complete, compliant, connected portfolio — from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Narrative */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
              Why We Exist
            </h2>
            <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
              <p>
                The property management industry faces unprecedented challenges: BSA regulations, post-Grenfell compliance requirements, and increasing fines for non-compliance.
              </p>
              <p>
                Meanwhile, property managers are experiencing burnout and staff shortages, struggling to keep up with the administrative burden while maintaining service quality.
              </p>
              <p>
                BlocIQ was built to solve these problems. We provide a safe, modern, and supportive platform that reduces admin, strengthens compliance, and improves transparency — all while making property management more human.
              </p>
            </div>
          </div>
          
          {/* About the Founder Section */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                About the Founder
              </h3>
              <h4 className="text-xl font-semibold text-[#6A00F5] mb-8">
                Ellie Oxley — Founder of BlocIQ
              </h4>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                <p>
                  Ellie has spent over 10 years working in property management, balancing the non-stop demands of block management with life as a mum of two — and, in her own words, "just a normal overstimulated human."
                </p>
                
                <p>
                  She has lived the pressures of the job:
                </p>
                
                <ul className="space-y-3 ml-6">
                  <li className="flex items-start">
                    <span className="text-[#6A00F5] mr-3 mt-2">•</span>
                    <span>Inboxes overflowing with urgent requests.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#6A00F5] mr-3 mt-2">•</span>
                    <span>Constantly changing legislation, from service charge rules to the Building Safety Act.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#6A00F5] mr-3 mt-2">•</span>
                    <span>Always striving to provide a better service to her clients despite these challenges.</span>
                  </li>
                </ul>
                
                <p>
                  Recognising that the industry must embrace change and evolve, Ellie developed a passion for AI technology and software development — realising it could finally provide the support that property managers have always lacked.
                </p>
                
                <blockquote className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-[#6A00F5] pl-6 py-4 italic text-gray-700">
                  "I built BlocIQ because I've lived the challenges. Managers deserve better tools — not more spreadsheets. With BlocIQ, we can protect residents, support staff, and finally bring property management into the modern age."
                </blockquote>
                
                <p>
                  BlocIQ is the result: a platform created by someone still working in the trenches, who understands both the human side of management and the power of technology to transform it.
                </p>
              </div>
              
              <div className="flex justify-center lg:justify-end">
                <div className="w-80 h-80 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-full flex items-center justify-center shadow-2xl overflow-hidden">
                  <Image
                    src="/assets/ellie-oxley-headshot.png"
                    alt="Ellie Oxley - Founder of BlocIQ"
                    width={320}
                    height={320}
                    className="w-full h-full object-cover rounded-full"
                    priority
                    style={{ objectPosition: 'center 20%' }}
                    onError={(e) => {
                      console.error('Image failed to load:', e);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: CTA */}
      <section className="hero-banner py-16 mx-6" style={{ background: 'linear-gradient(135deg, #6A00F5 0%, #8A2BE2 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm shadow-lg">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto">
            BlocIQ reduces admin, strengthens compliance, and improves transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/enquiry"
              className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="/pricing"
              className="inline-flex items-center gap-3 bg-white text-[#6A00F5] hover:bg-gray-100 px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Get Started Today
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center">
                  <BlocIQLogo className="text-white" size={24} />
                </div>
                <span className="ml-3 text-2xl font-bold text-white">BlocIQ</span>
              </div>
              <p className="text-gray-400 mb-4">
                BlocIQ Ltd — Company No. 16533839 — Registered in England and Wales.
              </p>
              <p className="text-gray-400 text-sm">
                Registered office: 3 Cliveden Court, The Broadway, Lamberhurst TN3 8DA.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/onboarding" className="text-gray-400 hover:text-white transition-colors">Onboarding</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">Cookies</Link></li>
                <li><Link href="/accessibility" className="text-gray-400 hover:text-white transition-colors">Accessibility</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Log in</Link></li>
                <li><Link href="/enquiry" className="text-gray-400 hover:text-white transition-colors">Book a Demo</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 BlocIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

