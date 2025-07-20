"use client";

import DocumentUploader from '@/components/DocumentUploader'
import DocumentChat from '@/components/DocumentChat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default function AIDocumentsPage() {
  return (
    <LayoutWithSidebar>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D]">AI Documents</h1>
            <p className="text-gray-600 mt-1">Upload, analyze, and chat with your documents using AI</p>
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
            <TabsTrigger value="chat">Document Chat</TabsTrigger>
            <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document Uploader */}
              <div className="lg:col-span-2">
                <DocumentUploader 
                  onSuccess={(documentId) => {
                    console.log('Document uploaded successfully:', documentId)
                  }}
                />
              </div>

              {/* Information Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Document Processing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Text extraction from PDFs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Automatic classification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Date extraction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Compliance asset linking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">User confirmation required</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Supported Document Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Compliance</Badge>
                      <span className="text-sm">Fire Risk Assessments, EICRs, Gas Certificates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Lease</Badge>
                      <span className="text-sm">Lease agreements, assignments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Minutes</Badge>
                      <span className="text-sm">AGM minutes, board meetings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Insurance</Badge>
                      <span className="text-sm">Insurance certificates, policies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Financial</Badge>
                      <span className="text-sm">Service charge statements, budgets</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium">Upload PDF</p>
                        <p className="text-gray-600">Select a PDF document to upload</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium">AI Analysis</p>
                        <p className="text-gray-600">AI extracts text and analyzes content</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium">Review & Edit</p>
                        <p className="text-gray-600">Review AI suggestions and make edits</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</div>
                      <div>
                        <p className="font-medium">Accept & File</p>
                        <p className="text-gray-600">Save document and link to compliance assets</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document Chat */}
              <div className="lg:col-span-2">
                <Card className="h-[600px]">
                  <DocumentChat 
                    onDocumentSelect={(documentId) => {
                      console.log('Document selected in chat:', documentId)
                    }}
                  />
                </Card>
              </div>

              {/* Chat Information Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Chat</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Ask questions about documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Automatic document selection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Compare multiple documents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Extract key information</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Example Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">"Summarize this document"</p>
                      <p className="text-gray-600">Get a concise overview</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">"What are the key actions?"</p>
                      <p className="text-gray-600">Extract required actions</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">"What are the deadlines?"</p>
                      <p className="text-gray-600">Find important dates</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">"Who is responsible?"</p>
                      <p className="text-gray-600">Identify responsible parties</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">"Compare with previous version"</p>
                      <p className="text-gray-600">Compare document changes</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium">Ask a Question</p>
                        <p className="text-gray-600">Type your question about documents</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium">AI Analyzes</p>
                        <p className="text-gray-600">AI finds relevant documents and extracts information</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium">Get Response</p>
                        <p className="text-gray-600">Receive detailed, contextual answers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Assistant */}
              <div className="lg:col-span-2">
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle>AI Property Assistant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-full flex flex-col">
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto">
                        <div className="space-y-4">
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-600">AI Assistant</p>
                            <p className="text-gray-900">Hello! I'm your AI property management assistant. I can help you with:</p>
                            <ul className="mt-2 text-sm text-gray-700 space-y-1">
                              <li>• Building and leaseholder information</li>
                              <li>• Compliance and document analysis</li>
                              <li>• Major works project status</li>
                              <li>• Email drafting and responses</li>
                              <li>• General property management questions</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ask me anything about your properties..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                          Send
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <p className="text-xs italic text-gray-500 mt-2 text-center">
                  AI-generated guidance is for support only and should not replace professional advice.
                </p>
              </div>

              {/* AI Assistant Information Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Assistant Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Building context awareness</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Document analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Major works insights</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Email assistance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">✓</Badge>
                      <span className="text-sm">Compliance guidance</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                      <p className="font-medium">"Show me building 1 details"</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                      <p className="font-medium">"What compliance documents are due?"</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                      <p className="font-medium">"Draft an email about noise complaints"</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                      <p className="font-medium">"Summarize major works projects"</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                      <p className="font-medium">"Who is the leaseholder of Flat 5?"</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium">Ask Questions</p>
                        <p className="text-gray-600">Ask about buildings, documents, or general property management</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium">AI Context</p>
                        <p className="text-gray-600">AI accesses building data, documents, and major works information</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium">Smart Response</p>
                        <p className="text-gray-600">Get contextual, accurate answers based on your data</p>
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