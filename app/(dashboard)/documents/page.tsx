import { Suspense } from 'react';
import DocumentLibraryOverview from './DocumentLibraryOverview';

export default function DocumentLibraryPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Document Library</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Upload, organize, and manage all your property documents. AI-powered categorization and search.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
        <DocumentLibraryOverview />
      </Suspense>
    </div>
  );
}