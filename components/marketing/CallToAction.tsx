"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Download, ExternalLink, Play } from 'lucide-react';

interface CallToActionProps {
  title: string;
  subtitle: string;
  primaryButton: {
    text: string;
    href?: string;
    onClick?: () => void;
    icon?: 'arrow' | 'download' | 'external' | 'play';
  };
  secondaryButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
    icon?: 'arrow' | 'download' | 'external' | 'play';
  };
  variant?: 'primary' | 'secondary' | 'minimal' | 'gradient';
  className?: string;
}

const iconMap = {
  arrow: ArrowRight,
  download: Download,
  external: ExternalLink,
  play: Play,
};

export function CallToAction({
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  variant = 'primary',
  className
}: CallToActionProps) {
  const variants = {
    primary: {
      container: "bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900",
      text: "text-white",
      primaryBtn: "bg-white text-slate-900 hover:bg-slate-100",
      secondaryBtn: "border-white/30 text-white hover:bg-white/10",
    },
    secondary: {
      container: "bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600",
      text: "text-white",
      primaryBtn: "bg-white text-slate-900 hover:bg-slate-100",
      secondaryBtn: "border-white/30 text-white hover:bg-white/10",
    },
    minimal: {
      container: "bg-slate-50 border-2 border-slate-200",
      text: "text-slate-800",
      primaryBtn: "bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:from-teal-600 hover:to-blue-600",
      secondaryBtn: "border-slate-300 text-slate-700 hover:bg-slate-100",
    },
    gradient: {
      container: "bg-gradient-to-r from-teal-50 via-blue-50 to-purple-50 border-2 border-teal-200",
      text: "text-slate-800",
      primaryBtn: "bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:from-teal-600 hover:to-blue-600",
      secondaryBtn: "border-teal-300 text-teal-700 hover:bg-teal-50",
    },
  };

  const currentVariant = variants[variant];
  const PrimaryIcon = primaryButton.icon ? iconMap[primaryButton.icon] : ArrowRight;
  const SecondaryIcon = secondaryButton?.icon ? iconMap[secondaryButton.icon] : ArrowRight;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-12 md:p-16 text-center",
      currentVariant.container,
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute top-20 right-20 w-24 h-24 rounded-full bg-white/15"></div>
          <div className="absolute bottom-10 left-20 w-40 h-40 rounded-full bg-white/10"></div>
          <div className="absolute bottom-20 right-10 w-28 h-28 rounded-full bg-white/25"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Title */}
        <h2 className={cn(
          "text-3xl md:text-5xl font-bold mb-6 leading-tight",
          currentVariant.text
        )}>
          {title}
        </h2>

        {/* Subtitle */}
        <p className={cn(
          "text-lg md:text-xl mb-8 leading-relaxed max-w-2xl mx-auto",
          currentVariant.text,
          variant === 'minimal' || variant === 'gradient' ? 'opacity-80' : 'opacity-90'
        )}>
          {subtitle}
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Primary Button */}
          <button
            onClick={primaryButton.onClick}
            className={cn(
              "inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl",
              currentVariant.primaryBtn
            )}
          >
            {primaryButton.text}
            <PrimaryIcon className="ml-2 w-5 h-5" />
          </button>

          {/* Secondary Button */}
          {secondaryButton && (
            <button
              onClick={secondaryButton.onClick}
              className={cn(
                "inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 border-2",
                currentVariant.secondaryBtn
              )}
            >
              {secondaryButton.text}
              <SecondaryIcon className="ml-2 w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Pre-configured CTA variants
export function PrimaryCTA({ className }: { className?: string }) {
  return (
    <CallToAction
      title="Ready to Transform Your Property Management?"
      subtitle="Join hundreds of property managers who've automated their workflows with BlocIQ's AI-powered platform. Start your free trial today."
      primaryButton={{
        text: "Start Free Trial",
        icon: "arrow",
      }}
      secondaryButton={{
        text: "Watch Demo",
        icon: "play",
      }}
      variant="primary"
      className={className}
    />
  );
}

export function SecondaryCTA({ className }: { className?: string }) {
  return (
    <CallToAction
      title="Get Started in Minutes"
      subtitle="No setup fees, no long-term contracts. Experience the power of AI-driven property management today."
      primaryButton={{
        text: "Get Started",
        icon: "arrow",
      }}
      secondaryButton={{
        text: "Learn More",
        icon: "external",
      }}
      variant="secondary"
      className={className}
    />
  );
}

export function MinimalCTA({ className }: { className?: string }) {
  return (
    <CallToAction
      title="Ready to Get Started?"
      subtitle="Transform your property management with BlocIQ's intelligent automation platform."
      primaryButton={{
        text: "Start Free Trial",
        icon: "arrow",
      }}
      variant="minimal"
      className={className}
    />
  );
}

export function DownloadCTA({ className }: { className?: string }) {
  return (
    <CallToAction
      title="Download Marketing Assets"
      subtitle="Get high-quality marketing materials, diagrams, and templates for your presentations and social media."
      primaryButton={{
        text: "Download Assets",
        icon: "download",
      }}
      secondaryButton={{
        text: "View Gallery",
        icon: "external",
      }}
      variant="gradient"
      className={className}
    />
  );
}
