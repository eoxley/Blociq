'use client';

import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface ComplianceBadgeProps {
  className?: string;
}

export default function ComplianceBadge({ className = '' }: ComplianceBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200 ${className}`}>
      <Shield className="w-4 h-4" />
      <span>Live compliance data used</span>
    </div>
  );
} 