'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProcessingJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  created_at: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration_ms?: number;
  file_size: number;
  file_type: string;
  error_message?: string;
  retry_count: number;
  priority: number;
  ocr_source?: string;
}

export default function LeaseProcessingHistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    pending: 0
  });

  useEffect(() => {
    fetchProcessingJobs();
  }, []);

  const fetchProcessingJobs = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('lease_processing_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching processing jobs:', error);
        return;
      }

      if (data) {
        setJobs(data);
        
        // Calculate stats
        const stats = {
          total: data.length,
          completed: data.filter(j => j.status === 'completed').length,
          failed: data.filter(j => j.status === 'failed').length,
          processing: data.filter(j => j.status === 'processing').length,
          pending: data.filter(j => j.status === 'pending').length
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error in fetchProcessingJobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const retryJob = async (jobId: string) => {
    try {
      // This would typically call a retry endpoint
      console.log('Retrying job:', jobId);
      await fetchProcessingJobs(); // Refresh the list
    } catch (error) {
      console.error('Error retrying job:', error);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      const { error } = await supabase
        .from('lease_processing_jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        console.error('Error deleting job:', error);
        return;
      }

      await fetchProcessingJobs(); // Refresh the list
    } catch (error) {
      console.error('Error in deleteJob:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'retrying':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading processing history...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Lease Processing History
        </h1>
        <p className="text-gray-600">
          View and manage your document processing jobs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Jobs', value: stats.total, color: 'text-gray-600' },
          { label: 'Completed', value: stats.completed, color: 'text-green-600' },
          { label: 'Failed', value: stats.failed, color: 'text-red-600' },
          { label: 'Processing', value: stats.processing, color: 'text-blue-600' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="retrying">Retrying</option>
            </select>
          </div>
          
          <button
            onClick={fetchProcessingJobs}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No processing jobs found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {job.filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            {job.file_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        {job.retry_count > 0 && (
                          <span className="text-xs text-gray-500">
                            (retry {job.retry_count})
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {job.processing_duration_ms 
                        ? `${Math.round(job.processing_duration_ms / 1000)}s`
                        : job.status === 'processing' 
                          ? 'In progress...'
                          : '-'
                      }
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatFileSize(job.file_size)}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {job.status === 'completed' && (
                          <button
                            onClick={() => router.push(`/lease-analysis/${job.id}`)}
                            className="p-1 text-blue-600 hover:text-blue-900"
                            title="View Results"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        
                        {job.status === 'failed' && (
                          <button
                            onClick={() => retryJob(job.id)}
                            className="p-1 text-orange-600 hover:text-orange-900"
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="p-1 text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}