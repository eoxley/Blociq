'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function EmailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get all query parameters and redirect to inbox with filters
    const params = new URLSearchParams();
    
    // Map the query parameters to inbox filters
    const category = searchParams.get('category');
    const property = searchParams.get('property');
    const urgent = searchParams.get('urgent');
    const unread = searchParams.get('unread');
    
    if (category) params.set('category', category);
    if (property) params.set('property', property);
    if (urgent) params.set('urgent', urgent);
    if (unread) params.set('unread', unread);
    
    // Redirect to inbox with the filters
    const queryString = params.toString();
    const targetUrl = queryString ? `/inbox?${queryString}` : '/inbox';
    
    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Redirecting...</h2>
        <p className="text-gray-500">Taking you to the inbox...</p>
      </div>
    </div>
  );
}
