import React from 'react';
import { cn } from '@/lib/utils';

interface BlocIQBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export function BlocIQBadge({ 
  variant = 'default', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: BlocIQBadgeProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-300";
  
  const variants = {
    default: "bg-[#F3F4F6] text-[#64748B]",
    primary: "bg-gradient-to-r from-[#2BBEB4] to-[#0F5D5D] text-white",
    secondary: "bg-[#F0FDFA] text-[#0F5D5D] border border-[#2BBEB4]",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    destructive: "bg-red-100 text-red-800"
  };
  
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <span
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
} 