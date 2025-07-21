import React from 'react';
import { cn } from '@/lib/utils';

interface BlocIQButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function BlocIQButton({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: BlocIQButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
                const variants = {
                primary: "bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white hover:from-[#007BDB] hover:to-[#008C8F] shadow-lg hover:shadow-xl",
                secondary: "bg-[#F0FDFA] text-[#0F5D5D] border border-[#008C8F] hover:bg-[#008C8F] hover:text-white",
                outline: "bg-white text-[#333333] border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:border-[#008C8F]",
                ghost: "bg-transparent text-[#333333] hover:bg-[#F0FDFA] hover:text-[#0F5D5D]",
                destructive: "bg-[#EF4444] text-white hover:bg-red-600 shadow-lg hover:shadow-xl"
              };
  
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base"
  };
  
                const focusRing = {
                primary: "focus:ring-[#008C8F]",
                secondary: "focus:ring-[#008C8F]",
                outline: "focus:ring-[#008C8F]",
                ghost: "focus:ring-[#008C8F]",
                destructive: "focus:ring-red-500"
              };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        focusRing[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
} 