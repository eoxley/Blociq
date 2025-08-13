"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

interface MajorWorksProject {
  id: string;
  name: string;
  building_id: string;
  building_name: string;
}

export default function DocumentUploadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<MajorWorksProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    document_tag: 'other',
    description: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('major_works_projects')
        .select(`
          id,
          name,
          building_id,
          buildings:building_id(name)
        `)
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project details');
      } else {
        setProject({
          ...data,
          building_name: data.buildings?.[0]?.name || 'Unknown'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, DOCX, XLSX, or image files.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large. Please upload files smaller than 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !project) return;

    setUploading(true);
    try {
      const { supabase } = await import("@/utils/supabase");
      
      // 1. Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}_${selectedFile.name}`;
      const filePath = `major-works-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('major-works-documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('major-works-documents')
        .getPublicUrl(filePath);

      // 3. Save document record to database
      const { error: insertError } = await supabase
        .from('major_works_documents')
        .insert({
          project_id: projectId,
          building_id: project.building_id,
          file_name: selectedFile.name,
          file_url: urlData.publicUrl,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          document_tag: uploadData.document_tag,
          description: uploadData.description,
          uploaded_by: 'current_user' // TODO: Get actual user ID
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('Document uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setUploadData({
        document_tag: 'other',
        description: ''
      });

      // Redirect back to project details
      router.push(`/major-works/${projectId}`);

    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentTagColor = (tag: string) => {
    switch (tag) {
      case 'scope':
        return 'bg-blue-100 text-blue-800';
      case 'quote':
        return 'bg-green-100 text-green-800';
      case 'notice':
        return 'bg-yellow-100 text-yellow-800';
      case 'correspondence':
        return 'bg-purple-100 text-purple-800';
      case 'contract':
        return 'bg-orange-100 text-orange-800';
      case 'invoice':
        return 'bg-red-100 text-red-800';
      case 'photo':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark mb-4">Project not found</h1>
          <Link href="/major-works">
            <Button className="bg-primary hover:bg-dark text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Major Works
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/major-works/${projectId}`} className="inline-flex items-center text-primary hover:text-dark mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Project
        </Link>
        
        <div>
          <h1 className="text-3xl font-brand font-bold text-dark mb-2">
            Upload Document
          </h1>
          <p className="text-gray-600">
            Upload documents for {project.name} at {project.building_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div>
              <Label>Select File</Label>
              <div
                className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : selectedFile 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-medium text-green-900">{selectedFile.name}</p>
                      <p className="text-sm text-green-700">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedFile(null)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Drop your file here, or click to browse
                      </p>
                      <p className="text-sm text-gray-600">
                        PDF, DOCX, XLSX, or image files up to 10MB
                      </p>
                    </div>
                    <Button
                      onClick={() => document.getElementById('file-input')?.click()}
                      variant="outline"
                    >
                      Choose File
                    </Button>
                    <input
                      id="file-input"
                      type="file"
                      className="hidden"
                      onChange={handleFileInput}
                      accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.gif"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Document Tag */}
            <div>
              <Label htmlFor="document_tag">Document Type</Label>
              <select
                id="document_tag"
                value={uploadData.document_tag}
                onChange={(e) => setUploadData(prev => ({ ...prev, document_tag: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="scope">Scope of Works</option>
                <option value="quote">Quote/Estimate</option>
                <option value="notice">Section 20 Notice</option>
                <option value="correspondence">Correspondence</option>
                <option value="contract">Contract</option>
                <option value="invoice">Invoice</option>
                <option value="photo">Photo</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a description for this document..."
                rows={3}
              />
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-primary hover:bg-dark text-white"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Document Types Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Document Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('scope')}>Scope</Badge>
                <span className="text-sm text-gray-600">Scope of works and specifications</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('quote')}>Quote</Badge>
                <span className="text-sm text-gray-600">Contractor quotes and estimates</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('notice')}>Notice</Badge>
                <span className="text-sm text-gray-600">Section 20 notices and legal documents</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('correspondence')}>Correspondence</Badge>
                <span className="text-sm text-gray-600">Letters, emails, and communications</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('contract')}>Contract</Badge>
                <span className="text-sm text-gray-600">Contractor agreements and contracts</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('invoice')}>Invoice</Badge>
                <span className="text-sm text-gray-600">Invoices and payment documents</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getDocumentTagColor('photo')}>Photo</Badge>
                <span className="text-sm text-gray-600">Progress photos and site images</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Upload Guidelines</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Supported formats: PDF, DOCX, XLSX, JPG, PNG, GIF</li>
                <li>• Maximum file size: 10MB</li>
                <li>• Use descriptive filenames</li>
                <li>• Tag documents appropriately for easy organization</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 