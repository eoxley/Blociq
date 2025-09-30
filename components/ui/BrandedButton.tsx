import React from 'react';

interface BrandedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function BrandedButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '' 
}: BrandedButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200';
  
  const variantClasses = {
    primary: 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
