"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestAIDocumentsPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testPrompts = [
    "Create a Section 20 notice for Ashwood House with budget £50,000 for roof repairs",
    "Generate a welcome letter for new residents at Ashwood House",
    "Create a notice about upcoming building maintenance",
    "Generate a service charge explanation letter"
  ];

  const handleTest = async (testPrompt?: string) => {
    const promptToUse = testPrompt || prompt;
    if (!promptToUse.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/documents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptToUse.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = (testPrompt: string) => {
    setPrompt(testPrompt);
    handleTest(testPrompt);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-blue-600" />
            AI Document Creator - Test Page
          </h1>
          <p className="text-xl text-gray-600">
            Test the AI document creation system in real-time
          </p>
        </div>

        {/* Quick Test Buttons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🚀 Quick Test Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testPrompts.map((testPrompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleQuickTest(testPrompt)}
                  disabled={loading}
                  className="text-left h-auto p-3"
                >
                  <div className="text-sm">
                    <div className="font-medium">{testPrompt}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Test */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>✍️ Custom Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="custom-prompt">Describe the document you need:</Label>
              <Textarea
                id="custom-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Create a Section 20 notice for Ashwood House with budget £50,000 for roof repairs"
                className="min-h-24 mt-2"
                disabled={loading}
              />
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => handleTest()}
                disabled={loading || !prompt.trim()}
                size="lg"
                className="px-8 py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Test AI Document Creation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Document Created Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Intent Analysis */}
              {result.intent && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">AI Analysis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <Badge className="bg-blue-100 text-blue-800">
                        {result.intent.documentType}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Type</p>
                    </div>
                    <div className="text-center">
                      <Badge className="bg-green-100 text-green-800">
                        {result.intent.tone}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Tone</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={result.intent.buildingSpecific ? "default" : "secondary"}>
                        {result.intent.buildingSpecific ? "Building Specific" : "General"}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Scope</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={result.intent.requiresBudget ? "default" : "secondary"}>
                        {result.intent.requiresBudget ? "Budget Required" : "No Budget"}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Budget</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Purpose:</strong> {result.intent.purpose}
                  </div>
                </div>
              )}

              {/* Document Content */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Generated Document:
                </Label>
                <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {result.document.content}
                  </pre>
                </div>
              </div>

              {/* Populated Fields */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Populated Fields ({Object.keys(result.document.fields).length}):
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(result.document.fields).map(([key, value]) => (
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

              {/* Raw Response */}
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Raw API Response
                </summary>
                <pre className="mt-3 text-xs text-gray-600 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>📊 System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <div className="text-sm font-medium">AI Document Creation</div>
                <div className="text-xs text-gray-500">Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <div className="text-sm font-medium">Template Enhancement</div>
                <div className="text-xs text-gray-500">Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">✅</div>
                <div className="text-sm font-medium">Template Discovery</div>
                <div className="text-xs text-gray-500">Ready</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
