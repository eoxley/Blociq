import { Suspense } from 'react';
import LeaseLabClient from './LeaseLabClient';

export default function LeaseLabPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Lease Lab</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload complex documents for precise clause extraction and actionable summaries.
          </p>
        </div>

        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
          <LeaseLabClient />
        </Suspense>
      </div>
    </div>
  );
}
