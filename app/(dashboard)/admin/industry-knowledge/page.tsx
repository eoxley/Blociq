'use client'

import React from 'react'
import IndustryKnowledgeManager from '@/components/admin/IndustryKnowledgeManager'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import PageHero from '@/components/PageHero'

export default function IndustryKnowledgePage() {
  return (
    <LayoutWithSidebar>
      <PageHero 
        title="Industry Knowledge Management"
        description="Upload and manage PDF documents to enhance AI responses with industry-specific knowledge"
      />
      <div className="container mx-auto px-4 py-8">
        <IndustryKnowledgeManager />
      </div>
    </LayoutWithSidebar>
  )
}
