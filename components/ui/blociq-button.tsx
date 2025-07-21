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
    primary: "bg-gradient-to-r from-[#2BBEB4] to-[#0F5D5D] text-white hover:from-[#0F5D5D] hover:to-[#2BBEB4] shadow-lg hover:shadow-xl",
    secondary: "bg-[#F0FDFA] text-[#0F5D5D] border border-[#2BBEB4] hover:bg-[#2BBEB4] hover:text-white",
    outline: "bg-white text-[#333333] border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:border-[#2BBEB4]",
    ghost: "bg-transparent text-[#333333] hover:bg-[#F0FDFA] hover:text-[#0F5D5D]",
    destructive: "bg-[#EF4444] text-white hover:bg-red-600 shadow-lg hover:shadow-xl"
  };
  
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base"
  };
  
  const focusRing = {
    primary: "focus:ring-[#2BBEB4]",
    secondary: "focus:ring-[#2BBEB4]",
    outline: "focus:ring-[#2BBEB4]",
    ghost: "focus:ring-[#2BBEB4]",
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