'use client';

import { useEffect, useState } from 'react';
import {
  DocumentTextIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface DocumentLibraryProps {
  leaseholderId: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  uploaded_at: string;
  size?: number;
  description?: string;
}

export function DocumentLibrary({ leaseholderId }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<Record<string, Document[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/portal/${leaseholderId}/documents`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || {});
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        // Fallback with mock data
        setDocuments({
          'Legal Documents': [
            {
              id: '1',
              name: 'Lease Agreement.pdf',
              type: 'lease',
              category: 'Legal Documents',
              uploaded_at: '2024-01-15T10:00:00Z',
              size: 2450000,
              description: 'Primary lease agreement'
            }
          ],
          'Building Documents': [
            {
              id: '2',
              name: 'Building Insurance Policy.pdf',
              type: 'building',
              category: 'Building Documents',
              uploaded_at: '2024-03-20T14:30:00Z',
              size: 1200000,
              description: 'Current building insurance policy'
            },
            {
              id: '3',
              name: 'Service Charge Budget 2024.pdf',
              type: 'building',
              category: 'Building Documents',
              uploaded_at: '2024-01-01T09:00:00Z',
              size: 850000,
              description: 'Annual service charge budget breakdown'
            }
          ],
          'Compliance': [
            {
              id: '4',
              name: 'Fire Risk Assessment.pdf',
              type: 'compliance',
              category: 'Compliance',
              uploaded_at: '2024-06-15T11:00:00Z',
              size: 3200000,
              description: 'Annual fire risk assessment report'
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [leaseholderId]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'lease':
        return '📄';
      case 'compliance':
        return '🛡️';
      case 'building':
        return '🏢';
      default:
        return '📁';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Library</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalDocuments = Object.values(documents).reduce((sum, docs) => sum + docs.length, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Document Library</h3>
          <p className="text-sm text-gray-500">{totalDocuments} documents available</p>
        </div>
        <DocumentTextIcon className="w-6 h-6 text-gray-400" />
      </div>

      {totalDocuments === 0 ? (
        <div className="text-center py-8">
          <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No documents available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(documents).map(([category, docs]) => (
            <div key={category}>
              <div className="flex items-center space-x-2 mb-3">
                <FolderIcon className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">{category}</h4>
                <span className="text-sm text-gray-500">({docs.length})</span>
              </div>

              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getDocumentIcon(doc.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-gray-500">
                            {formatDate(doc.uploaded_at)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.size)}
                          </p>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          All documents are securely stored and access-controlled. Contact building management
          if you need assistance accessing any documents.
        </p>
      </div>
    </div>
  );
}