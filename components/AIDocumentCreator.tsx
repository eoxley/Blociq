"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, Eye, Sparkles, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

interface Building {
  id: string;
  name: string;
  address: string;
}

interface GeneratedDocument {
  id: string;
  content: string;
  template: string;
  fields: Record<string, any>;
  downloadUrl: string | null;
  createdAt: string;
}

interface DocumentIntent {
  documentType: string;
  purpose: string;
  keyDetails: string[];
  tone: string;
  recipient: string;
  buildingSpecific: boolean;
  requiresBudget: boolean;
  requiresDates: boolean;
}

export default function AIDocumentCreator() {
  const [prompt, setPrompt] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [intent, setIntent] = useState<DocumentIntent | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings || []);
      }
    } catch (error) {
      console.error('Failed to fetch buildings:', error);
    }
  };

  const handleCreateDocument = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the document you need');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/documents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          buildingId: buildingId || undefined,
          documentType: documentType || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      setGeneratedDocument(data.document);
      setIntent(data.intent);
      
      toast.success('Document created successfully! 🎉');
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedDocument) return;
    
    // For now, create a text file download
    // In production, this would use the existing /api/generate-doc endpoint
    const blob = new Blob([generatedDocument.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedDocument.template}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Document downloaded! 📄');
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'section_20':
        return '📋';
      case 'welcome_letter':
        return '✉️';
      case 'notice':
        return '📢';
      case 'form':
        return '📝';
      case 'invoice':
        return '💰';
      case 'legal_notice':
        return '⚖️';
      default:
        return '📄';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone.toLowerCase()) {
      case 'formal':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-green-100 text-green-800';
      case 'friendly':
        return 'bg-yellow-100 text-yellow-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Sparkles className="h-8 w-8 text-blue-600" />
          AI Document Creator
        </h1>
        <p className="text-gray-600 text-lg">
          Describe the document you need, and AI will create it with building data automatically populated
        </p>
      </div>

      {/* Main Creation Interface */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Your Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Description */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-base font-medium">
              Describe the document you need:
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a Section 20 notice for Ashwood House with budget £50,000 for roof repairs"
              className="min-h-32 text-base"
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              Be specific about the document type, building, purpose, and any key details
            </p>
          </div>

          {/* Building Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="building" className="text-base font-medium">
                Building (Optional)
              </Label>
              <Select value={buildingId} onValueChange={setBuildingId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a building for auto-population" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific building</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {building.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Selecting a building will auto-populate building-specific fields
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType" className="text-base font-medium">
                Document Type (Optional)
              </Label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="AI will detect automatically" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-detect</SelectItem>
                  <SelectItem value="section_20">Section 20 Notice</SelectItem>
                  <SelectItem value="welcome_letter">Welcome Letter</SelectItem>
                  <SelectItem value="notice">General Notice</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="legal_notice">Legal Notice</SelectItem>
                  <SelectItem value="letter">General Letter</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                AI will automatically detect the best type if not specified
              </p>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleCreateDocument}
              disabled={loading || !prompt.trim()}
              size="lg"
              className="px-8 py-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating Document...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  🚀 Create Document with AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Document Display */}
      {generatedDocument && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Generated Document
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Preview'}
                </Button>
                <Button onClick={handleDownload} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Template</Label>
                <p className="font-medium">{generatedDocument.template}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Created</Label>
                <p className="font-medium">
                  {new Date(generatedDocument.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Fields Populated</Label>
                <p className="font-medium">{Object.keys(generatedDocument.fields).length}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <Badge className="bg-green-100 text-green-800">Ready</Badge>
              </div>
            </div>

            {/* Intent Analysis */}
            {intent && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">AI Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {getDocumentTypeIcon(intent.documentType)}
                    </div>
                    <p className="text-sm font-medium">{intent.documentType.replace('_', ' ')}</p>
                  </div>
                  <div className="text-center">
                    <Badge className={getToneColor(intent.tone)}>
                      {intent.tone}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Tone</p>
                  </div>
                  <div className="text-center">
                    <Badge variant={intent.buildingSpecific ? "default" : "secondary"}>
                      {intent.buildingSpecific ? "Building Specific" : "General"}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Scope</p>
                  </div>
                  <div className="text-center">
                    <Badge variant={intent.requiresBudget ? "default" : "secondary"}>
                      {intent.requiresBudget ? "Budget Required" : "No Budget"}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Budget</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Purpose:</strong> {intent.purpose}
                </div>
                {intent.keyDetails.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <strong>Key Details:</strong> {intent.keyDetails.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Document Preview */}
            {showPreview && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Document Preview</Label>
                <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {generatedDocument.content}
                  </pre>
                </div>
              </div>
            )}

            {/* Populated Fields */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">Populated Fields</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(generatedDocument.fields).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {key.replace(/[{}]/g, '')}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Prompts */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">💡 Example Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Section 20 Notices</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• "Create a Section 20 notice for Ashwood House with budget £50,000 for roof repairs"</p>
                <p>• "Generate Section 20 notice for lift replacement at £25,000"</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Welcome Letters</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• "Create a welcome letter for new residents at Ashwood House"</p>
                <p>• "Generate welcome letter with fire safety information"</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">General Notices</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• "Create a notice about upcoming building maintenance"</p>
                <p>• "Generate notice for parking restrictions during works"</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Custom Documents</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• "Create a service charge explanation letter"</p>
                <p>• "Generate building rules and regulations document"</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
