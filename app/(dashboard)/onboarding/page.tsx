'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Edit3,
  Eye,
  AlertCircle,
  Clock,
  Database,
  FileCheck
} from 'lucide-react';

interface RawUpload {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  detected_type?: string;
  detected_category?: string;
  confidence_score?: number;
  building_name?: string;
  created_at: string;
  batch?: {
    batch_name: string;
  };
}

interface StructuredRecord {
  id: string;
  suggested_table: string;
  status: string;
  confidence?: number;
  data: any;
  original_text?: string;
  created_at: string;
  raw_file: {
    file_name: string;
    file_type: string;
    building_name?: string;
    detected_type?: string;
  };
}

interface EditModalData {
  id: string;
  suggested_table: string;
  data: any;
  original_text?: string;
}

interface InlineEditState {
  [key: string]: {
    isEditing: boolean;
    jsonString: string;
    error: string | null;
  };
}

export default function OnboardingDashboard() {
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [rawUploads, setRawUploads] = useState<RawUpload[]>([]);
  const [structuredRecords, setStructuredRecords] = useState<StructuredRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'raw' | 'staging'>('staging');
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>({});

  // Add cookie clearing utility
  const clearCookiesAndReload = () => {
    try {
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }
  };

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      
      // Check authentication with better error handling
      if (!user) {
        console.log('❌ No user, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('🔐 User authenticated:', user.id);

      // Check if user is super_admin with retry logic
      let profile = null;
      let profileError = null;
      
      try {
        const result = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        profile = result.data;
        profileError = result.error;
      } catch (cookieError) {
        console.error('Cookie parsing error:', cookieError);
        // Try to clear cookies and retry
        try {
          // Clear any malformed cookies
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          
          // Retry after clearing cookies
          const retryResult = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          profile = retryResult.data;
          profileError = retryResult.error;
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          profileError = retryError;
        }
      }

      console.log('👤 Profile check:', { profile, error: profileError });

      if (profileError || !profile || profile.role !== 'super_admin') {
        console.log('⛔ Not super_admin, showing unauthorized');
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      console.log('✅ Super admin confirmed, fetching data');

      // Fetch data
      await fetchRawUploads();
      await fetchStructuredRecords();

    } catch (error) {
      console.error('Auth check error:', error);
      setUnauthorized(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRawUploads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found for fetchRawUploads');
        return;
      }

      const response = await fetch('/api/onboarding/upload', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch uploads:', response.status);
        setRawUploads([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setRawUploads(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching raw uploads:', error);
      setRawUploads([]);
    }
  };

  const fetchStructuredRecords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found for fetchStructuredRecords');
        return;
      }

      const response = await fetch('/api/onboarding/extract?status=pending', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch extracts:', response.status);
        setStructuredRecords([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setStructuredRecords(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching structured records:', error);
      setStructuredRecords([]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/onboarding/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        await fetchRawUploads();
        alert('File uploaded successfully! AI processing will begin shortly.');
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleReviewAction = async (structuredId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/onboarding/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredId, action }),
      });

      const result = await response.json();
      if (result.success) {
        if (action === 'accept') {
          // Also commit to production
          await commitToProduction(structuredId);
        }
        await fetchStructuredRecords();
        alert(`Record ${action}ed successfully!`);
      } else {
        alert(`Action failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Review action error:', error);
      alert('Action failed');
    }
  };

  const commitToProduction = async (structuredId: string) => {
    try {
      const response = await fetch('/api/onboarding/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredIds: [structuredId] }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Commit failed:', result.error);
      }
    } catch (error) {
      console.error('Commit error:', error);
    }
  };

  const handleEditSave = async () => {
    if (!editModal) return;

    try {
      const response = await fetch('/api/onboarding/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          structuredId: editModal.id, 
          action: 'edit',
          editedData: editingData
        }),
      });

      const result = await response.json();
      if (result.success) {
        setEditModal(null);
        setEditingData({});
        await fetchStructuredRecords();
        alert('Data updated successfully!');
      } else {
        alert(`Update failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Edit save error:', error);
      alert('Update failed');
    }
  };

  const openEditModal = (record: StructuredRecord) => {
    setEditModal({
      id: record.id,
      suggested_table: record.suggested_table,
      data: record.data,
      original_text: record.original_text
    });
    setEditingData({ ...record.data });
  };

  const startInlineEdit = (recordId: string, data: any) => {
    setInlineEdit(prev => ({
      ...prev,
      [recordId]: {
        isEditing: true,
        jsonString: JSON.stringify(data, null, 2),
        error: null
      }
    }));
  };

  const cancelInlineEdit = (recordId: string) => {
    setInlineEdit(prev => ({
      ...prev,
      [recordId]: {
        isEditing: false,
        jsonString: '',
        error: null
      }
    }));
  };

  const saveInlineEdit = async (recordId: string) => {
    const editState = inlineEdit[recordId];
    if (!editState) return;

    try {
      // Validate JSON
      const parsedData = JSON.parse(editState.jsonString);
      
      // Save via API
      const response = await fetch('/api/onboarding/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          structuredId: recordId, 
          action: 'edit',
          editedData: parsedData
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Update local state
        setStructuredRecords(prev => prev.map(record => 
          record.id === recordId 
            ? { ...record, data: parsedData }
            : record
        ));
        cancelInlineEdit(recordId);
        alert('Data updated successfully!');
      } else {
        setInlineEdit(prev => ({
          ...prev,
          [recordId]: {
            ...prev[recordId],
            error: result.error
          }
        }));
      }
    } catch (error) {
      setInlineEdit(prev => ({
        ...prev,
        [recordId]: {
          ...prev[recordId],
          error: 'Invalid JSON format'
        }
      }));
    }
  };

  const handleReject = async (recordId: string) => {
    if (confirm('Are you sure you want to reject this extraction? This will delete the record.')) {
      await handleReviewAction(recordId, 'reject');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderFieldEditor = (key: string, value: any) => {
    const fieldType = typeof value;
    
    if (fieldType === 'boolean') {
      return (
        <select
          value={editingData[key] ? 'true' : 'false'}
          onChange={(e) => setEditingData({ ...editingData, [key]: e.target.value === 'true' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
    
    if (fieldType === 'number') {
      return (
        <input
          type="number"
          value={editingData[key] || ''}
          onChange={(e) => setEditingData({ ...editingData, [key]: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
    }
    
    if (key.includes('date') || key.includes('Date')) {
      return (
        <input
          type="date"
          value={editingData[key] || ''}
          onChange={(e) => setEditingData({ ...editingData, [key]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
    }
    
    return (
      <input
        type="text"
        value={editingData[key] || ''}
        onChange={(e) => setEditingData({ ...editingData, [key]: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">Super admin access required</p>
          <p className="mt-2 text-sm text-gray-500">
            If you're experiencing cookie parsing errors, try clearing your browser data:
          </p>
          <div className="mt-4 space-y-2">
            <button
              onClick={clearCookiesAndReload}
              className="block w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Clear Cookies & Reload
            </button>
            <button
              onClick={() => router.push('/home')}
              className="block w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Onboarding Dashboard</h1>
          <p className="text-gray-600 mt-2">AI-powered data extraction and review</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('raw')}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'raw'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Raw Uploads ({rawUploads.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('staging')}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'staging'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Staging Review ({structuredRecords.length})</span>
            </button>
          </nav>
        </div>

        {/* Raw Uploads Panel */}
        {activeTab === 'raw' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Files</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload files for AI processing
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      PDF, Excel, Word, TXT, CSV files up to 50MB
                    </span>
                  </label>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv"
                  />
                </div>
                {uploading && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Uploading and processing...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Files List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detected Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rawUploads.map(file => (
                      <tr key={file.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {file.file_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.file_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(file.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(file.processing_status)}`}>
                            {file.processing_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.detected_type || 'Not detected'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.confidence_score ? `${(file.confidence_score * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Staging Review Panel */}
        {activeTab === 'staging' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending Reviews</h3>
                <p className="text-sm text-gray-600 mt-1">
                  AI-extracted data awaiting your review and approval
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Suggested Table
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pretty JSON Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {structuredRecords.map(record => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {record.raw_file.file_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.raw_file.detected_type || 'Unknown type'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Database className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {record.suggested_table}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-lg">
                            {inlineEdit[record.id]?.isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={inlineEdit[record.id].jsonString}
                                  onChange={(e) => setInlineEdit(prev => ({
                                    ...prev,
                                    [record.id]: {
                                      ...prev[record.id],
                                      jsonString: e.target.value,
                                      error: null
                                    }
                                  }))}
                                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Edit JSON data..."
                                />
                                {inlineEdit[record.id].error && (
                                  <div className="text-xs text-red-600">
                                    {inlineEdit[record.id].error}
                                  </div>
                                )}
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => saveInlineEdit(record.id)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => cancelInlineEdit(record.id)}
                                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-md p-3">
                                <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(record.data, null, 2)}
                                </pre>
                                <button
                                  onClick={() => startInlineEdit(record.id, record.data)}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Click to edit JSON
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (record.confidence || 0) >= 0.8 
                                ? 'bg-green-100 text-green-800'
                                : (record.confidence || 0) >= 0.6
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleReviewAction(record.id, 'accept')}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                            title="Accept and commit to production"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Accept → Commit
                          </button>
                          <button
                            onClick={() => startInlineEdit(record.id, record.data)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                            title="Edit JSON data inline"
                            disabled={inlineEdit[record.id]?.isEditing}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit → Inline
                          </button>
                          <button
                            onClick={() => handleReject(record.id)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                            title="Reject and delete this extraction"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject → Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Edit Extracted Data
                  </h3>
                  <button
                    onClick={() => setEditModal(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Target Table:</strong> {editModal.suggested_table}
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-4">
                  {Object.keys(editingData).map(key => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      {renderFieldEditor(key, editingData[key])}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditModal(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
