'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Clock, CheckCircle, AlertCircle, Eye, Link, Download } from 'lucide-react';
import UploadPanel from './components/UploadPanel';
import JobsList from './components/JobsList';
import AnalysisDrawer from './components/AnalysisDrawer';

export interface DocumentJob {
  id: string;
  filename: string;
  status: 'QUEUED' | 'OCR' | 'EXTRACT' | 'SUMMARISE' | 'READY' | 'FAILED';
  size_bytes: number;
  mime: string;
  page_count?: number;
  doc_type_guess?: string;
  linked_building_id?: string;
  linked_unit_id?: string;
  error_code?: string;
  error_message?: string;
  summary_json?: any;
  created_at: string;
  updated_at: string;
  user_id: string;
  agency_id: string;
}

export default function LeaseLabClient() {
  const [jobs, setJobs] = useState<DocumentJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DocumentJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/lease-lab/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (job: DocumentJob) => {
    setJobs(prev => [job, ...prev]);
  };

  const handleViewAnalysis = (job: DocumentJob) => {
    setSelectedJob(job);
    setShowAnalysis(true);
  };

  const handleAttachToBuilding = async (jobId: string, buildingId: string, unitId?: string) => {
    try {
      const response = await fetch(`/api/lease-lab/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          linked_building_id: buildingId,
          linked_unit_id: unitId 
        })
      });

      if (response.ok) {
        await fetchJobs(); // Refresh jobs list
        setShowAnalysis(false);
      }
    } catch (error) {
      console.error('Error attaching to building:', error);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    // Remove the job from local state immediately for better UX
    setJobs(prev => prev.filter(job => job.id !== jobId));
    
    // If the deleted job was being viewed, close the analysis drawer
    if (selectedJob?.id === jobId) {
      setShowAnalysis(false);
      setSelectedJob(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Panel */}
      <UploadPanel onUploadSuccess={handleUploadSuccess} />

      {/* Jobs List */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Analyses</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
            <p className="text-gray-500">PDF or DOCX up to 50 MB / 300 pages.</p>
          </div>
        ) : (
          <JobsList 
            jobs={jobs} 
            onViewAnalysis={handleViewAnalysis}
            onRefresh={fetchJobs}
            onDelete={handleDeleteJob}
          />
        )}
      </div>

      {/* Analysis Drawer */}
      {showAnalysis && selectedJob && (
        <AnalysisDrawer
          job={selectedJob}
          onClose={() => setShowAnalysis(false)}
          onAttachToBuilding={handleAttachToBuilding}
        />
      )}
    </div>
  );
}
