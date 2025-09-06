'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface LeaseAnalysisResultsProps {
  jobId: string;
}

interface ResultsData {
  success: boolean;
  jobId: string;
  documentId: string;
  filename: string;
  status: string;
  processing: {
    startedAt: string;
    completedAt: string;
    duration: string;
    durationMs: number;
    ocrSource: string;
  };
  file: {
    name: string;
    size: number;
    sizeFormatted: string;
    type: string;
  };
  extractedText: {
    content: string;
    length: number;
    preview: string;
    hasFullText: boolean;
  };
  leaseAnalysis: {
    confidence: number;
    summary: string;
    clauses: Array<{
      term: string;
      text: string;
      value?: string;
    }>;
    keyTerms: Record<string, string>;
    clauseCount: number;
    keyTermCount: number;
    hasAnalysis: boolean;
  };
  building?: {
    id: string;
    name: string;
    address: string;
  };
  urls: {
    downloadText: string;
    downloadAnalysis: string;
    downloadFull: string;
  };
}

export default function LeaseAnalysisResults({ jobId }: LeaseAnalysisResultsProps) {
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'text'>('summary');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [jobId]);

  const loadResults = async () => {
    try {
      // Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const sessionResult = await supabase.auth.getSession();
      const sessionData = sessionResult?.data || {}
      const session = sessionData.session || null
      const sessionError = sessionResult?.error || null
      
      if (sessionError || !session) {
        setError('Please log in to view results');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/lease-processing/results/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data: ResultsData = await response.json();
        setResults(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load results');
      }
    } catch (err) {
      console.error('Failed to load results:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string) => {
    if (!results) return;
    
    setIsDownloading(format);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/lease-processing/results/${jobId}/download?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lease_${format}_${results.filename.replace(/\.[^/.]+$/, '')}.${format === 'json' ? 'json' : 'txt'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed');
    } finally {
      setIsDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className=\"max-w-4xl mx-auto p-6\">
        <div className=\"animate-pulse space-y-4\">
          <div className=\"h-8 bg-gray-200 rounded w-1/3\"></div>
          <div className=\"h-4 bg-gray-200 rounded w-2/3\"></div>
          <div className=\"space-y-3\">
            <div className=\"h-4 bg-gray-200 rounded\"></div>
            <div className=\"h-4 bg-gray-200 rounded w-5/6\"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"max-w-4xl mx-auto p-6\">
        <div className=\"bg-red-50 border border-red-200 rounded-lg p-4\">
          <div className=\"flex items-center space-x-3\">
            <div className=\"text-red-500 text-xl\">❌</div>
            <div>
              <h3 className=\"font-medium text-red-900\">Error Loading Results</h3>
              <p className=\"text-sm text-red-700\">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className=\"max-w-4xl mx-auto p-6\">
        <div className=\"text-center text-gray-500\">No results available</div>
      </div>
    );
  }

  return (
    <div className=\"max-w-6xl mx-auto p-6 space-y-6\">
      {/* Header */}
      <div className=\"bg-white rounded-lg shadow-sm border p-6\">
        <div className=\"flex items-start justify-between\">
          <div>
            <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">
              📄 Lease Analysis Results
            </h1>
            <p className=\"text-gray-600\">{results.filename}</p>
          </div>
          <div className=\"text-right text-sm text-gray-500\">
            <div>Job ID: {results.jobId}</div>
            <div>Completed: {new Date(results.processing.completedAt).toLocaleString()}</div>
            <div>Duration: {results.processing.duration}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4 mt-6\">
          <div className=\"bg-blue-50 rounded-lg p-4 text-center\">
            <div className=\"text-2xl font-bold text-blue-600\">{results.leaseAnalysis.confidence * 100}%</div>
            <div className=\"text-sm text-blue-800\">Analysis Confidence</div>
          </div>
          <div className=\"bg-green-50 rounded-lg p-4 text-center\">
            <div className=\"text-2xl font-bold text-green-600\">{results.leaseAnalysis.clauseCount}</div>
            <div className=\"text-sm text-green-800\">Lease Clauses</div>
          </div>
          <div className=\"bg-purple-50 rounded-lg p-4 text-center\">
            <div className=\"text-2xl font-bold text-purple-600\">{results.leaseAnalysis.keyTermCount}</div>
            <div className=\"text-sm text-purple-800\">Key Terms</div>
          </div>
          <div className=\"bg-orange-50 rounded-lg p-4 text-center\">
            <div className=\"text-2xl font-bold text-orange-600\">{results.extractedText.length.toLocaleString()}</div>
            <div className=\"text-sm text-orange-800\">Characters</div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className=\"flex space-x-3 mt-6\">
          <button
            onClick={() => handleDownload('analysis')}
            disabled={isDownloading === 'analysis'}
            className=\"px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium\"
          >
            {isDownloading === 'analysis' ? '⬇️ Downloading...' : '📊 Download Analysis'}
          </button>
          <button
            onClick={() => handleDownload('text')}
            disabled={isDownloading === 'text'}
            className=\"px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium\"
          >
            {isDownloading === 'text' ? '⬇️ Downloading...' : '📝 Download Text'}
          </button>
          <button
            onClick={() => handleDownload('full')}
            disabled={isDownloading === 'full'}
            className=\"px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium\"
          >
            {isDownloading === 'full' ? '⬇️ Downloading...' : '📋 Download Complete Report'}
          </button>
          <button
            onClick={() => handleDownload('json')}
            disabled={isDownloading === 'json'}
            className=\"px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 font-medium\"
          >
            {isDownloading === 'json' ? '⬇️ Downloading...' : '🔧 JSON Data'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className=\"bg-white rounded-lg shadow-sm border\">
        <div className=\"border-b border-gray-200\">
          <nav className=\"flex space-x-8 px-6\">
            {[
              { id: 'summary', label: '📋 Summary', count: null },
              { id: 'clauses', label: '📜 Lease Clauses', count: results.leaseAnalysis.clauseCount },
              { id: 'text', label: '📝 Extracted Text', count: null }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} {tab.count && `(${tab.count})`}
              </button>
            ))}
          </nav>
        </div>

        <div className=\"p-6\">
          {activeTab === 'summary' && (
            <div className=\"space-y-6\">
              {/* Summary */}
              <div>
                <h3 className=\"text-lg font-medium text-gray-900 mb-3\">Analysis Summary</h3>
                <div className=\"bg-gray-50 rounded-lg p-4\">
                  <p className=\"text-gray-800\">{results.leaseAnalysis.summary}</p>
                </div>
              </div>

              {/* Key Terms */}
              {Object.keys(results.leaseAnalysis.keyTerms).length > 0 && (
                <div>
                  <h3 className=\"text-lg font-medium text-gray-900 mb-3\">Key Terms Extracted</h3>
                  <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                    {Object.entries(results.leaseAnalysis.keyTerms).map(([key, value]) => (
                      <div key={key} className=\"bg-blue-50 rounded-lg p-4\">
                        <div className=\"font-medium text-blue-900 capitalize\">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className=\"text-blue-800\">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Info */}
              <div>
                <h3 className=\"text-lg font-medium text-gray-900 mb-3\">Processing Information</h3>
                <div className=\"bg-gray-50 rounded-lg p-4 space-y-2 text-sm\">
                  <div><strong>OCR Source:</strong> {results.processing.ocrSource}</div>
                  <div><strong>File Size:</strong> {results.file.sizeFormatted}</div>
                  <div><strong>Processing Time:</strong> {results.processing.duration}</div>
                  {results.building && (
                    <div><strong>Building:</strong> {results.building.name} - {results.building.address}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clauses' && (
            <div className=\"space-y-4\">
              <div className=\"flex items-center justify-between\">
                <h3 className=\"text-lg font-medium text-gray-900\">
                  Lease Clauses ({results.leaseAnalysis.clauseCount})
                </h3>
              </div>
              
              {results.leaseAnalysis.clauses.length > 0 ? (
                <div className=\"space-y-4\">
                  {results.leaseAnalysis.clauses.map((clause, index) => (
                    <div key={index} className=\"border border-gray-200 rounded-lg p-4\">
                      <div className=\"flex items-start space-x-3\">
                        <div className=\"bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium min-w-0\">
                          {clause.term || `Clause ${index + 1}`}
                        </div>
                        {clause.value && (
                          <div className=\"bg-green-100 text-green-800 px-2 py-1 rounded text-sm\">
                            {clause.value}
                          </div>
                        )}
                      </div>
                      <div className=\"mt-3 text-gray-800\">{clause.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className=\"text-center text-gray-500 py-8\">
                  No lease clauses were extracted from this document.
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className=\"space-y-4\">
              <div className=\"flex items-center justify-between\">
                <h3 className=\"text-lg font-medium text-gray-900\">
                  Extracted Text ({results.extractedText.length.toLocaleString()} characters)
                </h3>
              </div>
              
              {results.extractedText.hasFullText ? (
                <div className=\"bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto\">
                  <pre className=\"whitespace-pre-wrap text-sm text-gray-800 font-mono\">
                    {results.extractedText.content}
                  </pre>
                </div>
              ) : (
                <div className=\"text-center text-gray-500 py-8\">
                  No text was extracted from this document.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}