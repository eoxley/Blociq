"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Brain, FileText, Calendar, Shield, Zap, Building2, Users, Home, CheckCircle, Star, MessageSquare, Settings, BarChart3, Mail, Lock, Eye, Heart, Play, Award, Clock, Target, TrendingUp, BookOpen } from 'lucide-react';
import { getAllPosts, formatDate } from '@/lib/blog';
import BlocIQLogo from '@/components/BlocIQLogo';

export default function LandingPage() {
  const blogPosts = getAllPosts().slice(0, 3); // Get latest 3 posts

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
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
              <Link href="#features" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                How It Works
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-[#6A00F5] transition-colors font-medium">
                About
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
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2]">
        {/* Abstract background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-2xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center text-white">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-2xl">
                <Brain className="h-10 w-10 text-white stroke-2" />
              </div>
              <h1 className="text-6xl md:text-7xl font-bold mb-6">
                <span className="text-white">That's</span>{' '}
                <span className="text-teal-200">clever.</span>
              </h1>
              <h2 className="text-2xl md:text-3xl text-white/90 mb-6 font-medium">
                AI-powered property management, reimagined.
              </h2>
              <p className="text-xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed">
                The all-in-one platform that saves managers hours, keeps buildings compliant, and gives directors instant transparency.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="#book-demo"
                className="inline-flex items-center gap-3 bg-white text-[#6A00F5] px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:bg-gray-50"
              >
                Book a Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Explore Features
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why BlocIQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why BlocIQ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The property management industry is drowning in compliance fines, admin overload, and lack of transparency. BlocIQ changes that.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-red-200">
                <Shield className="h-8 w-8 text-red-600 stroke-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Fines</h3>
              <p className="text-gray-600">BSA penalties, leasehold law breaches, missed deadlines</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-orange-200">
                <FileText className="h-8 w-8 text-orange-600 stroke-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Overload</h3>
              <p className="text-gray-600">Spreadsheets, manual processes, endless paperwork</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-yellow-200">
                <Users className="h-8 w-8 text-yellow-600 stroke-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff Burnout</h3>
              <p className="text-gray-600">Overworked teams, high turnover, stress</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-blue-200">
                <Eye className="h-8 w-8 text-blue-600 stroke-2" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transparency</h3>
              <p className="text-gray-600">Directors and leaseholders left in the dark</p>
            </div>
          </div>
        </div>
      </section>

      {/* What BlocIQ Delivers Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What BlocIQ Delivers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The complete operating system for block management. Everything you need, intelligently connected.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI-Powered Communications Hub */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center mb-6 border-2 border-orange-200">
                <Mail className="h-8 w-8 text-orange-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">AI-Powered Communications Hub</h3>
              <p className="text-gray-600 mb-4">Smart email management, auto-categorize & prioritize.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Auto-draft responses (AI-generated)</li>
                <li>• Outlook Add-in integration</li>
                <li>• Template management + logging</li>
              </ul>
            </div>

            {/* Building & Portfolio Management */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-200">
                <Building2 className="h-8 w-8 text-blue-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Building & Portfolio Management</h3>
              <p className="text-gray-600 mb-4">Building profiles, unit tracking, multi-building view.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Portfolio dashboard</li>
                <li>• Visual building structures</li>
                <li>• Asset tracking</li>
              </ul>
            </div>

            {/* Compliance Management System */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center mb-6 border-2 border-green-200">
                <Shield className="h-8 w-8 text-green-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Compliance Management System</h3>
              <p className="text-gray-600 mb-4">Automated deadline tracking, document management.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• FRA, EICR, Gas, Asbestos, Legionella</li>
                <li>• AI document search</li>
                <li>• Audit trails + setup wizard</li>
              </ul>
            </div>

            {/* Document Intelligence (AI Labs) */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center mb-6 border-2 border-purple-200">
                <FileText className="h-8 w-8 text-purple-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Document Intelligence (AI Labs)</h3>
              <p className="text-gray-600 mb-4">Lease, Compliance, Major Works, General labs.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Extract terms, clauses, dates</li>
                <li>• OCR processing</li>
                <li>• Q&A with any document</li>
              </ul>
            </div>

            {/* Finance & Accounting */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-teal-50 rounded-xl flex items-center justify-center mb-6 border-2 border-teal-200">
                <BarChart3 className="h-8 w-8 text-teal-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Finance & Accounting</h3>
              <p className="text-gray-600 mb-4">Bank reconciliation, invoice capture, works orders.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• OCR invoice capture & approval</li>
                <li>• Contractor management</li>
                <li>• Spend analysis + automated reminders</li>
              </ul>
            </div>

            {/* Calendar & Events */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 border-2 border-indigo-200">
                <Calendar className="h-8 w-8 text-indigo-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Calendar & Events</h3>
              <p className="text-gray-600 mb-4">Intelligent scheduling, Outlook sync, reminders.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Automated reminders</li>
                <li>• Multi-source events</li>
                <li>• Compliance deadline tracking</li>
              </ul>
            </div>

            {/* Major Works Management */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-pink-50 rounded-xl flex items-center justify-center mb-6 border-2 border-pink-200">
                <Settings className="h-8 w-8 text-pink-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Major Works Management</h3>
              <p className="text-gray-600 mb-4">Project tracking, contractor performance.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Budget tracking</li>
                <li>• Timeline management</li>
                <li>• Document storage</li>
              </ul>
            </div>

            {/* Leaseholder Portal */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-cyan-50 rounded-xl flex items-center justify-center mb-6 border-2 border-cyan-200">
                <Users className="h-8 w-8 text-cyan-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Leaseholder Portal</h3>
              <p className="text-gray-600 mb-4">Secure login with magic links.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Balance visibility + online payments</li>
                <li>• Document access</li>
                <li>• Chat/contact forms</li>
              </ul>
            </div>

            {/* Unified Knowledge System */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center mb-6 border-2 border-amber-200">
                <BookOpen className="h-8 w-8 text-amber-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Unified Knowledge System</h3>
              <p className="text-gray-600 mb-4">Upload regulatory/industry docs.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Vector search + semantic Q&A</li>
                <li>• Enhanced AI answers with citations</li>
                <li>• Industry knowledge library</li>
              </ul>
            </div>

            {/* AskBlocIQ AI */}
            <div className="bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2] rounded-2xl p-8 text-white md:col-span-2 lg:col-span-3">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mr-4 shadow-2xl backdrop-blur-sm">
                  <Brain className="h-8 w-8 text-white stroke-2" />
                </div>
                <h3 className="text-2xl font-bold">AskBlocIQ AI</h3>
              </div>
              <p className="text-white/90 mb-4 text-lg">
                Embedded everywhere: communications, finance, compliance, docs. Ask questions, get instant answers.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-white/80">
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-sm">"What's our compliance status for Building 123?"</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-sm">"Show overdue invoices > £500."</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-sm">"Generate a Section 20 notice for lift replacement."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple setup, powerful results. From onboarding to going live in weeks, not months.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-purple-200">
                <Settings className="h-8 w-8 text-purple-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Simple Setup</h3>
              <p className="text-gray-600">Onboarding call, upload docs, we handle the rest.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-teal-200">
                <Zap className="h-8 w-8 text-teal-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">We Do the Heavy Lifting</h3>
              <p className="text-gray-600">Data import, Outlook sync, everything configured.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-blue-200">
                <Play className="h-8 w-8 text-blue-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Training That Fits</h3>
              <p className="text-gray-600">Short, simple sessions. Ready to use immediately.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
                <CheckCircle className="h-8 w-8 text-green-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Go Live</h3>
              <p className="text-gray-600">All-in-one platform. No more spreadsheets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Who It's For
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built for everyone in the block management ecosystem.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-200">
                <Settings className="h-8 w-8 text-blue-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Property Managers</h3>
              <p className="text-gray-600 mb-4">Faster, less stressful workflows. Everything in one place.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Automated compliance tracking</li>
                <li>• Integrated communications</li>
                <li>• Smart document management</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center mb-6 border-2 border-purple-200">
                <Award className="h-8 w-8 text-purple-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Directors</h3>
              <p className="text-gray-600 mb-4">Transparent finances, compliance status, real-time insights.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Financial transparency</li>
                <li>• Compliance dashboards</li>
                <li>• Approval workflows</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-teal-50 rounded-xl flex items-center justify-center mb-6 border-2 border-teal-200">
                <Home className="h-8 w-8 text-teal-600 stroke-2" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Leaseholders</h3>
              <p className="text-gray-600 mb-4">Clarity on balances, documents, easy contact with managers.</p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Balance visibility</li>
                <li>• Document access</li>
                <li>• Direct communication</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Built by someone who gets it
              </h2>
              <div className="space-y-6 text-gray-600">
                <p className="text-lg">
                  Ellie Oxley spent 10+ years in block management, balancing real-world pressures with a vision for better technology.
                </p>
                <p className="text-lg">
                  "I built BlocIQ because managers deserve better tools — not more spreadsheets. The industry needs intelligent systems that actually solve problems, not create them."
                </p>
                <p className="text-lg">
                  From compliance deadlines to leaseholder complaints, Ellie understands the daily challenges property managers face. That's why every feature in BlocIQ is designed to make your life easier, not harder.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-6 relative overflow-hidden rounded-full ring-4 ring-[#6A00F5]/20">
                  <Image
                    src="/assets/ellie-oxley-headshot.png"
                    alt="Ellie Oxley - Founder & CEO of BlocIQ"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ellie Oxley</h3>
                <p className="text-gray-600 mb-4">Founder & CEO</p>
                <p className="text-sm text-gray-500">
                  10+ years in property management<br/>
                  Former block manager<br/>
                  Tech visionary
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-gradient-to-br from-[#6A00F5] to-[#8A2BE2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            The Future of Block Management
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-4xl mx-auto">
            BlocIQ transforms block management from fragmented tools into one intelligent, compliant platform. 
            Replacing legacy systems like MRI, Qube, and Dwellant with modern, AI-powered solutions.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                <Target className="h-8 w-8 text-white stroke-2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Less Admin</h3>
              <p className="text-white/80">Automated workflows, smart templates, intelligent routing</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                <Shield className="h-8 w-8 text-white stroke-2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">More Compliance</h3>
              <p className="text-white/80">Building Safety Act ready, deadline tracking, audit trails</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                <Eye className="h-8 w-8 text-white stroke-2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Greater Transparency</h3>
              <p className="text-white/80">Real-time insights, portal access, clear communication</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="book-demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            <span className="text-[#6A00F5]">That's</span>{' '}
            <span className="text-[#8A2BE2]">clever.</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Ready to transform your block management? See BlocIQ in action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#book-demo"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-white border-2 border-[#6A00F5] text-[#6A00F5] px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg hover:bg-[#6A00F5] hover:text-white"
            >
              Outlook Add-in Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Insights Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Latest Insights
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay ahead with the latest thinking on property management, compliance, and technology.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => {
              const icons = [Brain, BarChart3, Shield];
              const colors = [
                { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', hover: 'hover:text-teal-700' },
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', hover: 'hover:text-blue-700' },
                { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', hover: 'hover:text-red-700' }
              ];
              
              const IconComponent = icons[index] || Brain;
              const colorScheme = colors[index] || colors[0];
              
              return (
                <article key={post.slug} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className={`w-16 h-16 ${colorScheme.bg} rounded-xl flex items-center justify-center mb-6 border-2 ${colorScheme.border}`}>
                    <IconComponent className={`h-8 w-8 ${colorScheme.text} stroke-2`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[#6A00F5] transition-colors">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{formatDate(post.date)}</span>
                    <Link href={`/blog/${post.slug}`} className={`${colorScheme.text} ${colorScheme.hover} font-medium text-sm flex items-center gap-1`}>
                      Read More →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          
          <div className="text-center mt-12">
            <Link 
              href="/blog"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] text-white px-8 py-4 rounded-xl transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <BookOpen className="h-5 w-5" />
              View All Posts
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#6A00F5] to-[#8A2BE2] rounded-lg flex items-center justify-center mr-3">
                  <BlocIQLogo className="text-white" size={16} />
                </div>
                <span className="text-xl font-bold">BlocIQ</span>
              </div>
              <p className="text-gray-400 mb-4">
                The operating system for block management.
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>BlocIQ Ltd</strong> — Company No. 16533839</p>
                <p><strong>ICO Registration:</strong> ZB995810</p>
                <p><strong>Trademark No:</strong> UK00004267693</p>
                <p><strong>Professional Indemnity Insurance:</strong> Hiscox, £1,000,000 cover, Policy PL-PSC10003772018/00</p>
                <p>GDPR compliant, UK servers</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
                <li><Link href="/accessibility" className="hover:text-white transition-colors">Accessibility</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#book-demo" className="hover:text-white transition-colors">Book a Demo</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><a href="mailto:hello@blociq.co.uk" className="hover:text-white transition-colors">hello@blociq.co.uk</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BlocIQ Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}