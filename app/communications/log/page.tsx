"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar,
  Building2,
  Bot,
  Sparkles,
  Eye,
  Trash2
} from "lucide-react";

interface GeneratedDocument {
  id: string;
  template_id: string;
  building_id: string;
  filled_by: string;
  filepath: string;
  placeholder_data?: any;
  ai_generated: boolean;
  created_at: string;
  template?: {
    name: string;
    type: string;
  };
  building?: {
    name: string;
  };
}

export default function CommunicationsLogPage() {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showAiOnly, setShowAiOnly] = useState(false);
  const [buildings, setBuildings] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchBuildings();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('generated_documents')
        .select(`
          *,
          template:templates(name, type),
          building:buildings(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching buildings:', error);
      } else {
        setBuildings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.template?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.building?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = selectedBuilding === "all" || doc.building_id === selectedBuilding;
    const matchesType = selectedType === "all" || doc.template?.type === selectedType;
    const matchesAi = !showAiOnly || doc.ai_generated;
    
    return matchesSearch && matchesBuilding && matchesType && matchesAi;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "welcome_letter":
        return "bg-blue-100 text-blue-800";
      case "notice":
        return "bg-yellow-100 text-yellow-800";
      case "form":
        return "bg-green-100 text-green-800";
      case "invoice":
        return "bg-purple-100 text-purple-800";
      case "section_20":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const downloadDocument = async (filepath: string, filename: string) => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase.storage
        .from('generated')
        .download(filepath);

      if (error) {
        console.error('Error downloading document:', error);
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { error } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
      } else {
        // Refresh the list
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/communications/templates" className="inline-flex items-center text-primary hover:text-dark mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Link>
        
        <h1 className="text-3xl font-brand font-bold text-dark mb-2">
          Communications Log
        </h1>
        <p className="text-gray-600">
          View and manage all generated documents. Track AI-generated vs manual documents.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by template name or building..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button className="bg-primary hover:bg-dark text-white px-6 py-2 rounded-lg flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Generate New</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Building Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="welcome_letter">Welcome Letters</option>
            <option value="notice">Notices</option>
            <option value="form">Forms</option>
            <option value="invoice">Invoices</option>
            <option value="section_20">Section 20</option>
          </select>
        </div>

        {/* AI Filter */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="aiOnly"
            checked={showAiOnly}
            onChange={(e) => setShowAiOnly(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="aiOnly" className="text-sm font-medium text-gray-700">
            AI Generated Only
          </label>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-dark">{documents.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Generated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {documents.filter(d => d.ai_generated).length}
                </p>
              </div>
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {documents.filter(d => {
                    const docDate = new Date(d.created_at);
                    const now = new Date();
                    return docDate.getMonth() === now.getMonth() && 
                           docDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Buildings</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(documents.map(d => d.building_id)).size}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-dark">
                      {doc.template?.name || 'Unknown Template'}
                    </h3>
                    {doc.ai_generated && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI</span>
                      </Badge>
                    )}
                    <Badge className={getTypeColor(doc.template?.type || 'unknown')}>
                      {doc.template?.type?.replace('_', ' ') || 'Unknown'}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        {doc.building?.name || 'Unknown Building'}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <span>Generated by: {doc.filled_by}</span>
                    </div>
                  </div>

                  {/* Placeholder Data Preview */}
                  {doc.placeholder_data && (
                    <div className="mb-3">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          View placeholder data
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded border text-xs">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(doc.placeholder_data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadDocument(doc.filepath, `${doc.template?.name || 'document'}.docx`)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark mb-2">No documents found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedBuilding !== "all" || selectedType !== "all" || showAiOnly
                ? "Try adjusting your search or filter criteria."
                : "Get started by generating your first document."
              }
            </p>
            <Link href="/communications/templates">
              <Button className="bg-primary hover:bg-dark text-white">
                <FileText className="w-4 h-4 mr-2" />
                Generate Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 