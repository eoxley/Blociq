'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  Download, 
  Share2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Building,
  Users,
  Calendar,
  PoundSterling,
  MapPin,
  FileCheck,
  Copy,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LeaseAnalysisData {
  id: string;
  filename: string;
  status: string;
  processing_completed_at: string;
  processing_duration_ms: number;
  results: any;
  lease_analysis: any;
  extracted_text: string;
  error_message?: string;
  file_size: number;
  file_type: string;
  building_id?: string;
  ocr_source?: string;
  created_at: string;
}

interface KeyTerms {
  property?: string;
  tenant?: string;
  landlord?: string;
  monthlyRent?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseTerm?: string;
  deposit?: string;
  propertyAddress?: string;
}

interface LeaseClause {
  type: string;
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
  section?: string;
}

export default function LeaseAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  
  const [analysisData, setAnalysisData] = useState<LeaseAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemReady, setSystemReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clauses' | 'document'>('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkSystemReadiness();
  }, [jobId]);

  const checkSystemReadiness = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Check if lease_processing_jobs table exists
      const { error: tableError } = await supabase
        .from('lease_processing_jobs')
        .select('id')
        .limit(1);

      if (tableError) {
        setError('Lease processing system is not configured. Please contact your administrator.');
        setSystemReady(false);
        return;
      }

      setSystemReady(true);
      fetchAnalysisData();
      
    } catch (error) {
      console.error('System readiness check failed:', error);
      setError('Failed to check system status. Please try again.');
      setSystemReady(false);
    }
  };

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      
      // Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const authResult = await supabase.auth.getUser();
      const authData = authResult?.data || {}
      const user = authData.user || null
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('lease_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching analysis data:', fetchError);
        setError('Failed to load analysis data');
        return;
      }

      if (!data) {
        setError('Analysis not found');
        return;
      }

      setAnalysisData(data);
    } catch (err) {
      console.error('Error in fetchAnalysisData:', err);
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const parseAnalysis = (data: LeaseAnalysisData) => {
    let keyTerms: KeyTerms = {};
    let clauses: LeaseClause[] = [];
    let analysisText = '';

    // Try to extract from different possible formats
    const analysis = data.lease_analysis || data.results;
    
    if (analysis) {
      if (typeof analysis === 'string') {
        analysisText = analysis;
        // Try to extract key terms from text
        keyTerms = extractKeyTermsFromText(analysis);
      } else if (typeof analysis === 'object') {
        keyTerms = analysis.keyTerms || analysis.key_terms || {};
        clauses = analysis.clauses || [];
        analysisText = analysis.summary || analysis.analysis || JSON.stringify(analysis, null, 2);
      }
    }

    return { keyTerms, clauses, analysisText };
  };

  const extractKeyTermsFromText = (text: string): KeyTerms => {
    const terms: KeyTerms = {};
    
    // Simple extraction patterns
    const patterns = {
      monthlyRent: /(?:rent|rental).*?£([\d,]+(?:\.\d{2})?)/i,
      tenant: /(?:tenant|lessee).*?:?\s*([^.]+)/i,
      landlord: /(?:landlord|lessor).*?:?\s*([^.]+)/i,
      leaseStartDate: /(?:start|commencement).*?(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+\w+\s+\d{4})/i,
      leaseTerm: /(?:term|period).*?(\d+\s+(?:years?|months?))/i,
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        terms[key as keyof KeyTerms] = match[1]?.trim();
      }
    });

    return terms;
  };

  const handleDownload = async () => {
    if (!analysisData) return;
    
    const { keyTerms, clauses, analysisText } = parseAnalysis(analysisData);
    
    const content = `
LEASE ANALYSIS REPORT
=====================

Document: ${analysisData.filename}
Processed: ${format(new Date(analysisData.processing_completed_at), 'PPP')}
Processing Time: ${Math.round(analysisData.processing_duration_ms / 1000)}s

KEY TERMS
---------
${Object.entries(keyTerms).map(([key, value]) => `${key}: ${value || 'Not specified'}`).join('\n')}

ANALYSIS
--------
${analysisText}

${clauses.length > 0 ? `
LEASE CLAUSES
-------------
${clauses.map((clause, i) => `${i + 1}. ${clause.title}\n   ${clause.content}`).join('\n\n')}
` : ''}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-analysis-${analysisData.filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!systemReady) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600 mr-3" />
            <h2 className="text-2xl font-bold text-yellow-800">Lease Processing System Not Available</h2>
          </div>
          <p className="text-yellow-700 mb-4">
            The lease processing system is currently being set up. This feature requires:
          </p>
          <ul className="list-disc list-inside text-yellow-700 mb-6 space-y-2">
            <li>Database tables for job processing</li>
            <li>Background OCR processing service</li>
            <li>Email notification system</li>
            <li>File storage configuration</li>
          </ul>
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              Please contact your administrator to enable lease processing functionality.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analysis...</span>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Analysis Not Found</h1>
        <p className="text-gray-600 mb-4">{error || 'The requested analysis could not be found.'}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  const { keyTerms, clauses, analysisText } = parseAnalysis(analysisData);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
            <button
              onClick={() => copyToClipboard(analysisText)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Analysis'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Lease Analysis Results
              </h1>
              <p className="text-gray-600 mb-4">{analysisData.filename}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  {analysisData.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="capitalize">{analysisData.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Completed {format(new Date(analysisData.processing_completed_at), 'PPp')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    {(analysisData.file_size / (1024 * 1024)).toFixed(1)} MB • 
                    {Math.round(analysisData.processing_duration_ms / 1000)}s processing
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">OCR Source</div>
              <div className="text-sm font-medium text-gray-900">
                {analysisData.ocr_source || 'External OCR'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FileCheck },
              { id: 'clauses', label: 'Lease Clauses', icon: FileText },
              { id: 'document', label: 'Document Text', icon: Copy },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Terms */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                Key Terms
              </h3>
              
              <div className="space-y-4">
                {Object.entries(keyTerms).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-sm text-gray-900 text-right max-w-xs">
                      {value || 'Not specified'}
                    </span>
                  </div>
                ))}
                
                {Object.keys(keyTerms).length === 0 && (
                  <p className="text-sm text-gray-500">
                    No structured key terms extracted. Check the analysis text for detailed information.
                  </p>
                )}
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Analysis Summary
              </h3>
              
              <div className="prose max-w-none text-sm text-gray-700">
                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  {analysisText || 'No analysis summary available.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clauses' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Clauses</h3>
            
            {clauses.length > 0 ? (
              <div className="space-y-4">
                {clauses.map((clause, index) => (
                  <div
                    key={index}
                    className={`border-l-4 pl-4 py-3 ${
                      clause.importance === 'high'
                        ? 'border-red-400 bg-red-50'
                        : clause.importance === 'medium'
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-green-400 bg-green-50'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      {clause.title}
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        clause.importance === 'high'
                          ? 'bg-red-100 text-red-700'
                          : clause.importance === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {clause.importance}
                      </span>
                    </h4>
                    <p className="text-sm text-gray-700">{clause.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No structured lease clauses extracted.</p>
                <p className="text-sm">Check the document text tab for the full content.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'document' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Extracted Text</h3>
              <div className="text-sm text-gray-500">
                {analysisData.extracted_text?.length || 0} characters extracted
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {analysisData.extracted_text || 'No text extracted from document.'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}