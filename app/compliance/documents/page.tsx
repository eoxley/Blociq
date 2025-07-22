'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import SmartUploader from '@/components/SmartUploader';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ComplianceDocumentsInner() {
  const searchParams = useSearchParams();
  const buildingId = searchParams?.get('building');
  const docType = searchParams?.get('type');
  const supabase = createClientComponentClient();
  
  const [building, setBuilding] = useState<{ id: number; name: string; address: string | null } | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchBuilding = async () => {
      if (buildingId) {
        const { data } = await supabase
          .from('buildings')
          .select('id, name, address')
          .eq('id', buildingId)
          .single();
        
        if (data) {
          setBuilding(data);
        }
      }
    };

    const fetchDocuments = async () => {
      if (buildingId) {
        const { data } = await supabase
          .from('compliance_docs')
          .select('*')
          .eq('building_id', buildingId)
          .order('created_at', { ascending: false });
        
        if (data) {
          setUploadedDocuments(data);
        }
      }
    };

    fetchBuilding();
    fetchDocuments();
  }, [buildingId, supabase]);

  const handleUploadSuccess = (document: any) => {
    setUploadedDocuments(prev => [document, ...prev]);
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={buildingId ? `/compliance/${buildingId}` : '/compliance'}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-teal-600" />
              Upload Compliance Document
            </h1>
            {building && (
              <p className="text-gray-600 mt-1">
                {building.name} • {building.address}
              </p>
            )}
            {docType && (
              <p className="text-sm text-teal-600 mt-1">
                Document Type: <span className="font-medium">{docType}</span>
              </p>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload New Document</h2>
            <p className="text-sm text-gray-600">
              Upload a compliance document. The system will automatically analyse the document and extract relevant information.
            </p>
          </div>

          <SmartUploader
            table="compliance_docs"
            docTypePreset={docType || undefined}
            buildingId={buildingId ? parseInt(buildingId) : undefined}
            onSaveSuccess={handleUploadSuccess}
          />
        </div>

        {/* Recent Documents */}
        {uploadedDocuments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
              <p className="text-sm text-gray-600 mt-1">
                Recently uploaded compliance documents for this building
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {uploadedDocuments.map((doc) => (
                <div key={doc.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{doc.doc_type || 'Unknown Type'}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      {doc.expiry_date && (
                        <p className="text-sm text-gray-600">
                          Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.doc_url && (
                        <a
                          href={doc.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          View Document
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• The system will automatically detect the document type and extract key dates</p>
            <p>• If the AI cannot determine the document type, you'll be prompted to select it manually</p>
            <p>• Supported formats: PDF, DOC, DOCX, and image files</p>
            <p>• Documents are securely stored and accessible to your team</p>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}

export default function ComplianceDocumentsPage() {
  return (
    <Suspense fallback={
      <LayoutWithSidebar>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    }>
      <ComplianceDocumentsInner />
    </Suspense>
  );
} 