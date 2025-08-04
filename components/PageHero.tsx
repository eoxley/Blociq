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
    <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 py-16">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/10"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-8 right-8 w-32 h-32 bg-white/10 rounded-full"></div>
      <div className="absolute bottom-8 left-8 w-24 h-24 bg-white/5 rounded-full"></div>
      
      <div className="relative w-full max-w-[1600px] mx-auto px-6 xl:px-12">
        <div className="text-center text-white">
          {/* Icon */}
          {icon && (
            <div className="mb-6">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
                {icon}
              </div>
            </div>
          )}
          
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in text-center">
            {title}
          </h1>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-lg md:text-xl text-teal-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
    </section>
  )
} 