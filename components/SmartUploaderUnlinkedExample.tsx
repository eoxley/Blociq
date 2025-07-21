"use client";

import React, { useState } from "react";
import SmartUploader from "./SmartUploader";
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from "@/components/ui/blociq-card";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { Building, FileText, Brain, Unlink, MessageSquare, Eye } from "lucide-react";

// Example usage of SmartUploader with unlinked document support
export default function SmartUploaderUnlinkedExample() {
  const [buildingId] = useState("building-123");
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [unlinkedDocuments, setUnlinkedDocuments] = useState<any[]>([]);

  const handleUploadComplete = (document: any) => {
    console.log("Upload completed:", document);
    
    if (document.is_unlinked) {
      setUnlinkedDocuments(prev => [...prev, document]);
      console.log("Unlinked document uploaded:", document);
    } else {
      setUploadedDocuments(prev => [...prev, document]);
      console.log("Linked document uploaded:", document);
    }
  };

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error);
  };

  return (
    <div className="space-y-8">
      {/* Unlinked Document Upload */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
              <Unlink className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#333333]">Unlinked Document Upload</h2>
              <p className="text-sm text-[#64748B]">Upload documents without building association</p>
            </div>
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <SmartUploader
            documentType="general"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            multiple={true}
            acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
            maxFileSize={25}
            showPreview={true}
            autoClassify={true}
            allowUnlinked={true}
            customStoragePath="unlinked"
          />
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Building-Linked Document Upload */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#333333]">Building-Linked Document Upload</h2>
              <p className="text-sm text-[#64748B]">Upload documents associated with a specific building</p>
            </div>
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <SmartUploader
            buildingId={buildingId}
            documentType="building"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            multiple={true}
            acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
            maxFileSize={20}
            showPreview={true}
            autoClassify={true}
            allowUnlinked={false}
          />
        </BlocIQCardContent>
      </BlocIQCard>

      {/* AI Assistant Document Upload */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7645ED] to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#333333]">AI Assistant Document Upload</h2>
              <p className="text-sm text-[#64748B]">Upload documents for AI analysis and processing</p>
            </div>
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <SmartUploader
            documentType="general"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            multiple={true}
            acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
            maxFileSize={30}
            showPreview={true}
            autoClassify={true}
            allowUnlinked={true}
            customStoragePath="ai-assistant"
          />
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Unlinked Documents Summary */}
      {unlinkedDocuments.length > 0 && (
        <BlocIQCard variant="elevated">
          <BlocIQCardHeader>
            <div className="flex items-center gap-3">
              <Unlink className="h-5 w-5 text-[#2BBEB4]" />
              <h3 className="text-lg font-bold text-[#333333]">
                Unlinked Documents ({unlinkedDocuments.length})
              </h3>
            </div>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="space-y-3">
              {unlinkedDocuments.map((doc, index) => (
                <div key={index} className="bg-[#F0FDFA] rounded-lg p-4 border border-[#2BBEB4]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-[#2BBEB4] mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-[#0F5D5D]">{doc.name}</h4>
                          <span className="text-xs bg-[#2BBEB4] text-white px-2 py-1 rounded">
                            Unlinked
                          </span>
                        </div>
                        
                        {doc.classification && (
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-[#008C8F]" />
                            <span className="text-sm text-[#0F5D5D]">
                              Classified as: {doc.classification}
                            </span>
                          </div>
                        )}
                        
                        {doc.summary && (
                          <div className="bg-white p-3 rounded border border-[#2BBEB4] mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-3 w-3 text-[#008C8F]" />
                              <span className="text-xs font-medium text-[#0F5D5D]">AI Summary:</span>
                            </div>
                            <p className="text-sm text-[#0F5D5D]">{doc.summary}</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-[#64748B]">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BlocIQButton
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </BlocIQButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-gradient-to-r from-[#F0FDFA] to-blue-50 rounded-lg border border-[#2BBEB4]">
              <div className="flex items-center gap-2 text-sm text-[#0F5D5D]">
                <Unlink className="h-4 w-4" />
                <span>
                  These documents are not linked to a specific building but can be accessed via AI chat or document viewer.
                </span>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Linked Documents Summary */}
      {uploadedDocuments.length > 0 && (
        <BlocIQCard variant="elevated">
          <BlocIQCardHeader>
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-[#008C8F]" />
              <h3 className="text-lg font-bold text-[#333333]">
                Building-Linked Documents ({uploadedDocuments.length})
              </h3>
            </div>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="space-y-3">
              {uploadedDocuments.map((doc, index) => (
                <div key={index} className="bg-[#FAFAFA] rounded-lg p-4 border border-[#E2E8F0]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-[#64748B] mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-[#333333]">{doc.name}</h4>
                          <span className="text-xs bg-[#008C8F] text-white px-2 py-1 rounded">
                            Linked
                          </span>
                        </div>
                        
                        {doc.classification && (
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-[#008C8F]" />
                            <span className="text-sm text-[#64748B]">
                              Classified as: {doc.classification}
                            </span>
                          </div>
                        )}
                        
                        {doc.summary && (
                          <div className="bg-white p-3 rounded border border-[#E2E8F0] mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-3 w-3 text-[#008C8F]" />
                              <span className="text-xs font-medium text-[#333333]">AI Summary:</span>
                            </div>
                            <p className="text-sm text-[#64748B]">{doc.summary}</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-[#64748B]">
                          Building: {buildingId} • Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BlocIQButton
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </BlocIQButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Usage Instructions */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <h3 className="text-lg font-bold text-[#333333]">How to Use Unlinked Documents</h3>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F0FDFA] p-4 rounded-lg border border-[#2BBEB4]">
                <h4 className="font-semibold text-[#0F5D5D] mb-2 flex items-center gap-2">
                  <Unlink className="h-4 w-4" />
                  Unlinked Uploads
                </h4>
                <ul className="text-sm text-[#0F5D5D] space-y-1">
                  <li>• Upload without building association</li>
                  <li>• AI classification still works</li>
                  <li>• Access via AI chat</li>
                  <li>• Perfect for general documents</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Linked Uploads
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Associated with specific building</li>
                  <li>• Full AI processing</li>
                  <li>• Building-specific context</li>
                  <li>• Property management integration</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#F0FDFA] to-blue-50 p-4 rounded-lg border border-[#2BBEB4]">
              <h4 className="font-semibold text-[#0F5D5D] mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Processing Features
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#0F5D5D]">
                <div>
                  <strong>Classification:</strong> Automatic document type detection
                </div>
                <div>
                  <strong>Summary:</strong> AI-generated content summaries
                </div>
                <div>
                  <strong>Extraction:</strong> Text extraction from PDFs and documents
                </div>
              </div>
            </div>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    </div>
  );
} 