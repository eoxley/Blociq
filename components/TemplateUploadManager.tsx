"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, Eye, Edit3, Sparkles, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  content_text: string;
  placeholders: string[];
  is_ai_generated: boolean;
  created_at: string;
  file_url?: string;
}

interface UploadedFile {
  file: File;
  preview: string;
}

export default function TemplateUploadManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'letter',
    description: '',
    isBuildingSpecific: false
  });
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateTypes = [
    { value: 'letter', label: 'Letter', icon: '✉️' },
    { value: 'notice', label: 'Notice', icon: '📢' },
    { value: 'form', label: 'Form', icon: '📝' },
    { value: 'invoice', label: 'Invoice', icon: '💰' },
    { value: 'legal_notice', label: 'Legal Notice', icon: '⚖️' },
    { value: 'section_20', label: 'Section 20', icon: '📋' },
    { value: 'welcome_letter', label: 'Welcome Letter', icon: '🏠' },
    { value: 'custom', label: 'Custom', icon: '🔧' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Auto-fill template name from filename
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
      setTemplateForm(prev => ({ ...prev, name: name }));
      
      // Create preview (for text files) or placeholder
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedFile({
            file,
            preview: e.target?.result as string
          });
        };
        reader.readAsText(file);
      } else {
        setSelectedFile({
          file,
          preview: `[${file.name}] - ${file.type} file`
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateForm.name.trim()) {
      toast.error('Please select a file and provide a template name');
      return;
    }

    setUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile.file);
      formData.append('templateData', JSON.stringify({
        name: templateForm.name,
        type: templateForm.type,
        description: templateForm.description,
        isBuildingSpecific: templateForm.isBuildingSpecific
      }));

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload template');
      }

      const result = await response.json();
      
      // Add to templates list
      setTemplates(prev => [result.template, ...prev]);
      
      // Reset form
      setTemplateForm({
        name: '',
        type: 'letter',
        description: '',
        isBuildingSpecific: false
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Template uploaded successfully! 🎉');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload template: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEnhanceTemplate = async (template: Template) => {
    try {
      const response = await fetch('/api/templates/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          enhancementPrompt: 'Enhance this template with better placeholders and professional structure'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance template');
      }

      const result = await response.json();
      
      // Update templates list
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? result.template : t
      ));
      
      toast.success('Template enhanced with AI! 🤖');
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance template: ' + error.message);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete template: ' + error.message);
    }
  };

  const getTypeIcon = (type: string) => {
    const templateType = templateTypes.find(t => t.value === type);
    return templateType?.icon || '📄';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          Template Upload Manager
        </h1>
        <p className="text-gray-600 text-lg">
          Upload your own document templates and integrate them with AI generation
        </p>
      </div>

      {/* Upload Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="template-file" className="text-base font-medium">
              Select Document Template
            </Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                id="template-file"
                type="file"
                accept=".docx,.doc,.txt,.rtf"
                onChange={handleFileSelect}
                className="flex-1"
                disabled={uploading}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Browse Files
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Supported formats: .docx, .doc, .txt, .rtf (max 10MB)
            </p>
          </div>

          {/* Template Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name" className="text-base font-medium">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Section 20 Notice Template"
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-type" className="text-base font-medium">
                Template Type
              </Label>
              <Select 
                value={templateForm.type} 
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, type: value }))}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description" className="text-base font-medium">
              Description
            </Label>
            <Textarea
              id="template-description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this template is for and when to use it"
              className="min-h-20"
              disabled={uploading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="building-specific"
              checked={templateForm.isBuildingSpecific}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, isBuildingSpecific: e.target.checked }))}
              disabled={uploading}
            />
            <Label htmlFor="building-specific" className="text-sm">
              This template is building-specific (contains building placeholders)
            </Label>
          </div>

          {/* File Preview */}
          {selectedFile && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                File Preview
              </Label>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{selectedFile.file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {selectedFile.file.type === 'text/plain' && (
                  <div className="max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {selectedFile.preview}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !templateForm.name.trim()}
              size="lg"
              className="px-8 py-3"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Uploading Template...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Template
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Templates ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No templates uploaded yet</p>
              <p className="text-sm">Upload your first template above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getTypeIcon(template.type)}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500">{template.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>Type: {template.type.replace('_', ' ')}</span>
                        <span>Placeholders: {template.placeholders?.length || 0}</span>
                        <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                        {template.is_ai_generated && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            AI Generated
                          </Badge>
                        )}
                      </div>

                      {/* Placeholders Preview */}
                      {template.placeholders && template.placeholders.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-xs font-medium text-gray-500 mb-1 block">
                            Available Placeholders:
                          </Label>
                          <div className="flex flex-wrap gap-1">
                            {template.placeholders.map((placeholder, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {placeholder}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEnhanceTemplate(template)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Enhance
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  {showPreview === template.id && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Template Content:
                      </Label>
                      <div className="bg-white border rounded-lg p-3 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                          {template.content_text}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Integration Info */}
      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Sparkles className="h-5 w-5" />
            AI Integration Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="font-medium text-blue-800 mb-2">AI Enhancement</h4>
              <p className="text-sm text-blue-700">
                Use AI to improve your templates with better placeholders and structure
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🏢</div>
              <h4 className="font-medium text-blue-800 mb-2">Building Integration</h4>
              <p className="text-sm text-blue-700">
                Automatically populate building data when generating documents
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📝</div>
              <h4 className="font-medium text-blue-800 mb-2">Smart Generation</h4>
              <p className="text-sm text-blue-700">
                Create documents from your templates using natural language
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
