'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import BlocIQLogo from '@/components/BlocIQLogo'

interface PageHeroProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  showLoginButton?: boolean
  showBackButton?: boolean
  onBackClick?: () => void
  children?: React.ReactNode
}

export default function PageHero({
  title,
  subtitle,
  icon,
  showLoginButton = false,
  showBackButton = false,
  onBackClick,
  children
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
      <div className="max-w-none mx-auto px-6">
        <div className="text-center">
          {/* Icon */}
          {icon && (
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              {icon}
            </div>
          )}
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {title}
          </h1>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
            {showLoginButton && (
              <Link 
                href="/login"
                className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold text-base backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Log in to your account
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            
            {showBackButton && onBackClick && (
              <button
                onClick={onBackClick}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold text-base backdrop-blur-sm border border-white/20"
              >
                ← Go Back
              </button>
            )}
            
            {children}
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
      </div>
    </section>
  )
} 