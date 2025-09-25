"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Brain, FileText, Calendar, Shield, Zap, Building2, Users, Home, CheckCircle, Star, MessageSquare, Settings, BarChart3, Mail, Lock, Eye, Heart, Play, X } from 'lucide-react';
import BlocIQLogo from '@/components/BlocIQLogo';
import PublicAskBlocIQ from '@/components/PublicAskBlocIQ';

export default function LandingPage() {
  const featuresRef = useRef<HTMLElement>(null);
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [showAskBlocIQ, setShowAskBlocIQ] = useState(false);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Show AI chat popup after a short delay when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAIPopup(true);
    }, 2500); // Show after 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  const closeAIPopup = () => {
    setShowAIPopup(false);
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
              <Link href="/technical-bits" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                Technical Bits
              </Link>
              {/* Temporarily disabled - Pricing and Onboarding pages */}
              {/* <Link href="/pricing" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                Pricing
              </Link>
              <Link href="/onboarding" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                Onboarding
              </Link> */}
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
                href="/login"
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

      {/* BlocIQ Platform Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              BlocIQ Platform
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto mb-8">
              A comprehensive property management platform designed specifically for UK leasehold compliance.
              From document management to AI-powered assistance, BlocIQ transforms how you manage your property portfolio.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Platform Features */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Everything You Need in One Platform
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">Compliance Management:</span>
                      <span className="text-gray-600 ml-1">Track deadlines, manage certificates, and stay on top of regulations</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">AI-Powered Assistant:</span>
                      <span className="text-gray-600 ml-1">Get instant answers on UK leasehold law and property regulations</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">Document Vault:</span>
                      <span className="text-gray-600 ml-1">Centralized, secure storage with AI-powered search and organization</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">Portfolio Calendar:</span>
                      <span className="text-gray-600 ml-1">Manage inspections, maintenance, and events across all properties</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">Communication Hub:</span>
                      <span className="text-gray-600 ml-1">Track all communications with automated logging and audit trails</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900">Outlook Integration:</span>
                      <span className="text-gray-600 ml-1">Work directly from your inbox with our powerful Outlook add-in</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Video Section */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 shadow-2xl">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-white mb-2">See BlocIQ in Action</h4>
                <p className="text-gray-300 text-sm">Watch how BlocIQ transforms property management workflows</p>
              </div>
              <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden relative">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0zNjAgMjAwTDQ0MCAyNjBMMzYwIDMyMFYyMDBaIiBmaWxsPSIjNkEwMEY1Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMzgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiPkJsb2NJUSBEZW1vIFZpZGVvPC90ZXh0Pgo8L3N2Zz4="
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-full bg-gray-800 text-white"><p>Video temporarily unavailable</p></div>';
                    }
                  }}
                >
                  <source src="/demo-video.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>

          {/* Platform Benefits */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Built for Property Management Professionals
              </h3>
              <p className="text-gray-600 max-w-3xl mx-auto">
                Every feature is designed with real property managers in mind, combining regulatory expertise with modern technology
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Compliance-First</h4>
                <p className="text-sm text-gray-600">Built specifically for UK leasehold regulations and Building Safety Act requirements</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Team-Friendly</h4>
                <p className="text-sm text-gray-600">Intuitive design that works for both tech-savvy users and those new to digital tools</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Always Improving</h4>
                <p className="text-sm text-gray-600">Regular updates with new features based on user feedback and regulatory changes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BlocIQ Outlook Add-in Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Mail className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Work Directly from Your Inbox
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              The BlocIQ Outlook Add-in brings AI-powered property management assistance directly to your email.
              Get instant responses, compliance guidance, and document insights without switching applications.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Features */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Your AI Assistant, Right in Outlook
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-600">Instant AI responses to property management questions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-600">Compliance guidance based on UK leasehold law</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-600">Document analysis and insights on demand</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-gray-600">Seamless integration with your existing workflow</span>
                  </div>
                </div>
              </div>

              {/* Trial CTA */}
              <div className="bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl p-8 text-white">
                <h4 className="text-xl font-bold mb-4">Start Your 30-Day Free Trial</h4>
                <p className="text-white/90 mb-6">
                  Experience the power of AI-driven property management directly in your Outlook inbox.
                  No credit card required for the trial.
                </p>
                <button
                  onClick={() => {
                    // Redirect to subscription page
                    window.location.href = '/outlook-subscription';
                  }}
                  className="w-full bg-white text-[#6A00F5] hover:bg-gray-100 px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 inline ml-2" />
                </button>
                <p className="text-sm text-white/70 mt-3">
                  Cancel anytime. No setup fees. Full support included.
                </p>
              </div>
            </div>

            {/* Outlook Add-in Demo Video */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 shadow-2xl">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-white mb-2">Outlook Add-in in Action</h4>
                <p className="text-gray-300 text-sm">See how BlocIQ integrates seamlessly with your Outlook workflow</p>
              </div>
              <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden relative">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0zNjAgMjAwTDQ0MCAyNjBMMzYwIDMyMFYyMDBaIiBmaWxsPSIjNkEwMEY1Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMzUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiPk91dGxvb2sgSW50ZWdyYXRpb248L3RleHQ+Cjx0ZXh0IHg9IjQwMCIgeT0iMzgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTlBM0I1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+QUktUG93ZXJlZCBFbWFpbCBBc3Npc3RhbnQ8L3RleHQ+Cjwvc3ZnPg=="
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex items-center justify-center h-full bg-gray-800 text-white"><p>Video temporarily unavailable</p></div>';
                    }
                  }}
                >
                  <source src="/outlook-addin-new-demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
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
              href="/login"
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
                {/* Temporarily disabled - Pricing and Onboarding pages */}
                {/* <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/onboarding" className="text-gray-400 hover:text-white transition-colors">Onboarding</Link></li> */}
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

      {/* AI Chat Popup */}
      {showAIPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Try Our AI Chat!</h3>
              </div>
              <button
                onClick={closeAIPopup}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              Get instant answers to property management questions with our UK leasehold-trained AI assistant.
              Ask about compliance, regulations, or any property management topic!
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  closeAIPopup();
                  setShowAskBlocIQ(true);
                }}
                className="w-full bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-6 py-3 rounded-lg hover:from-[#5A00E5] hover:to-[#7A2BE2] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Brain className="h-5 w-5" />
                Try Ask BlocIQ
              </button>

              <button
                onClick={closeAIPopup}
                className="w-full text-gray-500 hover:text-gray-700 px-6 py-2 transition-colors font-medium"
              >
                Maybe later
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              No account required • Instant responses • UK property expertise
            </p>
          </div>
        </div>
      )}

      {/* Ask BlocIQ Modal */}
      <PublicAskBlocIQ
        isOpen={showAskBlocIQ}
        onClose={() => setShowAskBlocIQ(false)}
      />
    </div>
  );
}

