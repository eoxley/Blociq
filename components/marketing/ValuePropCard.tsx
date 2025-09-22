"use client";

import React from 'react';
import { Clock, Shield, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValuePropCardProps {
  icon: 'clock' | 'shield' | 'flag';
  title: string;
  description: string;
  className?: string;
}

const iconMap = {
  clock: Clock,
  shield: Shield,
  flag: Flag,
};

const colorSchemes = {
  clock: {
    bg: 'bg-gradient-to-br from-teal-50 to-blue-50',
    border: 'border-teal-200',
    iconBg: 'bg-gradient-to-br from-teal-500 to-blue-500',
    text: 'text-teal-700',
    title: 'text-teal-800',
  },
  shield: {
    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
    border: 'border-purple-200',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    text: 'text-purple-700',
    title: 'text-purple-800',
  },
  flag: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500',
    text: 'text-blue-700',
    title: 'text-blue-800',
  },
};

export function ValuePropCard({ 
  icon, 
  title, 
  description, 
  className 
}: ValuePropCardProps) {
  const IconComponent = iconMap[icon];
  const colors = colorSchemes[icon];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-8 border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl",
      colors.bg,
      colors.border,
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
          colors.iconBg
        )}>
          <IconComponent className="w-8 h-8 text-white" />
        </div>
        
        {/* Title */}
        <h3 className={cn(
          "text-2xl font-bold mb-4 font-inter",
          colors.title
        )}>
          {title}
        </h3>
        
        {/* Description */}
        <p className={cn(
          "text-lg leading-relaxed",
          colors.text
        )}>
          {description}
        </p>
      </div>
    </div>
  );
}

// Pre-configured cards for common use cases
export function SaveTimeCard({ className }: { className?: string }) {
  return (
    <ValuePropCard
      icon="clock"
      title="AI-Powered Inbox Assistant"
      description="Smart email categorization, auto-draft responses, and priority flagging. Automatically links emails to specific buildings and units."
      className={className}
    />
  );
}

export function StayCompliantCard({ className }: { className?: string }) {
  return (
    <ValuePropCard
      icon="shield"
      title="Compliance Management"
      description="Automated deadline tracking, secure document storage, complete audit trails, and AI-powered document search for compliance requirements."
      className={className}
    />
  );
}

export function BuiltForUKCard({ className }: { className?: string }) {
  return (
    <ValuePropCard
      icon="flag"
      title="Built for UK"
      description="Purpose-built for British leasehold management with UK-specific legal logic, data residency, and compliance frameworks."
      className={className}
    />
  );
}
