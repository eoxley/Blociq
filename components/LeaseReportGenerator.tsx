"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LeaseReportGeneratorProps {
  documentId?: string;
  buildingId?: string;
  unitId?: string;
  agencyId?: string;
  onReportGenerated?: (report: string) => void;
}

export default function LeaseReportGenerator({
  documentId,
  buildingId,
  unitId,
  agencyId,
  onReportGenerated
}: LeaseReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>('');
  const [fields, setFields] = useState<any>(null);
  const [source, setSource] = useState<string>('');

  const generateReport = async () => {
    if (!documentId && !buildingId) {
      toast.error('Document ID or Building ID required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/extract-lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          buildingId,
          unitId,
          agencyId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const result = await response.json();
      
      setReport(result.report);
      setFields(result.fields);
      setSource(result.source);
      
      onReportGenerated?.(result.report);
      
      toast.success(`Lease report generated using ${result.source}`);
      
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-report-${documentId || 'generated'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const useDocAI = process.env.NEXT_PUBLIC_USE_DOCUMENT_AI === 'true';

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lease Report Generator
          {useDocAI && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Document AI Enabled
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={generateReport} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Lease Report'}
          </Button>
          
          {report && (
            <Button 
              variant="outline"
              onClick={downloadReport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          )}
        </div>

        {source && (
          <div className="text-sm text-gray-600">
            <strong>OCR Source:</strong> {source === 'docai' ? 'Google Document AI (EU)' : source}
            {source === 'docai' && ' 🎉'}
          </div>
        )}

        {fields && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium mb-2">Extracted Fields:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(fields).map(([key, value]) => {
                if (!value) return null;
                return (
                  <div key={key}>
                    <strong>{key.replace(/_/g, ' ')}:</strong> {String(value).substring(0, 50)}
                    {String(value).length > 50 && '...'}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {report && (
          <div className="border rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium">Generated Report</h4>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {report}
              </pre>
            </div>
          </div>
        )}

        {!useDocAI && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Document AI is currently disabled. Using fallback OCR methods.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}