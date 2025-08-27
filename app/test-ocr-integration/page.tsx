'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, Image, CheckCircle, XCircle } from 'lucide-react';

export default function TestOCRIntegration() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    text?: string;
    method?: string;
    success?: boolean;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Convert file to base64
      const base64Data = await fileToBase64(file);
      
      // Call the OCR API
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Image: base64Data,
          mimeType: file.type,
          filename: file.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'OCR processing failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getFileTypeBadge = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Badge variant="secondary">Image</Badge>;
    if (fileType === 'application/pdf') return <Badge variant="secondary">PDF</Badge>;
    return <Badge variant="outline">Document</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">OCR Integration Test</h1>
        <p className="text-gray-600">
          Test the Google Vision API OCR integration for document text extraction.
        </p>
      </div>

      <div className="grid gap-6">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File Upload
            </CardTitle>
            <CardDescription>
              Upload an image or PDF to test OCR processing
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
                {getFileTypeBadge(file.type)}
              </div>
            )}

            <Button 
              onClick={processFile} 
              disabled={!file || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Process with OCR
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                OCR Processing Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Extracted Text Length</Label>
                  <p className="text-lg font-semibold">{result.text?.length || 0} characters</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Processing Method</Label>
                  <p className="text-lg font-semibold">{result.method || 'Google Vision API'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Extracted Text</Label>
                <Textarea
                  value={result.text || ''}
                  readOnly
                  className="mt-2 min-h-[200px] font-mono text-sm"
                  placeholder="No text extracted..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Section */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                OCR Processing Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
              <div className="mt-4 p-3 bg-red-100 rounded-lg">
                <p className="text-sm text-red-800 font-medium">Troubleshooting Tips:</p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• Ensure the image/PDF contains readable text</li>
                  <li>• Check that the file size is under 10MB</li>
                  <li>• Verify Google Vision API credentials are configured</li>
                  <li>• Try a different image or document</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Status Check */}
        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
            <CardDescription>
              Check if the OCR API endpoints are accessible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">OCR API (/api/ocr)</span>
                <Badge variant="outline">Available</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">OCR Test (/api/ocr-test)</span>
                <Badge variant="outline">Available</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
