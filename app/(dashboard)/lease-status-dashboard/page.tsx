'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Building,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  Search
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { useLeaseNotifications } from '@/contexts/LeaseNotificationContext';
import LeaseProcessingStatus, { 
  ProcessingStats, 
  ActiveJobsList, 
  calculateJobStats,
  type ProcessingJob 
} from '@/components/LeaseProcessingStatus';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StatusDashboardFilters {
  dateRange: '24h' | '7d' | '30d' | 'all';
  status: 'all' | 'completed' | 'failed' | 'processing' | 'pending';
  buildingId?: string;
}

interface BuildingInfo {
  id: string;
  name: string;
  address: string;
}

export default function LeaseStatusDashboard() {
  const router = useRouter();
  const { refreshNotifications } = useLeaseNotifications();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<StatusDashboardFilters>({
    dateRange: '7d',
    status: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
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

      // Fetch jobs with filters
      let query = supabase
        .from('lease_processing_jobs')
        .select('*')
        .eq('user_id', user.id);

      // Apply date filter
      if (filters.dateRange !== 'all') {
        let startDate: Date;
        switch (filters.dateRange) {
          case '24h':
            startDate = startOfDay(subDays(new Date(), 1));
            break;
          case '7d':
            startDate = startOfWeek(new Date());
            break;
          case '30d':
            startDate = startOfMonth(new Date());
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply status filter
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply building filter
      if (filters.buildingId) {
        query = query.eq('building_id', filters.buildingId);
      }

      query = query.order('created_at', { ascending: false });

      const { data: jobsData, error: jobsError } = await query;

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        return;
      }

      // Fetch buildings for filter
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, address')
        .eq('user_id', user.id);

      if (!buildingsError && buildingsData) {
        setBuildings(buildingsData);
      }

      if (jobsData) {
        setJobs(jobsData);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchData(),
      refreshNotifications()
    ]);
    setRefreshing(false);
  };

  const filteredJobs = jobs.filter(job => {
    if (searchTerm) {
      return job.filename.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const stats = calculateJobStats(filteredJobs);
  const recentFailures = filteredJobs
    .filter(job => job.status === 'failed')
    .slice(0, 5);

  const exportData = () => {
    const csvContent = [
      ['Filename', 'Status', 'Created', 'Completed', 'Duration (s)', 'File Size (MB)', 'Error Message'],
      ...filteredJobs.map(job => [
        job.filename,
        job.status,
        format(new Date(job.created_at), 'PPP'),
        job.processing_completed_at ? format(new Date(job.processing_completed_at), 'PPP') : '',
        job.processing_duration_ms ? Math.round(job.processing_duration_ms / 1000) : '',
        (job.file_size / (1024 * 1024)).toFixed(2),
        job.error_message || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-processing-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Lease Processing Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor and track all lease document processing activities
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export Data
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building
              </label>
              <select
                value={filters.buildingId || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  buildingId: e.target.value || undefined 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Buildings</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Statistics */}
      <ProcessingStats jobs={filteredJobs} showTrends={true} className="mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Active Jobs */}
        <ActiveJobsList 
          jobs={filteredJobs}
          onJobClick={(job) => {
            if (job.status === 'completed') {
              router.push(`/lease-analysis/${job.id}`);
            }
          }}
        />

        {/* Recent Failures */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Recent Failures
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {recentFailures.length} failed jobs requiring attention
            </p>
          </div>
          
          {recentFailures.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <CheckCircle2 className="h-8 w-8 text-green-300 mx-auto mb-2" />
              <p className="text-sm">No recent failures</p>
              <p className="text-xs text-gray-400 mt-1">All jobs processing successfully</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentFailures.map((job) => (
                <div key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {job.filename}
                      </p>
                      <p className="text-xs text-red-600 mb-2">
                        {job.error_message || 'Processing failed'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Failed {format(new Date(job.created_at), 'MMM d, h:mm a')}
                        </span>
                        {job.retry_count > 0 && (
                          <span>Retry #{job.retry_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Performance Insights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {stats.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.completed} of {stats.completed + stats.failed} completed jobs
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.avgProcessingTime > 0 ? `${Math.round(stats.avgProcessingTime / 1000)}s` : '-'}
            </div>
            <div className="text-sm text-gray-600">Avg Processing Time</div>
            <div className="text-xs text-gray-500 mt-1">
              Based on {stats.completed} completed jobs
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.processing}
            </div>
            <div className="text-sm text-gray-600">Active Jobs</div>
            <div className="text-xs text-gray-500 mt-1">
              Currently processing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}