import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import IndustryKnowledgeDashboard from './IndustryKnowledgeDashboard';

export default async function IndustryKnowledgePage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Check if user has admin/manager privileges for industry knowledge
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    redirect('/buildings');
  }

  // Only allow admin/manager roles to access industry knowledge
  const allowedRoles = ['admin', 'manager', 'developer'];
  if (!allowedRoles.includes(userProfile.role?.toLowerCase() || '')) {
    redirect('/buildings');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Industry Knowledge Management
          </h1>
          <p className="mt-2 text-gray-600">
            Upload and manage industry standards, guidance, and best practices for AI-powered responses
          </p>
        </div>
        
        <IndustryKnowledgeDashboard 
          userId={user.id}
          userRole={userProfile.role}
        />
      </div>
    </div>
  );
}
