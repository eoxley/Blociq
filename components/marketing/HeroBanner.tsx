"use client";

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  showLogo?: boolean;
  variant?: 'primary' | 'secondary' | 'minimal';
  className?: string;
}

export function HeroBanner({
  title = "BlocIQ – Property Management, Reimagined",
  subtitle = "The AI-powered platform that transforms leasehold block management with intelligent automation, GDPR-compliant security, and UK-specific compliance tools.",
  tagline = "AI-Powered • GDPR-Safe • UK-Focused",
  showLogo = true,
  variant = 'primary',
  className
}: HeroBannerProps) {
  const variants = {
    primary: {
      container: "bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600",
      text: "text-white",
      overlay: "bg-black/10",
    },
    secondary: {
      container: "bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900",
      text: "text-white",
      overlay: "bg-black/20",
    },
    minimal: {
      container: "bg-gradient-to-r from-teal-50 to-blue-50",
      text: "text-slate-800",
      overlay: "bg-white/50",
    },
  };

  const currentVariant = variants[variant];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-12 md:p-16 text-center",
      currentVariant.container,
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute top-20 right-20 w-24 h-24 rounded-full bg-white/15"></div>
          <div className="absolute bottom-10 left-20 w-40 h-40 rounded-full bg-white/10"></div>
          <div className="absolute bottom-20 right-10 w-28 h-28 rounded-full bg-white/25"></div>
        </div>
      </div>

      {/* Overlay */}
      <div className={cn(
        "absolute inset-0",
        currentVariant.overlay
      )}></div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Logo */}
        {showLogo && (
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
              <Image
                src="/logo.png"
                alt="BlocIQ Logo"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className={cn(
          "text-4xl md:text-6xl font-bold mb-6 leading-tight",
          currentVariant.text,
          variant === 'minimal' ? 'font-serif' : 'font-inter'
        )}>
          {title}
        </h1>

        {/* Subtitle */}
        <p className={cn(
          "text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto",
          currentVariant.text,
          variant === 'minimal' ? 'opacity-80' : 'opacity-90'
        )}>
          {subtitle}
        </p>

        {/* Tagline */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {tagline.split(' • ').map((item, index) => (
            <span
              key={index}
              className={cn(
                "px-6 py-3 rounded-full text-sm font-medium backdrop-blur-sm border",
                variant === 'minimal' 
                  ? "bg-white/80 text-slate-700 border-slate-200" 
                  : "bg-white/20 text-white border-white/30"
              )}
            >
              {item}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className={cn(
            "px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105",
            variant === 'minimal'
              ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-lg hover:shadow-xl"
              : "bg-white text-slate-800 shadow-lg hover:shadow-xl"
          )}>
            Start Free Trial
          </button>
          <button className={cn(
            "px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 border-2",
            variant === 'minimal'
              ? "border-slate-300 text-slate-700 hover:bg-slate-50"
              : "border-white/30 text-white hover:bg-white/10"
          )}>
            Watch Demo
          </button>
        </div>
      </div>
    </div>
  );
}

// Pre-configured hero variants
export function PrimaryHero({ className }: { className?: string }) {
  return (
    <HeroBanner
      variant="primary"
      className={className}
    />
  );
}

export function SecondaryHero({ className }: { className?: string }) {
  return (
    <HeroBanner
      variant="secondary"
      title="Transform Your Property Management"
      subtitle="Join hundreds of property managers who've automated their workflows with BlocIQ's AI-powered platform."
      className={className}
    />
  );
}

export function MinimalHero({ className }: { className?: string }) {
  return (
    <HeroBanner
      variant="minimal"
      title="Property Management, Reimagined"
      subtitle="The future of leasehold management is here. Experience the power of AI-driven automation."
      showLogo={false}
      className={className}
    />
  );
}
