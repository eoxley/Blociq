"use client";

import React, { useState, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Paperclip,
  Brain,
  Building,
  Calendar,
  User,
  File,
  Download,
  Eye,
  Link,
  Unlink,
  MessageSquare
} from "lucide-react";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { BlocIQBadge } from "@/components/ui/blociq-badge";
import { toast } from "sonner";

interface SmartUploaderProps {
  buildingId?: string;
  documentType?: 'building' | 'compliance' | 'general';
  onUploadComplete?: (document: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  multiple?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  showPreview?: boolean;
  autoClassify?: boolean;
  customStoragePath?: string;
  allowUnlinked?: boolean; // New prop to allow unlinked uploads
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploaded_at: string;
  classification?: string;
  extracted_text?: string;
  summary?: string;
  metadata?: any;
  is_unlinked?: boolean;
  building_id?: string | null;
}

export default function SmartUploader({
  buildingId,
  documentType = 'general',
  onUploadComplete,
  onUploadError,
  className = "",
  multiple = false,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 10, // 10MB default
  showPreview = true,
  autoClassify = true,
  customStoragePath,
  allowUnlinked = true // Default to allowing unlinked uploads
}: SmartUploaderProps) {
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const uploadPromises = fileArray.map(async (file, index) => {
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          throw new Error(validationError);
        }

        // Determine if this is an unlinked upload
        const isUnlinked = !buildingId || !allowUnlinked;

        // Generate file path
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = customStoragePath 
          ? `${customStoragePath}/${fileName}`
          : isUnlinked
            ? `unlinked/${documentType}/${fileName}`
            : `${documentType}/${buildingId}/${fileName}`;

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);

        // Save metadata to database
        const documentData = {
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          file_url: publicUrl,
          building_id: isUnlinked ? null : buildingId,
          document_type: documentType,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
          status: 'uploaded',
          is_unlinked: isUnlinked
        };

        let tableName = 'building_documents'; // Always use building_documents for consistency
        if (documentType === 'compliance') {
          tableName = 'compliance_documents';
        } else if (documentType === 'general') {
          tableName = 'general_documents';
        }

        const { data: savedDocument, error: saveError } = await supabase
          .from(tableName)
          .insert(documentData)
          .select()
          .single();

        if (saveError) {
          throw new Error(`Failed to save metadata: ${saveError.message}`);
        }

        // AI Classification and extraction
        let classification = null;
        let extractedText = null;
        let summary = null;

        if (autoClassify && (file.type === 'application/pdf' || file.type.includes('text'))) {
          try {
            const aiResponse = await fetch("/api/classify-document", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                documentId: savedDocument.id,
                filePath: filePath,
                documentType: documentType,
                isUnlinked: isUnlinked,
                buildingId: buildingId || null
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              classification = aiData.classification;
              extractedText = aiData.extracted_text;
              summary = aiData.summary;

              // Update document with AI results
              await supabase
                .from(tableName)
                .update({
                  classification: classification,
                  extracted_text: extractedText,
                  summary: summary,
                  ai_processed_at: new Date().toISOString(),
                  status: 'processed'
                })
                .eq('id', savedDocument.id);
            }
          } catch (aiError) {
            console.warn("AI processing failed:", aiError);
            // Continue without AI processing
          }
        }

        const uploadedFile: UploadedFile = {
          id: savedDocument.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          path: filePath,
          uploaded_at: savedDocument.uploaded_at,
          classification: classification,
          extracted_text: extractedText,
          summary: summary,
          metadata: savedDocument,
          is_unlinked: isUnlinked,
          building_id: savedDocument.building_id
        };

        return uploadedFile;
      });

      const results = await Promise.all(uploadPromises);
      
      setUploadedFiles(prev => [...prev, ...results]);
      
      // Call success callback
      results.forEach(file => {
        onUploadComplete?.(file);
      });

      // Show success message with unlinked status
      results.forEach(file => {
        if (file.is_unlinked) {
          toast.success(
            `Document uploaded successfully! This document is not linked to a specific building but can still be processed and accessed.`,
            {
              duration: 5000,
              action: {
                label: "View",
                onClick: () => window.open(file.url, '_blank')
              }
            }
          );
        } else {
          toast.success(
            `Document uploaded successfully${file.classification ? ` and classified as: ${file.classification}` : ''}`,
            {
              duration: 3000
            }
          );
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      console.error("Upload error:", error);
      
      onUploadError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [buildingId, documentType, acceptedFileTypes, maxFileSize, customStoragePath, autoClassify, allowUnlinked, onUploadComplete, onUploadError, supabase]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input value to allow same file selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove uploaded file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('image')) return <FileText className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-[#008C8F] bg-gradient-to-br from-[#F0FDFA] to-blue-50'
            : 'border-[#E2E8F0] bg-white hover:border-[#008C8F] hover:bg-[#FAFAFA]'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          multiple={multiple}
          accept={acceptedFileTypes.join(',')}
        />

        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto shadow-lg">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-white" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#333333] mb-2">
              {uploading ? 'Uploading Files...' : 'Upload Documents'}
            </h3>
            <p className="text-[#64748B] mb-4">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[#008C8F] hover:text-[#007BDB] font-medium underline"
              >
                click to browse
              </button>
            </p>
          </div>

          <div className="text-xs text-[#64748B] space-y-1">
            <p>Supported formats: {acceptedFileTypes.join(', ')}</p>
            <p>Maximum file size: {maxFileSize}MB</p>
            {buildingId && <p>Building: {buildingId}</p>}
            {allowUnlinked && (
              <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-[#F0FDFA] rounded-lg border border-[#2BBEB4]">
                <Unlink className="h-4 w-4 text-[#2BBEB4]" />
                <span className="text-[#0F5D5D] text-xs">
                  Documents can be uploaded without building association
                </span>
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] h-2 rounded-full transition-all duration-300" />
              </div>
              <p className="text-sm text-[#64748B] mt-2">Processing files...</p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files Preview */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-[#333333] flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Uploaded Files ({uploadedFiles.length})
          </h4>
          
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-[#333333] truncate">{file.name}</h5>
                        <BlocIQBadge variant="secondary" size="sm">
                          {formatFileSize(file.size)}
                        </BlocIQBadge>
                        {file.is_unlinked && (
                          <BlocIQBadge variant="warning" size="sm" className="flex items-center gap-1">
                            <Unlink className="h-3 w-3" />
                            Unlinked
                          </BlocIQBadge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-[#64748B] mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {file.building_id ? documentType : 'Unlinked Document'}
                        </div>
                      </div>

                      {file.classification && (
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-3 w-3 text-[#008C8F]" />
                          <BlocIQBadge variant="default" size="sm">
                            {file.classification}
                          </BlocIQBadge>
                        </div>
                      )}

                      {file.summary && (
                        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-3 w-3 text-[#008C8F]" />
                            <span className="text-xs font-medium text-[#333333]">AI Summary:</span>
                          </div>
                          <p className="text-xs text-[#64748B] line-clamp-3">{file.summary}</p>
                        </div>
                      )}

                      {file.extracted_text && (
                        <div className="text-xs text-[#64748B] bg-white p-2 rounded border">
                          <p className="font-medium mb-1">Extracted Text Preview:</p>
                          <p className="line-clamp-2">{file.extracted_text}</p>
                        </div>
                      )}

                      {file.is_unlinked && (
                        <div className="mt-2 p-2 bg-gradient-to-r from-[#F0FDFA] to-blue-50 rounded-lg border border-[#2BBEB4]">
                          <div className="flex items-center gap-2 text-xs text-[#0F5D5D]">
                            <Unlink className="h-3 w-3" />
                            <span>This document is not linked to a building but can be accessed via AI chat or document viewer</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <BlocIQButton
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </BlocIQButton>
                    <BlocIQButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = file.url;
                        link.download = file.name;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </BlocIQButton>
                    <BlocIQButton
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </BlocIQButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {uploadedFiles.length === 0 && !uploading && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#F3F4F6] to-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Paperclip className="h-6 w-6 text-[#64748B]" />
          </div>
          <p className="text-[#64748B] text-sm">No files uploaded yet</p>
          {allowUnlinked && (
            <p className="text-[#64748B] text-xs mt-1">
              You can upload documents with or without building association
            </p>
          )}
        </div>
      )}
    </div>
  );
}
