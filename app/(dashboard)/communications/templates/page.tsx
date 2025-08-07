"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Plus, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Bot,
  Sparkles,
  Eye,
  Edit3
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  storage_path: string;
  content_text?: string;
  placeholders?: string[];
  created_at: string;
}

const templateTypes = [
  { value: "all", label: "All Types", icon: FileText },
  { value: "welcome_letter", label: "Welcome Letters", icon: Mail },
  { value: "notice", label: "Notices", icon: AlertTriangle },
  { value: "form", label: "Forms", icon: CheckCircle },
  { value: "invoice", label: "Invoices", icon: Calendar },
  { value: "section_20", label: "Section 20", icon: AlertTriangle }
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showContent, setShowContent] = useState<string | null>(null);

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
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.content_text && template.content_text.toLowerCase().includes(searchTerm.toLowerCase()));
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
      case "section_20":
        return <AlertTriangle className="w-5 h-5" />;
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
      case "section_20":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
            placeholder="Search templates by name, description, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Link href="/communications/templates/upload">
          <Button className="bg-primary hover:bg-dark text-white px-6 py-2 rounded-lg flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Upload Template</span>
          </Button>
        </Link>
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
                <Badge variant="outline" className={getTypeColor(template.type)}>
                  {template.type.replace('_', ' ')}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-dark mb-2">
                {template.name}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {template.description}
              </p>

              {/* Template Content Preview */}
              {template.content_text && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Content Preview:</span>
                    <button
                      onClick={() => setShowContent(showContent === template.id ? null : template.id)}
                      className="text-xs text-primary hover:text-dark flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{showContent === template.id ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  {showContent === template.id ? (
                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                      {template.content_text}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      {truncateText(template.content_text, 80)}
                    </div>
                  )}
                </div>
              )}

              {/* Placeholders */}
              {template.placeholders && template.placeholders.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-medium text-gray-700 block mb-2">
                    Placeholders ({template.placeholders.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {template.placeholders.slice(0, 3).map((placeholder, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {placeholder}
                      </Badge>
                    ))}
                    {template.placeholders.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.placeholders.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center text-xs text-gray-500 mb-4">
                <Calendar className="w-3 h-3 mr-1" />
                <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
              </div>
              
              <div className="flex space-x-2">
                <Link href={`/communications/templates/${template.id}`} className="flex-1">
                  <Button className="w-full bg-primary hover:bg-dark text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Document
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-3"
                  title="AI Assistant"
                >
                  <Bot className="w-4 h-4" />
                </Button>
              </div>
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

      {/* AI Features Card */}
      <div className="mt-8">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark">AI-Powered Features</h3>
                <p className="text-sm text-gray-600">Enhance your templates with AI assistance</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Edit3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-dark mb-1">Rewrite Templates</h4>
                <p className="text-xs text-gray-600">AI can rewrite and improve your templates</p>
              </div>
              <div className="text-center">
                <Search className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-medium text-dark mb-1">Smart Search</h4>
                <p className="text-xs text-gray-600">Find the perfect template for your needs</p>
              </div>
              <div className="text-center">
                <Plus className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium text-dark mb-1">Create New</h4>
                <p className="text-xs text-gray-600">Generate new templates from scratch</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 