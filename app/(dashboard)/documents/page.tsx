import { Suspense } from 'react';
import DocumentLibraryOverview from './DocumentLibraryOverview';

export default function DocumentLibraryPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
      <DocumentLibraryOverview />
    </Suspense>
  );
}