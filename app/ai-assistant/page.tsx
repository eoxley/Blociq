"use client";

import { Suspense } from "react";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import DocumentAwareAI from '@/components/DocumentAwareAI';
import EnhancedDocumentUpload from '@/components/EnhancedDocumentUpload';
import TimeBasedGreeting from '@/components/TimeBasedGreeting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, Upload, MessageSquare, CheckCircle, AlertTriangle, Info, Search, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageHero from '@/components/PageHero';

export default function AIAssistantPage() {
  return (
    <LayoutWithSidebar>
      <PageHero title="AI Assistant" subtitle="Upload documents and ask questions with AI that understands your building context" icon={<Brain className="h-8 w-8 text-white" />} />
      <div className="space-y-8">

        <div className="p-6 space-y-8">
          {/* AI Assistant Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">Document-Aware AI Assistant</h1>
                  <p className="text-blue-100 text-lg">Upload documents and ask questions with AI that understands your building context</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Chat
                  </Button>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-blue-700 mb-2">Upload & Analyze</h3>
              <p className="text-sm text-blue-600">Upload PDF documents and get instant AI analysis</p>
            </div>

            <div className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100 cursor-pointer rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-green-700 mb-2">Context-Aware AI</h3>
              <p className="text-sm text-green-600">Ask questions with building-specific context</p>
            </div>

            <div className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-purple-700 mb-2">Natural Conversations</h3>
              <p className="text-sm text-purple-600">Chat about leasehold management and compliance</p>
            </div>
          </div>

          {/* Document Upload Section */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
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
            </CardContent>
          </Card>

          {/* Document Search Section */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Documents
              </CardTitle>
              <p className="text-sm text-gray-600">
                Ask questions about your uploaded documents. AI will find relevant documents and provide answers.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Example Questions:</h4>
                    <ul className="space-y-2 text-sm text-blue-700">
                      <li>• "Find the fire risk assessment for this building"</li>
                      <li>• "When does the electrical certificate expire?"</li>
                      <li>• "Show me all lease agreements"</li>
                      <li>• "What does the insurance certificate cover?"</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">Document Types:</h4>
                    <ul className="space-y-2 text-sm text-green-700">
                      <li>• Fire Risk Assessments</li>
                      <li>• Electrical Certificates</li>
                      <li>• Lease Agreements</li>
                      <li>• Insurance Documents</li>
                      <li>• Compliance Reports</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Processing Tips */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Info className="h-5 w-5" />
                Document Processing Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-amber-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Best Practices
                  </h4>
                  <div className="space-y-2 text-sm text-amber-700">
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
                  <h4 className="font-medium text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Troubleshooting
                  </h4>
                  <div className="space-y-2 text-sm text-amber-700">
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

          {/* Example Questions */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Example Questions You Can Ask
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Document Questions
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;Summarise this Fire Risk Assessment&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;What are the actions from this EICR?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;When is the next lift inspection due?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;Is this insurance certificate up to date?&rdquo;</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-green-600" />
                    Building Questions
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;Who is the leaseholder of Flat 5?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;What compliance certificates are missing?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;When is the next EICR due?&rdquo;</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <span>&ldquo;What&apos;s the service charge apportionment for Unit 3?&rdquo;</span>
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

          {/* How It Works */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium">1. Upload Document</h4>
                  <p className="text-sm text-gray-600">Upload a PDF document to provide context for the AI</p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Brain className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-medium">2. AI Analysis</h4>
                  <p className="text-sm text-gray-600">AI extracts text, classifies document type, and identifies key information</p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium">3. Ask Questions</h4>
                  <p className="text-sm text-gray-600">Ask questions about the document or building with full context awareness</p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <h4 className="font-medium">4. Get Answers</h4>
                  <p className="text-sm text-gray-600">Receive comprehensive answers with traceable sources and actionable insights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutWithSidebar>
  );
} 