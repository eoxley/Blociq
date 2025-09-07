import { Suspense } from 'react';
import LeaseLabClient from './LeaseLabClient';

export default function LeaseLabPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Lease Lab</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Upload complex documents for precise clause extraction and actionable summaries.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
        <LeaseLabClient />
      </Suspense>
    </div>
  );
}
