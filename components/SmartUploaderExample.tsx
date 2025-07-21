"use client";

import React, { useState } from "react";
import SmartUploader from "./SmartUploader";
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from "@/components/ui/blociq-card";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { Building, FileText, Mail, Brain } from "lucide-react";

// Example usage in different contexts
export default function SmartUploaderExample() {
  const [buildingId] = useState("building-123");
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);

  const handleUploadComplete = (document: any) => {
    console.log("Upload completed:", document);
    setUploadedDocuments(prev => [...prev, document]);
  };

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error);
  };

  return (
    <div className="space-y-8">
      {/* Building Documents Upload */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#333333]">Building Documents</h2>
              <p className="text-sm text-[#64748B]">Upload building-related documents</p>
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
            acceptedFileTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
            maxFileSize={20}
            showPreview={true}
            autoClassify={true}
          />
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Compliance Documents Upload */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#333333]">Compliance Documents</h2>
              <p className="text-sm text-[#64748B]">Upload compliance and regulatory documents</p>
            </div>
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <SmartUploader
            buildingId={buildingId}
            documentType="compliance"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            multiple={false}
            acceptedFileTypes={['.pdf', '.doc', '.docx']}
            maxFileSize={15}
            showPreview={true}
            autoClassify={true}
          />
        </BlocIQCardContent>
      </BlocIQCard>

      {/* General Documents Upload */}
      <BlocIQCard variant="elevated">
        <BlocIQCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2078F4] to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#333333]">General Documents</h2>
              <p className="text-sm text-[#64748B]">Upload general property management documents</p>
            </div>
          </div>
        </BlocIQCardHeader>
        <BlocIQCardContent>
          <SmartUploader
            documentType="general"
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            multiple={true}
            acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']}
            maxFileSize={10}
            showPreview={true}
            autoClassify={false}
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
              <h2 className="text-xl font-bold text-[#333333]">AI Assistant Documents</h2>
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
            maxFileSize={25}
            showPreview={true}
            autoClassify={true}
            customStoragePath="ai-assistant"
          />
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Uploaded Documents Summary */}
      {uploadedDocuments.length > 0 && (
        <BlocIQCard variant="elevated">
          <BlocIQCardHeader>
            <h3 className="text-lg font-bold text-[#333333]">
              Recently Uploaded ({uploadedDocuments.length})
            </h3>
          </BlocIQCardHeader>
          <BlocIQCardContent>
            <div className="space-y-2">
              {uploadedDocuments.slice(-5).map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-[#64748B]" />
                    <div>
                      <p className="font-medium text-[#333333]">{doc.name}</p>
                      <p className="text-sm text-[#64748B]">{doc.documentType}</p>
                    </div>
                  </div>
                  {doc.classification && (
                    <span className="text-xs bg-[#008C8F] text-white px-2 py-1 rounded">
                      {doc.classification}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}
    </div>
  );
} 