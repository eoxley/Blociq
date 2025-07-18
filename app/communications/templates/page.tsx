"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building2
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  storage_path: string;
  created_at: string;
}

const templateTypes = [
  { value: "all", label: "All Types", icon: FileText },
  { value: "welcome_letter", label: "Welcome Letters", icon: Mail },
  { value: "notice", label: "Notices", icon: AlertTriangle },
  { value: "form", label: "Forms", icon: CheckCircle },
  { value: "invoice", label: "Invoices", icon: Calendar }
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
      } else {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || template.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "welcome_letter":
        return <Mail className="w-5 h-5" />;
      case "notice":
        return <AlertTriangle className="w-5 h-5" />;
      case "form":
        return <CheckCircle className="w-5 h-5" />;
      case "invoice":
        return <Calendar className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-brand font-bold text-dark mb-2">
          Communication Templates
        </h1>
        <p className="text-gray-600">
          Create professional communications using our pre-built templates. Generate letters, notices, and forms for your properties.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button className="bg-primary hover:bg-dark text-white px-6 py-2 rounded-lg flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Upload Template</span>
        </Button>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {templateTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                selectedType === type.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  {getTypeIcon(template.type)}
                </div>
                <Badge className={getTypeColor(template.type)}>
                  {template.type.replace('_', ' ')}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-dark mb-2">
                {template.name}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {template.description}
              </p>
              
              <div className="flex items-center text-xs text-gray-500 mb-4">
                <Calendar className="w-3 h-3 mr-1" />
                <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
              </div>
              
              <Link href={`/communications/templates/${template.id}`}>
                <Button className="w-full bg-primary hover:bg-dark text-white">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Document
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-dark mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Get started by uploading your first template."
              }
            </p>
            <Button className="bg-primary hover:bg-dark text-white">
              <Plus className="w-4 h-4 mr-2" />
              Upload Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mt-12">
        <Card className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors duration-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark mb-2">
              Need a Custom Template?
            </h3>
            <p className="text-gray-600 mb-4">
              Upload your own .docx template with placeholders to create personalized communications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-primary hover:bg-dark text-white">
                <Plus className="w-4 h-4 mr-2" />
                Upload Template
              </Button>
              <Link href="/communications/log">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View Generated Documents
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 