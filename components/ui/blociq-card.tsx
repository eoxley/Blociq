import React from 'react';
import { cn } from '@/lib/utils';

interface BlocIQCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function BlocIQCard({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}: BlocIQCardProps) {
                const variants = {
                default: "bg-white border border-gray-200 shadow-sm hover:shadow-md rounded-2xl",
                elevated: "bg-white border border-gray-200 shadow-lg hover:shadow-xl rounded-2xl",
                outlined: "bg-white border-2 border-[#008C8F]/20 shadow-sm rounded-2xl"
              };

  return (
    <div
      className={cn(
        "transition-all duration-300",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface BlocIQCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function BlocIQCardHeader({ className, children, ...props }: BlocIQCardHeaderProps) {
  return (
    <div
      className={cn("px-6 py-4 border-b border-[#E2E8F0]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface BlocIQCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function BlocIQCardContent({ className, children, ...props }: BlocIQCardContentProps) {
  return (
    <div
      className={cn("px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface BlocIQCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function BlocIQCardFooter({ className, children, ...props }: BlocIQCardFooterProps) {
  return (
    <div
      className={cn("px-6 py-4 border-t border-[#E2E8F0] bg-[#FAFAFA]", className)}
      {...props}
    >
      {children}
    </div>
  );
} 