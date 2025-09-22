"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  Database, 
  Bot, 
  FileText, 
  Mail, 
  BarChart3,
  ArrowRight,
  Shield,
  Clock
} from 'lucide-react';

interface ProcessStepProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function ProcessStep({ icon: Icon, title, description, color, bgColor, borderColor }: ProcessStepProps) {
  return (
    <div className={cn(
      "flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105",
      bgColor,
      borderColor
    )}>
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg",
        color
      )}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-slate-800">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

interface ProcessDiagramProps {
  variant?: 'flow' | 'grid' | 'minimal';
  className?: string;
}

export function ProcessDiagram({ variant = 'flow', className }: ProcessDiagramProps) {
  const steps = [
    {
      icon: Building2,
      title: "Data Input",
      description: "Buildings, Units, Leases, Compliance Docs, Emails",
      color: "bg-gradient-to-br from-teal-500 to-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
    },
    {
      icon: Database,
      title: "Secure Database",
      description: "Ring-fenced, GDPR Compliant, UK Hosted",
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      icon: Bot,
      title: "AI Services",
      description: "OpenAI GPT-4, Google Document AI, Microsoft Graph",
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      icon: BarChart3,
      title: "Smart Outputs",
      description: "Inbox Replies, Compliance Dashboard, AskBlocIQ, Reports",
      color: "bg-gradient-to-br from-green-500 to-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  ];

  if (variant === 'minimal') {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">How BlocIQ Works</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            From data input to intelligent outputs, BlocIQ transforms your property management workflow
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <ProcessStep key={index} {...step} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">BlocIQ Process Flow</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A comprehensive view of how data flows through our AI-powered platform
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, index) => (
            <ProcessStep key={index} {...step} />
          ))}
        </div>
      </div>
    );
  }

  // Flow variant (default)
  return (
    <div className={cn("space-y-8", className)}>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">How BlocIQ Works</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          From data input to intelligent outputs, BlocIQ transforms your property management workflow
        </p>
      </div>
      
      <div className="relative">
        {/* Flow arrows */}
        <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-purple-200 via-blue-200 to-green-200 transform -translate-y-1/2 z-0"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <ProcessStep {...step} />
              
              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-lg">
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Additional diagram components
export function SecurityFeatures({ className }: { className?: string }) {
  const features = [
    {
      icon: Shield,
      title: "GDPR Compliant",
      description: "EU/UK data residency with privacy by design",
      color: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      icon: Database,
      title: "Row Level Security",
      description: "Agency data isolation and access controls",
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      icon: Clock,
      title: "Audit Logging",
      description: "Complete audit trail for compliance",
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className={cn("space-y-8", className)}>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Security & Compliance</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Built with security and compliance at its core
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="text-center p-6 rounded-2xl bg-slate-50 border-2 border-slate-200">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg",
              feature.color
            )}>
              <feature.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">{feature.title}</h3>
            <p className="text-slate-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
