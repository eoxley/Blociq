import React from 'react';

interface BrandedTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function BrandedTile({ 
  title, 
  value, 
  subtitle, 
  icon, 
  className = '' 
}: BrandedTileProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 bg-brand-primary/10 rounded-lg flex items-center justify-center">
            <div className="text-brand-primary">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
