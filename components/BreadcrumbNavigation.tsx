"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, Inbox, Building2, Shield, Megaphone, Bot, FileText, BarChart3, Settings, TrendingUp, Edit3, Plus, Upload, MapPin, Users, DollarSign, AlertTriangle, CheckCircle, Clock, Paperclip, MessageSquare, Download, Trash2, Archive, Folder, Star, Flag, MoreVertical, Reply, ReplyAll, Forward, Filter, RefreshCw, Sparkles, Zap, Wand2, Loader2, Send, File, Building, AlertCircle, CheckCircle2, Construction, History, ArrowRight, Save, Edit, Info } from 'lucide-react';
import { BlocIQBadge } from '@/components/ui/blociq-badge';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
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
      icon: Home
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
      let icon: React.ComponentType<{ className?: string }> | undefined;
      switch (segment) {
        case 'inbox':
          icon = Inbox;
          break;
        case 'buildings':
          icon = Building2;
          break;
        case 'compliance':
          icon = Shield;
          break;
        case 'communications':
          icon = Megaphone;
          break;
        case 'ai-assistant':
          icon = Bot;
          break;
        case 'major-works':
          icon = Wrench;
          break;
        case 'documents':
          icon = FileText;
          break;
        case 'templates':
          icon = FileText;
          break;
        case 'log':
          icon = BarChart3;
          break;
        case 'setup':
          icon = Settings;
          break;
        case 'reports':
          icon = TrendingUp;
          break;
        case 'units':
          icon = Home;
          break;
        case 'amendments':
          icon = Edit3;
          break;
        case 'tracker':
          icon = BarChart3;
          break;
        case 'new':
          icon = Plus;
          break;
        case 'upload':
          icon = Upload;
          break;
        case 'send':
          icon = Send;
          break;
        default:
          // Check if it's a UUID (building ID, etc.)
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
            icon = Building2;
          } else {
            icon = FileText;
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-[#14b8a6] hover:bg-[#f0fdfa] transition-all duration-200 group"
              >
                {item.icon && (
                  <item.icon className="h-4 w-4 text-gray-500 group-hover:scale-110 transition-transform" />
                )}
                <span className="font-medium">{item.label}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#14b8a6] to-[#8b5cf6] text-white">
                {item.icon && (
                  <item.icon className="h-4 w-4 text-white" />
                )}
                <span className="font-semibold">{item.label}</span>
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/20 text-white border border-white/30">
                  Current
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 