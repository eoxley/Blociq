"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";

interface TemplateUploaderProps {
  onUploadComplete?: () => void;
}

export default function TemplateUploader({ onUploadComplete }: TemplateUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "welcome_letter",
    description: ""
  });

  const templateTypes = [
    { value: "welcome_letter", label: "Welcome Letter" },
    { value: "notice", label: "Notice" },
    { value: "form", label: "Form" },
    { value: "invoice", label: "Invoice" }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.docx')) {
        toast.error('Please select a .docx file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      
      // Auto-fill name if not already set
      if (!formData.name) {
        const fileName = selectedFile.name.replace('.docx', '').replace(/_/g, ' ');
        setFormData(prev => ({ ...prev, name: fileName }));
      }
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setUploading(true);

    try {
      const { supabase } = await import("@/utils/supabase");

      // 1. Upload file to storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${formData.name.replace(/\s+/g, '_')}_${timestamp}.docx`;
      const filePath = `templates/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Create template record in database
      const { data: templateData, error: dbError } = await supabase
        .from('templates')
        .insert({
          name: formData.name,
          type: formData.type,
          description: formData.description,
          storage_path: filePath
        })
        .select()
        .single();

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage.from('templates').remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      toast.success('Template uploaded successfully!');
      
      // Reset form
      setFile(null);
      setFormData({
        name: "",
        type: "welcome_letter",
        description: ""
      });

      // Call callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">Upload Template</h3>
        
        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template File (.docx)
          </label>
          
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors duration-200">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Click to select or drag and drop a .docx file
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Maximum file size: 10MB
              </p>
              <input
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                className="hidden"
                id="template-file"
              />
              <label htmlFor="template-file">
                <Button variant="outline" className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Select File
                </Button>
              </label>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-dark">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleFormChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {templateTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Describe what this template is used for"
              rows={3}
            />
          </div>
        </div>

        {/* Upload Button */}
        <div className="mt-6">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-primary hover:bg-dark text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Template
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Template Guidelines</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use .docx format only</li>
            <li>• Include placeholders like {{building_name}}, {{leaseholder_name}}</li>
            <li>• Keep file size under 10MB</li>
            <li>• Test your template before uploading</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 