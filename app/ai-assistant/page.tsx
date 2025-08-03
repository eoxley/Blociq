"use client";

import { Suspense } from "react";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import DocumentAwareAI from '@/components/DocumentAwareAI';
import EnhancedDocumentUpload from '@/components/EnhancedDocumentUpload';
import TimeBasedGreeting from '@/components/TimeBasedGreeting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, Upload, MessageSquare, CheckCircle, AlertTriangle, Info, Search, Sparkles, Zap, ArrowRight, Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AIAssistantPage() {
  return (
    <LayoutWithSidebar>
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Document-Aware AI Assistant
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Ask smart questions and upload files with full building context.
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Greeting Header */}
        <div className="text-center">
          <TimeBasedGreeting className="text-sm font-light text-gray-600" />
        </div>

        {/* Upload Document Section */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Upload className="h-5 w-5 text-[#4f46e5]" />
              Upload Documents for AI Analysis
            </CardTitle>
            <p className="text-sm text-gray-600">
              Upload PDFs, images, or documents. AI will extract text and make them searchable.
            </p>
          </CardHeader>
          <CardContent>
            <EnhancedDocumentUpload
              multiple={true}
              acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']}
              maxFileSize={10}
              onUploadComplete={(document) => {
                console.log('Document uploaded:', document);
                toast.success(`Document "${document.file_name}" uploaded successfully!`);
              }}
              onUploadError={(error) => {
                console.error('Upload error:', error);
                toast.error(`Upload failed: ${error}`);
              }}
            />
            <p className="text-xs text-gray-500 mt-3">
              Supports PDF, DOC, JPG, and image formats. Max 10MB each.
            </p>
          </CardContent>
        </Card>

        {/* Document Processing Tips - Redesigned */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Info className="h-5 w-5" />
              Document Processing Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-orange-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Best Practices
                </h4>
                <div className="space-y-2 text-sm text-orange-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>Use text-based PDFs for best results</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>Convert scanned documents to searchable PDFs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>Ensure documents are not password-protected</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>Keep files under 10MB for faster processing</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Troubleshooting
                </h4>
                <div className="space-y-2 text-sm text-orange-700">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5" />
                    <span>Scanned documents may need OCR processing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5" />
                    <span>Corrupted files should be re-uploaded</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5" />
                    <span>Unsupported formats can be converted to PDF</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5" />
                    <span>Large files may take longer to process</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Questions - Styled */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <MessageSquare className="h-5 w-5 text-[#4f46e5]" />
              Example Questions You Can Ask
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Document Questions
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"Summarise this Fire Risk Assessment"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"What are the actions from this EICR?"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"When is the next lift inspection due?"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"Is this insurance certificate up to date?"</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-green-600" />
                  Building Questions
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"Who is the leaseholder of Flat 5?"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"What compliance certificates are missing?"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"When is the next EICR due?"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                    <span>"What's the service charge apportionment for Unit 3?"</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant Component */}
        <Suspense fallback={<div className="p-6">Loading AI Assistant...</div>}>
          <DocumentAwareAI 
            buildingId="1" // Default to first building for demo
            className="mt-8"
          />
        </Suspense>

        {/* How It Works - Enhanced Visual Layout */}
        <Card className="border-0 shadow-sm bg-white rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Brain className="h-5 w-5 text-[#4f46e5]" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">1. Upload Document</h4>
                <p className="text-sm text-gray-600">Upload a PDF document to provide context for the AI</p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">2. AI Analysis</h4>
                <p className="text-sm text-gray-600">AI extracts text, classifies document type, and identifies key information</p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">3. Ask Questions</h4>
                <p className="text-sm text-gray-600">Ask questions about the document or building with full context awareness</p>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">4. Get Answers</h4>
                <p className="text-sm text-gray-600">Receive comprehensive answers with traceable sources and actionable insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
} 