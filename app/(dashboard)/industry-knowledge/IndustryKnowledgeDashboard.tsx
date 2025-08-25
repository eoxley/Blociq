'use client';

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Shield, 
  Search, 
  Plus, 
  Settings, 
  BarChart3,
  BookOpen,
  Lightbulb,
  Database
} from 'lucide-react';
import IndustryDocumentUpload from '@/components/IndustryDocumentUpload';

interface IndustryKnowledgeDashboardProps {
  userId: string;
  userRole: string;
}

export default function IndustryKnowledgeDashboard({ 
  userId, 
  userRole 
}: IndustryKnowledgeDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalStandards: 0,
    totalGuidance: 0,
    processedDocuments: 0,
    pendingProcessing: 0
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'standards', label: 'Standards', icon: Shield },
    { id: 'guidance', label: 'Guidance', icon: BookOpen },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch industry knowledge statistics
      const response = await fetch('/api/industry/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching industry knowledge stats:', error);
    }
  };

  const handleUploadComplete = () => {
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Standards</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStandards}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Guidance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGuidance}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.processedDocuments}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Database className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingProcessing}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Lightbulb className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Knowledge Overview</h3>
                <p className="text-gray-600 mb-4">
                  This system allows developers and administrators to upload industry standards, guidance documents, 
                  and best practices that will be used by the AI system to provide accurate, compliance-focused responses.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Upload PDF documents containing industry standards and guidance</li>
                    <li>• AI processes and extracts key information from documents</li>
                    <li>• Extracted knowledge is used to enhance AI responses</li>
                    <li>• Standards and guidance are categorized for easy retrieval</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Industry Knowledge</h3>
              <IndustryDocumentUpload onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Documents</h3>
              <p className="text-gray-600">Document management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'standards' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Standards</h3>
              <p className="text-gray-600">Standards management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'guidance' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Guidance</h3>
              <p className="text-gray-600">Guidance management interface coming soon...</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Knowledge Settings</h3>
              <p className="text-gray-600">Settings interface coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
