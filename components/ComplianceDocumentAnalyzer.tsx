"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AnalysisResult {
  success: boolean;
  summary: string;
  doc_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  key_risks: string | null;
  compliance_status: string | null;
  building_id: number | null;
}

export default function ComplianceDocumentAnalyzer() {
  const [documentId, setDocumentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!documentId.trim()) {
      setError("Please enter a document ID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/extract-summary', {
        method: 'POST',
        body: JSON.stringify({ documentId: documentId.trim() }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const analysisResult = await res.json();
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Compliance Document Analyzer</h2>
        <p className="text-gray-600">
          Analyze existing compliance documents using AI to extract key information.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="documentId">Document ID</Label>
          <Input
            id="documentId"
            type="text"
            placeholder="Enter the document ID from compliance_docs table"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={loading || !documentId.trim()}
          className="w-full"
        >
          {loading ? "Analyzing..." : "Analyze Document"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
          <h3 className="text-green-800 font-medium">Analysis Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Document Type</Label>
              <p className="text-sm text-gray-900">{result.doc_type || "Not identified"}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Compliance Status</Label>
              <p className="text-sm text-gray-900">{result.compliance_status || "Not specified"}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Issue Date</Label>
              <p className="text-sm text-gray-900">{result.issue_date || "Not found"}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Expiry Date</Label>
              <p className="text-sm text-gray-900">{result.expiry_date || "Not found"}</p>
            </div>
          </div>

          {result.key_risks && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Key Risks/Actions</Label>
              <p className="text-sm text-gray-900 mt-1">{result.key_risks}</p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-gray-700">Summary</Label>
            <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">{result.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
} 