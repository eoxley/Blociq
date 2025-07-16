"use client";

import React from "react";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import ComplianceDocumentsList from "@/components/ComplianceDocumentsList";

export default function ComplianceDocumentsPage() {
  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compliance Documents</h1>
          <p className="mt-2 text-gray-600">
            View and manage all compliance documents across all buildings
          </p>
        </div>
        
        <ComplianceDocumentsList showUploadButton={true} />
      </div>
    </LayoutWithSidebar>
  );
} 