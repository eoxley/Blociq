"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { BlocIQBadge } from '@/components/ui/blociq-badge';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

export default function BreadcrumbNavigation() {
  const pathname = usePathname();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Add home
    breadcrumbs.push({
      label: 'Home',
      href: '/home',
      icon: '🏠'
    });
    
    // Build breadcrumbs from path segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Map segment to readable label
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Add icon for specific pages
      let icon = '';
      switch (segment) {
        case 'inbox':
          icon = '📥';
          break;
        case 'buildings':
          icon = '🏢';
          break;
        case 'compliance':
          icon = '🛡️';
          break;
        case 'communications':
          icon = '📣';
          break;
        case 'ai-assistant':
          icon = '🤖';
          break;
        case 'major-works':
          icon = '🔧';
          break;
        case 'ai-assistant':
          icon = '🧠';
          break;
        case 'documents':
          icon = '📄';
          break;
        case 'templates':
          icon = '📋';
          break;
        case 'log':
          icon = '📊';
          break;
        case 'setup':
          icon = '⚙️';
          break;
        case 'reports':
          icon = '📈';
          break;
        case 'units':
          icon = '🏠';
          break;
        case 'amendments':
          icon = '📝';
          break;
        case 'major-works':
          icon = '🔧';
          break;
        case 'compliance':
          icon = '🛡️';
          break;
        case 'tracker':
          icon = '📊';
          break;
        case 'new':
          icon = '➕';
          break;
        case 'upload':
          icon = '📤';
          break;
        case 'send':
          icon = '📤';
          break;
        default:
          // Check if it's a UUID (building ID, etc.)
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
            icon = '🏢';
          } else {
            icon = '📄';
          }
      }
      
      // Don't make the last item a link
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        icon
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs on home page
  }
  
  return (
    <nav className="mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-[#64748B] mx-2" />
            )}
            
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#64748B] hover:text-[#0F5D5D] hover:bg-[#F0FDFA] transition-all duration-200 group"
              >
                {item.icon && (
                  <span 
                    className="text-sm group-hover:scale-110 transition-transform"
                    style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="font-medium">{item.label}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white">
                {item.icon && (
                  <span 
                    className="text-sm"
                    style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="font-semibold">{item.label}</span>
                <BlocIQBadge variant="outline" size="sm" className="bg-white/20 text-white border-white/30">
                  Current
                </BlocIQBadge>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 