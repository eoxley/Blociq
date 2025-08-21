"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Building, FileText, Sparkles, Download, Copy, Check } from 'lucide-react';
import { useBuildings } from '@/hooks/buildings';

interface GeneratedDocument {
  id: string;
  name: string;
  content: string;
  fields: Record<string, any>;
  template: any;
  generated_at: string;
}

export default function AIDocumentCreator() {
  const [prompt, setPrompt] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { buildings, isLoading: buildingsLoading } = useBuildings();

  const documentTypes = [
    { value: '', label: 'Auto-detect' },
    { value: 'letter', label: 'Letter' },
    { value: 'notice', label: 'Notice' },
    { value: 'form', label: 'Form' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'legal_notice', label: 'Legal Notice' },
    { value: 'section_20', label: 'Section 20 Notice' }
  ];

  const examplePrompts = [
    "Create a Section 20 notice for Ashwood House with budget £50,000",
    "Generate a welcome letter for new leaseholders",
    "Draft a service charge reminder notice",
    "Create a maintenance schedule announcement"
  ];

  const handleCreateDocument = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/documents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          buildingId: buildingId || undefined,
          documentType: documentType || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const result = await response.json();
      setGeneratedDocument(result.document);
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = async () => {
    if (generatedDocument) {
      await navigator.clipboard.writeText(generatedDocument.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (generatedDocument) {
      const blob = new Blob([generatedDocument.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedDocument.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          AI Document Creator
        </h1>
        <p className="text-gray-600">
          Describe the document you need and let AI generate it with building data automatically populated
        </p>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Your Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Description */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe the document you need:</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a Section 20 notice for Ashwood House with budget £50,000"
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Quick examples:</Label>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExamplePrompt(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Building Selection */}
            <div className="space-y-2">
              <Label htmlFor="building">Building (optional):</Label>
              <Select value={buildingId} onValueChange={setBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific building</SelectItem>
                  {buildings?.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {building.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type (optional):</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect from description" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleCreateDocument}
            disabled={!prompt.trim() || isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating Document...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                🚀 Create Document with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Document */}
      {generatedDocument && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Generated Document
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Document Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="text-gray-900">{generatedDocument.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Template:</span>
                  <p className="text-gray-900">{generatedDocument.template.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Generated:</span>
                  <p className="text-gray-900">{new Date(generatedDocument.generated_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Fields:</span>
                  <p className="text-gray-900">{Object.keys(generatedDocument.fields).length}</p>
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Document Content:</Label>
              <div className="p-4 bg-white border rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {generatedDocument.content}
              </div>
            </div>

            {/* Populated Fields */}
            <div className="mt-6 space-y-2">
              <Label className="text-sm font-medium text-gray-700">Populated Fields:</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(generatedDocument.fields).map(([key, value]) => (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-medium text-gray-600">{key}:</span>
                    <p className="text-sm text-gray-900 mt-1">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
