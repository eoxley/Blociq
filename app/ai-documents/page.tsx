"use client";

import DocumentUploader from '@/components/DocumentUploader'
import DocumentChat from '@/components/DocumentChat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { 
  Upload, 
  MessageSquare, 
  Brain, 
  FileText, 
  Shield, 
  Calendar, 
  Users, 
  Building2, 
  CheckCircle, 
  Zap,
  ArrowRight,
  Sparkles,
  Search,
  FileCheck,
  AlertTriangle,
  Clock,
  Star,
  Send,
  Plus,
  Settings
} from 'lucide-react'

export default function AIDocumentsPage() {
  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        {/* Enhanced Header with Gradient Background */}
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <Brain className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold">AI Documents</h1>
                    <p className="text-teal-100 text-lg">Transform your property documents with AI-powered analysis</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Document
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-teal-50 to-teal-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-teal-700 group-hover:scale-110 transition-transform duration-300">
                    24
                  </div>
                  <div className="text-sm text-teal-600 font-medium">Documents</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-700 group-hover:scale-110 transition-transform duration-300">
                    18
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Analyzed</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-700 group-hover:scale-110 transition-transform duration-300">
                    156
                  </div>
                  <div className="text-sm text-green-600 font-medium">Chat Messages</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-700 group-hover:scale-110 transition-transform duration-300">
                    12
                  </div>
                  <div className="text-sm text-purple-600 font-medium">AI Insights</div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Brain className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="upload" className="data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg">
              <Upload className="h-4 w-4 mr-2" />
              Upload & Analyze
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg">
              <MessageSquare className="h-4 w-4 mr-2" />
              Document Chat
            </TabsTrigger>
            <TabsTrigger value="assistant" className="data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg">
              <Brain className="h-4 w-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Enhanced Document Uploader */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-gray-900">Upload & Analyze Documents</CardTitle>
                        <p className="text-gray-600">AI will extract key information and classify your documents</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentUploader 
                      onSuccess={(documentId) => {
                        console.log('Document uploaded successfully:', documentId)
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Information Panel */}
              <div className="space-y-6">
                {/* AI Processing Features */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg text-blue-900">AI Processing Features</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-blue-900">Smart Text Extraction</p>
                        <p className="text-sm text-blue-700">Extract text from PDFs with high accuracy</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-blue-900">Automatic Classification</p>
                        <p className="text-sm text-blue-700">AI identifies document type and category</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-blue-900">Date Extraction</p>
                        <p className="text-sm text-blue-700">Find inspection dates and deadlines</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-blue-900">Compliance Linking</p>
                        <p className="text-sm text-blue-700">Link to relevant compliance assets</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-blue-900">User Confirmation</p>
                        <p className="text-sm text-blue-700">Review and edit AI suggestions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Supported Document Types */}
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-teal-600" />
                      <CardTitle className="text-lg">Supported Document Types</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                      <Shield className="h-5 w-5 text-red-600" />
                      <div>
                        <Badge variant="destructive" className="mb-1">Compliance</Badge>
                        <p className="text-sm text-gray-700">Fire Risk Assessments, EICRs, Gas Certificates</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <Badge variant="default" className="mb-1">Lease</Badge>
                        <p className="text-sm text-gray-700">Lease agreements, assignments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                      <Users className="h-5 w-5 text-green-600" />
                      <div>
                        <Badge variant="default" className="mb-1">Minutes</Badge>
                        <p className="text-sm text-gray-700">AGM minutes, board meetings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <div>
                        <Badge variant="default" className="mb-1">Insurance</Badge>
                        <p className="text-sm text-gray-700">Insurance certificates, policies</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                      <div>
                        <Badge variant="default" className="mb-1">Financial</Badge>
                        <p className="text-sm text-gray-700">Service charge statements, budgets</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* How It Works */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg">How It Works</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-medium text-gray-900">Upload PDF</p>
                        <p className="text-sm text-gray-600">Select a PDF document to upload</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-medium text-gray-900">AI Analysis</p>
                        <p className="text-sm text-gray-600">AI extracts text and analyzes content</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-medium text-gray-900">Review & Edit</p>
                        <p className="text-sm text-gray-600">Review AI suggestions and make edits</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <p className="font-medium text-gray-900">Accept & File</p>
                        <p className="text-sm text-gray-600">Save document and link to compliance assets</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Enhanced Document Chat */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-gray-900">Document Chat</CardTitle>
                        <p className="text-gray-600">Ask questions about your uploaded documents</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentChat 
                      onDocumentSelect={(documentId) => {
                        console.log('Document selected in chat:', documentId)
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Chat Information Panel */}
              <div className="space-y-6">
                {/* Chat Features */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg text-green-900">Chat Features</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Ask Questions</p>
                        <p className="text-sm text-green-700">Get answers about your documents</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Auto Document Selection</p>
                        <p className="text-sm text-green-700">AI finds relevant documents automatically</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Compare Documents</p>
                        <p className="text-sm text-green-700">Compare multiple documents at once</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Extract Information</p>
                        <p className="text-sm text-green-700">Pull key data from documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Example Questions */}
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-teal-600" />
                      <CardTitle className="text-lg">Example Questions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">&ldquo;Summarize this document&rdquo;</p>
                      <p className="text-sm text-gray-600">Get a concise overview</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">&ldquo;What are the key actions?&rdquo;</p>
                      <p className="text-sm text-gray-600">Extract required actions</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">&ldquo;What are the deadlines?&rdquo;</p>
                      <p className="text-sm text-gray-600">Find important dates</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">&ldquo;Who is responsible?&rdquo;</p>
                      <p className="text-sm text-gray-600">Identify responsible parties</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">&ldquo;Compare with previous version&rdquo;</p>
                      <p className="text-sm text-gray-600">Compare document changes</p>
                    </div>
                  </CardContent>
                </Card>

                {/* How Chat Works */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg">How Chat Works</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-medium text-gray-900">Ask a Question</p>
                        <p className="text-sm text-gray-600">Type your question about documents</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-medium text-gray-900">AI Analyzes</p>
                        <p className="text-sm text-gray-600">AI finds relevant documents and extracts information</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-medium text-gray-900">Get Response</p>
                        <p className="text-sm text-gray-600">Receive detailed, contextual answers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Enhanced AI Assistant */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-gray-900">AI Property Assistant</CardTitle>
                        <p className="text-gray-600">Your intelligent property management companion</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-full flex flex-col">
                      <div className="flex-1 bg-gray-50 rounded-lg p-6 mb-6 overflow-y-auto border border-gray-200">
                        <div className="space-y-6">
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Brain className="h-5 w-5 text-purple-600" />
                              <p className="text-sm font-medium text-gray-600">AI Assistant</p>
                            </div>
                            <p className="text-gray-900 mb-3">Hello! I'm your AI property management assistant. I can help you with:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Building2 className="h-4 w-4 text-blue-500" />
                                <span>Building and leaseholder information</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Shield className="h-4 w-4 text-green-500" />
                                <span>Compliance and document analysis</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <FileCheck className="h-4 w-4 text-orange-500" />
                                <span>Major works project status</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <MessageSquare className="h-4 w-4 text-purple-500" />
                                <span>Email drafting and responses</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span>General property management questions</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Ask me anything about your properties..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <Button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-xs text-yellow-800">
                    AI-generated guidance is for support only and should not replace professional advice.
                  </p>
                </div>
              </div>

              {/* Enhanced AI Assistant Information Panel */}
              <div className="space-y-6">
                {/* AI Assistant Features */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg text-purple-900">AI Assistant Features</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-purple-900">Building Context</p>
                        <p className="text-sm text-purple-700">Aware of your building portfolio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-purple-900">Document Analysis</p>
                        <p className="text-sm text-purple-700">Analyzes uploaded documents</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-purple-900">Major Works Insights</p>
                        <p className="text-sm text-purple-700">Tracks project status and progress</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-purple-900">Email Assistance</p>
                        <p className="text-sm text-purple-700">Drafts professional emails</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-purple-900">Compliance Guidance</p>
                        <p className="text-sm text-purple-700">Provides compliance advice</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Questions */}
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-teal-600" />
                      <CardTitle className="text-lg">Quick Questions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                        &ldquo;Show me building 1 details&rdquo;
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors mt-1" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                        &ldquo;What compliance documents are due?&rdquo;
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors mt-1" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                        &ldquo;Draft an email about noise complaints&rdquo;
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors mt-1" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                        &ldquo;Summarize major works projects&rdquo;
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors mt-1" />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group">
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors">
                        &ldquo;Who is the leaseholder of Flat 5?&rdquo;
                      </p>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors mt-1" />
                    </div>
                  </CardContent>
                </Card>

                {/* How AI Assistant Works */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-gray-600" />
                      <CardTitle className="text-lg">How AI Assistant Works</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-medium text-gray-900">Ask Questions</p>
                        <p className="text-sm text-gray-600">Ask about buildings, documents, or general property management</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-medium text-gray-900">AI Context</p>
                        <p className="text-sm text-gray-600">AI accesses building data, documents, and major works information</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-medium text-gray-900">Smart Response</p>
                        <p className="text-sm text-gray-600">Get contextual, accurate answers based on your data</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  )
} 