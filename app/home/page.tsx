'use client'

import React from 'react'
import DashboardSidebar from '@/components/DashboardSidebar'
import MobileNavigation from '@/components/MobileNavigation'
import AskBlocIQHomepage from '@/components/AskBlocIQHomepage'
import UpcomingEventsWidget from '@/components/UpcomingEventsWidget'
import BuildingToDoWidget from '@/components/BuildingToDoWidget'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DashboardSidebar />
        </div>
        
        {/* Mobile Navigation */}
        <MobileNavigation />
        
        <main className="flex-1 overflow-y-auto">
          {/* Main Content */}
          <div className="p-4 lg:p-6">
            <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 xl:px-8">
              <div className="space-y-8">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 rounded-3xl">
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                      <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                      Welcome to BlocIQ
                    </h1>
                    <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
                      Your AI-powered property management assistant. Stay on top of events, tasks, and get instant answers to your questions.
                    </p>
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  </div>
                </section>

                {/* Upcoming Events & Building To-Do - 2 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Upcoming Events Widget */}
                  <div className="h-full">
                    <UpcomingEventsWidget />
                  </div>
                  
                  {/* Building To-Do Widget */}
                  <div className="h-full">
                    <BuildingToDoWidget />
                  </div>
                </div>

                {/* Ask BlocIQ AI Component */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">🧠 Ask BlocIQ AI</h2>
                  <AskBlocIQHomepage />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
