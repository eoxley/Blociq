'use client';

import { Building2, AlertTriangle, CheckCircle } from 'lucide-react';

interface MajorWorksBadgeProps {
  className?: string;
}

export default function MajorWorksBadge({ className = '' }: MajorWorksBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200 ${className}`}>
      <Building2 className="w-4 h-4" />
      <span>Live major works data used</span>
    </div>
  );
} 