"use client";

import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DownloadButtonProps {
  elementRef: React.RefObject<HTMLDivElement>;
  filename: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DownloadButton({ 
  elementRef, 
  filename, 
  variant = 'outline',
  size = 'sm',
  className 
}: DownloadButtonProps) {
  const handleDownload = async () => {
    if (!elementRef.current) return;

    try {
      // In a real implementation, you would use html-to-image or similar
      // For now, we'll create a simple download simulation
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas size
      const rect = elementRef.current.getBoundingClientRect();
      canvas.width = rect.width * 2; // 2x for high DPI
      canvas.height = rect.height * 2;
      
      // Scale context for high DPI
      ctx.scale(2, 2);
      
      // For now, we'll just show an alert
      // In production, you would use html-to-image or similar library
      alert(`Downloading ${filename}...\n\nNote: In production, this would export the component as a PNG image.`);
      
      // Example of what the real implementation would look like:
      // const dataUrl = await htmlToImage.toPng(elementRef.current, {
      //   quality: 1.0,
      //   pixelRatio: 2,
      //   backgroundColor: '#ffffff'
      // });
      // 
      // const link = document.createElement('a');
      // link.download = filename;
      // link.href = dataUrl;
      // link.click();
      
    } catch (error) {
      console.error('Error downloading asset:', error);
      alert('Error downloading asset. Please try again.');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Download className="w-4 h-4" />
      Download
    </Button>
  );
}

// Pre-configured download buttons for common use cases
export function DownloadPNGButton({ 
  elementRef, 
  filename 
}: { 
  elementRef: React.RefObject<HTMLDivElement>; 
  filename: string; 
}) {
  return (
    <DownloadButton
      elementRef={elementRef}
      filename={`${filename}.png`}
      variant="outline"
      size="sm"
    />
  );
}

export function DownloadSVGButton({ 
  elementRef, 
  filename 
}: { 
  elementRef: React.RefObject<HTMLDivElement>; 
  filename: string; 
}) {
  return (
    <DownloadButton
      elementRef={elementRef}
      filename={`${filename}.svg`}
      variant="outline"
      size="sm"
    />
  );
}
