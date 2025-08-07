import React from 'react';
import { cn } from '@/lib/utils';

interface BlocIQButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  asChild?: boolean;
}

export function BlocIQButton({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  asChild = false,
  ...props 
}: BlocIQButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
                const variants = {
                primary: "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl",
                secondary: "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100",
                outline: "bg-white text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-300",
                ghost: "bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700",
                destructive: "bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl"
              };
  
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base"
  };
  
                const focusRing = {
                primary: "focus:ring-blue-500",
                secondary: "focus:ring-blue-500",
                outline: "focus:ring-blue-500",
                ghost: "focus:ring-blue-500",
                destructive: "focus:ring-red-500"
              };

  const Component = asChild ? 'div' : 'button';
  
  return (
    <Component
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
    </Component>
  );
} 