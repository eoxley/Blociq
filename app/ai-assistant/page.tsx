"use client";

import { Suspense } from "react";
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import DocumentAwareAI from '@/components/DocumentAwareAI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Upload, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

export default function AIAssistantPage() {
  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#0F5D5D]">Document-Aware AI Assistant</h1>
          <p className="text-gray-600">
            Upload documents and ask questions with AI that understands your building context and compliance requirements.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-blue-600" />
                Upload & Analyze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Upload PDF documents and get instant AI analysis with key information extraction, compliance classification, and action items.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-green-600" />
                Context-Aware AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ask questions about your building, documents, or compliance. AI responds with traceable sources and building-specific context.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Natural Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Have natural conversations about leasehold management, compliance deadlines, and building operations with AI that understands UK property law.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Example Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Example Questions You Can Ask
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
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
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
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

        {/* How It Works */}
        <Card>
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
    </LayoutWithSidebar>
  );
} 