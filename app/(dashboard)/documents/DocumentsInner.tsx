"use client";

import { useEffect, useState } from "react";
import { Upload, Plus, FileText } from "lucide-react";
import Link from "next/link";
import PageHero from '@/components/PageHero';

type Document = {
  id: string;
  file_name: string;
  doc_url: string;
  doc_type: string;
  uploaded_by: string;
  building_name: string;
};

export default function DocumentsInner() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const fetchDocs = async () => {
      const { supabase } = await import("@/utils/supabase");

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading documents:", error.message);
      } else {
        setDocuments(data || []);
      }
    };

    fetchDocs();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <PageHero
        title="Documents"
        subtitle="View and manage all uploaded documents"
        icon={<FileText className="h-8 w-8 text-white" />}
      />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">View and manage all uploaded documents</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/compliance/documents"
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </div>
        </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">All Documents</h2>
          <p className="text-sm text-gray-600 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        
        {documents.length === 0 ? (
          <div className="p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-500 mb-4">
              Upload your first document to get started.
            </p>
            <Link
              href="/compliance/documents"
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-4 font-medium text-gray-900">File Name</th>
                  <th className="p-4 font-medium text-gray-900">Type</th>
                  <th className="p-4 font-medium text-gray-900">Building</th>
                  <th className="p-4 font-medium text-gray-900">Uploaded By</th>
                  <th className="p-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{doc.file_name}</td>
                    <td className="p-4">{doc.doc_type}</td>
                    <td className="p-4">{doc.building_name}</td>
                    <td className="p-4">{doc.uploaded_by}</td>
                    <td className="p-4">
                      {doc.doc_url && (
                        <a
                          href={doc.doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
