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
  User,
  ArrowLeft
} from "lucide-react";

interface GeneratedDocument {
  id: string;
  template_id: string;
  building_id: string | null;
  filled_by: string;
  filepath: string;
  created_at: string;
  template: {
    name: string;
    type: string;
  };
  building: {
    name: string;
  } | null;
}

export default function CommunicationsLogPage() {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    fetchGeneratedDocuments();
  }, []);

  const fetchGeneratedDocuments = async () => {
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
        console.error('Error fetching generated documents:', error);
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.building?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || doc.template.type === selectedType;
    return matchesSearch && matchesType;
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDownloadUrl = (filepath: string) => {
    const { supabase } = require("@/utils/supabase");
    const { data } = supabase.storage
      .from('generated')
      .getPublicUrl(filepath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading generated documents...</p>
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
          Generated Documents
        </h1>
        <p className="text-gray-600">
          View and download all your generated communications and documents.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="welcome_letter">Welcome Letters</option>
            <option value="notice">Notices</option>
            <option value="form">Forms</option>
            <option value="invoice">Invoices</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-dark mb-1">
                      {doc.template.name}
                    </h3>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        <span>{doc.building?.name || 'No building specified'}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>{doc.filled_by}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge className={getTypeColor(doc.template.type)}>
                    {doc.template.type.replace('_', ' ')}
                  </Badge>
                  
                  <a
                    href={getDownloadUrl(doc.filepath)}
                    download
                    className="inline-flex items-center text-primary hover:text-dark"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </a>
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
            <h3 className="text-xl font-semibold text-dark mb-2">No generated documents found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Generate your first document using our templates."
              }
            </p>
            <Link href="/communications/templates">
              <Button className="bg-primary hover:bg-dark text-white">
                <FileText className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {documents.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-dark mb-4">Document Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{documents.length}</div>
                  <div className="text-sm text-gray-600">Total Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {documents.filter(d => d.template.type === 'welcome_letter').length}
                  </div>
                  <div className="text-sm text-gray-600">Welcome Letters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {documents.filter(d => d.template.type === 'notice').length}
                  </div>
                  <div className="text-sm text-gray-600">Notices</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {documents.filter(d => d.template.type === 'form').length}
                  </div>
                  <div className="text-sm text-gray-600">Forms</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 