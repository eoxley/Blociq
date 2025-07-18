"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  Edit3
} from "lucide-react";
import { toast } from "sonner";

interface TemplateUploaderProps {
  onUploadComplete?: () => void;
}

interface ExtractedData {
  content: string;
  placeholders: string[];
}

export default function TemplateUploader({ onUploadComplete }: TemplateUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "notice",
    description: ""
  });
  const [showPreview, setShowPreview] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file');
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      // Extract text and placeholders from the DOCX file
      const extracted = await extractFromDocx(file);
      setExtractedData(extracted);
      toast.success('Template analyzed successfully!');
    } catch (error) {
      console.error('Error extracting from DOCX:', error);
      toast.error('Failed to analyze template');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });

  const extractFromDocx = async (file: File): Promise<ExtractedData> => {
    // For now, we'll use a simple text extraction
    // In production, you'd want to use a proper DOCX parser
    const text = await file.text();
    
    // Extract placeholders using regex
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholder = match[1].trim();
      if (!placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    return {
      content: text,
      placeholders: placeholders
    };
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpload = async () => {
    if (!uploadedFile || !extractedData) {
      toast.error('Please upload a template file first');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setUploading(true);

    try {
      const { supabase } = await import("@/utils/supabase");

      // 1. Upload file to Supabase storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${formData.name.replace(/\s+/g, '_')}_${timestamp}.docx`;
      const filePath = `templates/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, uploadedFile, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Failed to upload file');
      }

      // 2. Save template metadata to database
      const { data: template, error: dbError } = await supabase
        .from('templates')
        .insert({
          name: formData.name,
          type: formData.type,
          description: formData.description,
          storage_path: filePath,
          content_text: extractedData.content,
          placeholders: extractedData.placeholders
        })
        .select()
        .single();

      if (dbError) {
        throw new Error('Failed to save template metadata');
      }

      // 3. Generate embeddings for semantic search
      try {
        await fetch('/api/generate-embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: template.id })
        });
      } catch (embeddingError) {
        console.warn('Failed to generate embeddings:', embeddingError);
        // Don't fail the upload, embeddings can be generated later
      }

      toast.success('Template uploaded successfully!');
      
      // Reset form
      setUploadedFile(null);
      setExtractedData(null);
      setFormData({ name: "", type: "notice", description: "" });
      
      // Callback to refresh parent component
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setExtractedData(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 cursor-pointer ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <p className="text-gray-600">Analyzing template...</p>
              </div>
            ) : uploadedFile ? (
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the template here' : 'Drag & drop a .docx template'}
                  </p>
                  <p className="text-sm text-gray-600">
                    or click to browse files
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Only .docx files are supported
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Details Form */}
      {uploadedFile && extractedData && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Template Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="e.g., Service Charge Notice"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="welcome_letter">Welcome Letter</option>
                    <option value="notice">Notice</option>
                    <option value="form">Form</option>
                    <option value="invoice">Invoice</option>
                    <option value="section_20">Section 20</option>
                    <option value="legal_notice">Legal Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Brief description of this template..."
                    rows={3}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Extracted Data Preview */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detected Placeholders ({extractedData.placeholders.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.placeholders.length > 0 ? (
                      extractedData.placeholders.map((placeholder, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {placeholder}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No placeholders detected</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Content Preview
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      {showPreview ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  {showPreview && (
                    <div className="max-h-32 overflow-y-auto p-3 bg-gray-50 rounded border text-sm text-gray-700">
                      {extractedData.content.length > 500 
                        ? `${extractedData.content.substring(0, 500)}...`
                        : extractedData.content
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-6">
              <Button
                onClick={handleUpload}
                disabled={uploading || !formData.name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Template...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Template
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 