import { Suspense } from 'react';
import { Microscope } from 'lucide-react';
import LeaseLabClient from './LeaseLabClient';

export default function LeaseLabPage() {
  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <a href="/documents" className="hover:text-[#4f46e5] transition-colors font-medium">Document Library</a>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-semibold">Lease Lab</span>
      </nav>

      {/* Modern Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Lease Lab</h1>
              <p className="text-xl text-white/90 mt-2">Specialized lease analysis and extraction</p>
              <p className="text-white/80 mt-1">Upload complex lease documents for precise clause extraction and actionable summaries</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                <Microscope className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
        <LeaseLabClient />
      </Suspense>
    </div>
  );
}
