'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportProgress {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
  count?: number;
}

export default function DataImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress[]>([]);
  const [importComplete, setImportComplete] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please upload an Excel file (.xlsx)');
        return;
      }
      setFile(selectedFile);
      setProgress([]);
      setImportComplete(false);
    }
  };

  const downloadTemplate = () => {
    // Download the template file
    window.open('/BlocIQ_Onboarding_Template.xlsx', '_blank');
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    setProgress([
      { step: 'upload', status: 'processing', message: 'Uploading file...' }
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-data', {
        method: 'POST',
        body: formData,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const update = JSON.parse(line);
                setProgress(prev => {
                  const existing = prev.findIndex(p => p.step === update.step);
                  if (existing >= 0) {
                    const newProgress = [...prev];
                    newProgress[existing] = update;
                    return newProgress;
                  }
                  return [...prev, update];
                });

                if (update.status === 'error') {
                  toast.error(update.message);
                }
              } catch (e) {
                // Ignore parsing errors for non-JSON lines
              }
            }
          }
        }
      }

      setImportComplete(true);
      toast.success('Data imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data. Please try again.');
      setProgress(prev => [
        ...prev,
        { step: 'error', status: 'error', message: 'Import failed. Please check your file and try again.' }
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl mb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Data Import
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              Upload your Excel spreadsheet to import buildings, units, leaseholders, and more
            </p>
          </div>
        </div>
      </section>

      <div className="px-6 space-y-6 max-w-5xl mx-auto">
        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>How to Import Your Data</CardTitle>
            <CardDescription>Follow these steps to import your property data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Download the Template</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Download our Excel template with all required sheets and example data
                  </p>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Fill in Your Data</h3>
                  <p className="text-sm text-gray-600">
                    Complete the template with your buildings, units, leaseholders, leases, and apportionments.
                    Delete the example rows before importing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Upload & Import</h3>
                  <p className="text-sm text-gray-600">
                    Upload your completed spreadsheet and click Import. The system will validate and import your data automatically.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>Select your completed Excel spreadsheet (.xlsx)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Click to select Excel file
                      </p>
                      <p className="text-xs text-gray-500">or drag and drop</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!file || isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        {progress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
              <CardDescription>
                {importComplete ? 'Import completed!' : 'Importing your data...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progress.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.message}</p>
                      {item.count !== undefined && (
                        <p className="text-xs text-gray-600 mt-1">
                          {item.count} records processed
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {importComplete && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-900">Import Complete!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Your data has been successfully imported. You can now view it in the dashboard.
                      </p>
                    </div>
                  </div>
                  <Button className="mt-4" onClick={() => window.location.href = '/buildings'}>
                    View Buildings
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}