"use client";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, Download, Calendar, Building, User, Sparkles } from "lucide-react";

type ComplianceDocument = {
  id: string;
  doc_type: string | null;
  doc_url: string | null;
  start_date: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  building_id: number | null;
  created_at: string | null;
  building_name?: string;
  uploaded_by_name?: string;
};

interface ComplianceDocumentsListProps {
  buildingId?: number;
  showUploadButton?: boolean;
  onUploadSuccess?: () => void;
}

export default function ComplianceDocumentsList({ 
  buildingId, 
  showUploadButton = false,
  onUploadSuccess 
}: ComplianceDocumentsListProps) {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchDocuments();
  }, [buildingId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('compliance_docs')
        .select(`
          *,
          buildings!compliance_docs_building_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching compliance documents:', error);
        return;
      }

      // Transform the data to include building names
      const transformedDocs = data?.map(doc => ({
        ...doc,
        building_name: doc.buildings?.name || 'Unknown Building'
      })) || [];

      setDocuments(transformedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDocumentTypeColor = (docType: string | null) => {
    if (!docType) return 'bg-gray-100 text-gray-800';
    
    const type = docType.toLowerCase();
    if (type.includes('fire')) return 'bg-red-100 text-red-800';
    if (type.includes('electrical') || type.includes('eicr')) return 'bg-yellow-100 text-yellow-800';
    if (type.includes('gas')) return 'bg-orange-100 text-orange-800';
    if (type.includes('asbestos')) return 'bg-purple-100 text-purple-800';
    if (type.includes('insurance')) return 'bg-blue-100 text-blue-800';
    if (type.includes('lift')) return 'bg-indigo-100 text-indigo-800';
    if (type.includes('legionella')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil === null) return null;
    
    if (daysUntil < 0) return { status: 'overdue', text: `Overdue by ${Math.abs(daysUntil)} days`, color: 'text-red-600' };
    if (daysUntil <= 30) return { status: 'due-soon', text: `Due in ${daysUntil} days`, color: 'text-yellow-600' };
    return { status: 'valid', text: `Valid for ${daysUntil} days`, color: 'text-green-600' };
  };

  const handleUploadSuccess = () => {
    setShowUploader(false);
    fetchDocuments();
    onUploadSuccess?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Compliance Documents</h2>
          <p className="text-sm text-gray-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {showUploadButton && (
          <Button 
            onClick={() => setShowUploader(!showUploader)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Upload Section */}
      {showUploadButton && showUploader && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Document</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              Upload a compliance document and our AI will automatically analyze it to extract key information.
            </p>
            {/* Note: You would need to import and use your SmartUploader component here */}
            <p className="text-sm text-gray-500 italic">
              Uploader component would be integrated here
            </p>
          </div>
        </Card>
      )}

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiry_date);
            
            return (
              <Card key={doc.id} className="p-6 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <Badge className={getDocumentTypeColor(doc.doc_type)}>
                        {doc.doc_type || 'Unknown Type'}
                      </Badge>
                      {doc.doc_type && doc.doc_type !== 'Unknown' && (
                        <Sparkles className="h-4 w-4 text-teal-500" />
                      )}
                    </div>
                    
                    {!buildingId && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Building className="h-4 w-4 mr-1" />
                        {doc.building_name}
                      </div>
                    )}
                  </div>
                  
                  {doc.doc_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={doc.doc_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Dates */}
                <div className="space-y-2 mb-4">
                  {doc.start_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Issue: {formatDate(doc.start_date)}</span>
                    </div>
                  )}
                  
                  {doc.expiry_date && (
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className={expiryStatus?.color || 'text-gray-600'}>
                        Expiry: {formatDate(doc.expiry_date)}
                      </span>
                    </div>
                  )}
                  
                  {expiryStatus && (
                    <div className={`text-xs font-medium ${expiryStatus.color}`}>
                      {expiryStatus.text}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {doc.uploaded_by ? 'Uploaded by user' : 'Unknown user'}
                  </div>
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance documents found</h3>
          <p className="text-gray-500 mb-4">
            {buildingId 
              ? "Upload compliance documents for this building to get started."
              : "No compliance documents have been uploaded yet."
            }
          </p>
          {showUploadButton && (
            <Button 
              onClick={() => setShowUploader(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          )}
        </Card>
      )}
    </div>
  );
} 