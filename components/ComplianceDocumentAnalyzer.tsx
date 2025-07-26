"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Download, Calendar } from "lucide-react";
import { handleUploadComplete, updateDocumentWithAIAnalysis } from "@/lib/aiDocumentAnalysis";
import { supabase } from '@/lib/supabaseClient';
import { toast } from "sonner";
import DocumentTypeSelector from "./DocumentTypeSelector";

type ComplianceDocument = {
  id: string;
  doc_type: string | null;
  doc_url: string | null;
  start_date: string | null;
  expiry_date: string | null;
  created_at: string | null;
  building_name?: string;
};

interface ComplianceDocumentAnalyzerProps {
  documents: ComplianceDocument[];
  onAnalysisComplete?: () => void;
}

export default function ComplianceDocumentAnalyzer({ 
  documents, 
  onAnalysisComplete 
}: ComplianceDocumentAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string>("");

  const handleAnalyseDocument = async (documentId: string) => {
    setAnalyzing(documentId);
    
    try {
      toast.info("Analysing document with AI...");
      
      // Call the AI analysis endpoint
      const result = await handleUploadComplete(documentId);
      
      if (result.success) {
        // Check if AI couldn't detect the document type
        if (!result.data.doc_type || result.data.doc_type === 'Unknown' || result.data.doc_type === 'null') {
          console.log("⚠️ AI couldn't detect document type, showing manual selector");
          setCurrentDocumentId(documentId);
          setShowTypeSelector(true);
          setAnalyzing(null);
          return;
        }
        
        // Update the document with AI results
        const updateSuccess = await updateDocumentWithAIAnalysis(
          documentId, 
          result.data, 
          supabase
        );
        
        if (updateSuccess) {
          setAnalysisResults(prev => ({
            ...prev,
            [documentId]: result.data
          }));
          
          toast.success(`Document analysed! Type: ${result.data.doc_type || 'Unknown'}`);
          onAnalysisComplete?.();
        } else {
          toast.warning("Analysis complete, but failed to update document");
        }
      } else {
        toast.error(`Analysis failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  const handleTypeSelected = (docType: string) => {
    console.log("✅ User selected document type:", docType);
    toast.success(`Document type updated to ${docType}`);
    setShowTypeSelector(false);
    onAnalysisComplete?.();
  };

  const handleReanalyse = async () => {
    if (!currentDocumentId) return;
    
    try {
      toast.info("Re-analysing document with AI...");
      
      const result = await handleUploadComplete(currentDocumentId);
      
      if (result.success) {
        if (result.data.doc_type && result.data.doc_type !== 'Unknown' && result.data.doc_type !== 'null') {
          // AI found a type, update the database
          const updateSuccess = await updateDocumentWithAIAnalysis(
            currentDocumentId, 
            result.data, 
            supabase
          );
          
          if (updateSuccess) {
            toast.success(`AI re-analysis successful! Type: ${result.data.doc_type}`);
            setShowTypeSelector(false);
            onAnalysisComplete?.();
          }
        } else {
          // AI still couldn't detect, show selector again
          setShowTypeSelector(true);
        }
      } else {
        toast.error("Re-analysis failed");
      }
    } catch (error) {
      console.error("Re-analysis error:", error);
      toast.error("Re-analysis failed");
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

  if (documents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents to analyze</h3>
        <p className="text-gray-500">Upload some compliance documents to get started with AI analysis.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI Document Analysis</h2>
          <p className="text-sm text-gray-600">
            Analyze existing documents with AI to extract key information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => {
          const isAnalyzing = analyzing === doc.id;
          const hasAnalysis = analysisResults[doc.id];
          
          return (
            <Card key={doc.id} className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <Badge className={getDocumentTypeColor(doc.doc_type)}>
                      {doc.doc_type || 'Unknown Type'}
                    </Badge>
                    {hasAnalysis && (
                      <Sparkles className="h-4 w-4 text-teal-500" />
                    )}
                  </div>
                  
                  {doc.building_name && (
                    <p className="text-sm text-gray-600">{doc.building_name}</p>
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
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Expiry: {formatDate(doc.expiry_date)}</span>
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              {hasAnalysis && (
                <div className="mb-4 p-3 bg-teal-50 rounded-lg">
                  <h4 className="text-sm font-medium text-teal-900 mb-2">AI Analysis Results</h4>
                  <div className="space-y-1 text-xs text-teal-800">
                    {hasAnalysis.doc_type && hasAnalysis.doc_type !== 'Unknown' && (
                      <div><strong>Type:</strong> {hasAnalysis.doc_type}</div>
                    )}
                    {hasAnalysis.issue_date && hasAnalysis.issue_date !== 'Not found' && (
                      <div><strong>Issue Date:</strong> {hasAnalysis.issue_date}</div>
                    )}
                    {hasAnalysis.expiry_date && hasAnalysis.expiry_date !== 'Not found' && (
                      <div><strong>Expiry Date:</strong> {hasAnalysis.expiry_date}</div>
                    )}
                    {hasAnalysis.compliance_status && (
                      <div><strong>Status:</strong> {hasAnalysis.compliance_status}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={() => handleAnalyseDocument(doc.id)}
                disabled={isAnalyzing}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : hasAnalysis ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Re-analyze
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Document Type Selector Modal */}
      <DocumentTypeSelector
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        documentId={currentDocumentId}
        onTypeSelected={handleTypeSelected}
                        onReanalyse={handleReanalyse}
      />
    </div>
  );
} 