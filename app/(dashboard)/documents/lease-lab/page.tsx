import { Suspense } from 'react';
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

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Lease Lab</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Specialized lease analysis and extraction. Upload complex lease documents for precise clause extraction and actionable summaries.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
        <LeaseLabClient />
      </Suspense>
    </div>
  );
}
