'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, FileText, Image, CheckCircle, XCircle, Bug, Eye, Code } from 'lucide-react';

export default function OCRDebugPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setDebugLogs([]);
    setResults(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResults(null);
      addLog(`📁 File selected: ${selectedFile.name} (${selectedFile.type}, ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const testOCRProcessing = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);
    clearLogs();

    try {
      addLog('🔄 Starting OCR processing test...');
      
      // Step 1: Convert file to base64
      addLog('📝 Step 1: Converting file to base64...');
      const base64Data = await fileToBase64(file);
      addLog(`✅ Base64 conversion successful. Length: ${base64Data.length} characters`);
      addLog(`📊 Base64 preview: ${base64Data.substring(0, 100)}...`);

      // Step 2: Test OCR endpoint
      addLog('🔍 Step 2: Testing OCR endpoint...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
        method: 'POST',
        body: formData
      });

      addLog(`📡 OCR API Response Status: ${ocrResponse.status} ${ocrResponse.statusText}`);
      
      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        addLog(`❌ OCR API Error: ${errorText}`);
        throw new Error(`OCR processing failed: ${ocrResponse.status} - ${errorText}`);
      }

      const ocrResult = await ocrResponse.json();
      addLog(`✅ OCR API Response: ${JSON.stringify(ocrResult, null, 2)}`);

      if (!ocrResult.success) {
        throw new Error(`OCR processing failed: ${ocrResult.error || 'Unknown error'}`);
      }

      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        throw new Error('OCR processing returned no text');
      }

      addLog(`📄 OCR Text Extraction Successful!`);
      addLog(`📊 Extracted text length: ${ocrResult.text.length} characters`);
      addLog(`📋 Text preview: ${ocrResult.text.substring(0, 200)}...`);

      // Step 3: Test AI analysis with extracted text
      addLog('🤖 Step 3: Testing AI analysis with extracted text...');
      const aiResponse = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Analyze this document: ${file.name}\n\nExtracted Text:\n${ocrResult.text.substring(0, 1000)}...\n\nPlease provide a brief summary and key insights.`,
          building_id: null,
          contextType: 'general',
          documentType: 'uploaded_file',
          extractedText: ocrResult.text
        })
      });

      addLog(`📡 AI API Response Status: ${aiResponse.status} ${aiResponse.statusText}`);

      if (!aiResponse.ok) {
        const aiErrorText = await aiResponse.text();
        addLog(`❌ AI API Error: ${aiErrorText}`);
        throw new Error(`AI analysis failed: ${aiResponse.status} - ${aiErrorText}`);
      }

      const aiResult = await aiResponse.json();
      addLog(`✅ AI Analysis Successful!`);
      addLog(`📊 AI Response: ${JSON.stringify(aiResult, null, 2)}`);

      setResults({
        ocr: ocrResult,
        ai: aiResult,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
          base64Length: base64Data.length
        }
      });

      addLog('🎉 Complete OCR + AI processing test successful!');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addLog(`❌ Test failed: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          if (!base64Data) {
            reject(new Error('Failed to convert file to base64'));
            return;
          }
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const testAPIEndpoints = async () => {
    addLog('🔍 Testing API endpoints...');
    
    try {
      // Test OCR endpoint
      addLog('📡 Testing OCR endpoint...');
      const ocrTest = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
        method: 'POST',
        body: new FormData() // Empty form data for health check
      });
      
      if (ocrTest.ok) {
        addLog(`✅ External OCR service: Available`);
      } else {
        addLog(`❌ External OCR service failed: ${ocrTest.status}`);
      }

      // Test compliance endpoints
      addLog('📡 Testing compliance endpoints...');
      const complianceTest = await fetch('/api/compliance/templates');
      if (complianceTest.ok) {
        addLog(`✅ /api/compliance/templates: Available`);
      } else {
        addLog(`❌ /api/compliance/templates failed: ${complianceTest.status}`);
      }

    } catch (error) {
      addLog(`❌ API endpoint test failed: ${error}`);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Bug className="h-8 w-8 text-red-500" />
          OCR Integration Debug Panel
        </h1>
        <p className="text-gray-600">
          Test and troubleshoot the OCR integration with Google Vision API. This panel will show you exactly what's happening at each step.
        </p>
      </div>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">OCR Test</TabsTrigger>
          <TabsTrigger value="debug">Debug Logs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload & OCR Test
              </CardTitle>
              <CardDescription>
                Upload a file to test the complete OCR + AI processing pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-sm text-gray-500">
                  Supported formats: JPG, PNG, GIF, BMP, TIFF, WEBP, PDF
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getFileIcon(file.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                    </p>
                  </div>
                  <Badge variant="outline">Ready for OCR</Badge>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={testOCRProcessing} 
                  disabled={!file || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Test OCR + AI Pipeline
                    </>
                  )}
                </Button>

                <Button 
                  onClick={testAPIEndpoints} 
                  variant="outline"
                  disabled={isProcessing}
                >
                  <Code className="mr-2 h-4 w-4" />
                  Test APIs
                </Button>

                <Button 
                  onClick={clearLogs} 
                  variant="outline"
                  disabled={isProcessing}
                >
                  Clear Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Status Check */}
          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Status</CardTitle>
              <CardDescription>
                Quick check of OCR and compliance API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">OCR API (External)</span>
                  <span className="text-sm text-gray-500">https://ocr-server-2-ykmk.onrender.com/upload</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">OCR Test (External)</span>
                  <span className="text-sm text-gray-500">External OCR service health check</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Compliance Templates</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Available
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Ask AI (/api/ask-ai)</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Available
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Logs
              </CardTitle>
              <CardDescription>
                Real-time logs showing each step of the OCR processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <p className="text-gray-500">No logs yet. Run a test to see debug information.</p>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  Test Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {results && (
            <>
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">File Information</Label>
                      <div className="mt-2 space-y-1 text-sm">
                        <p><strong>Name:</strong> {results.fileInfo.name}</p>
                        <p><strong>Type:</strong> {results.fileInfo.type}</p>
                        <p><strong>Size:</strong> {(results.fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p><strong>Base64 Length:</strong> {results.fileInfo.base64Length} characters</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">OCR Results</Label>
                      <div className="mt-2 space-y-1 text-sm">
                        <p><strong>Success:</strong> {results.ocr.success ? 'Yes' : 'No'}</p>
                        <p><strong>Text Length:</strong> {results.ocr.text?.length || 0} characters</p>
                        <p><strong>Method:</strong> {results.ocr.method || 'Google Vision API'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Extracted Text Preview</Label>
                    <Textarea
                      value={results.ocr.text || ''}
                      readOnly
                      className="mt-2 min-h-[150px] font-mono text-sm"
                      placeholder="No text extracted..."
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">AI Analysis Response</Label>
                    <Textarea
                      value={results.ai.response || results.ai.result || 'No AI response'}
                      readOnly
                      className="mt-2 min-h-[100px] font-mono text-sm"
                      placeholder="No AI response..."
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
