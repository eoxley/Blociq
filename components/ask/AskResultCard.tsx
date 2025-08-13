'use client';
import React from 'react';
import { FileText, Mail, Calendar, CheckSquare, Users, Tag, Plus } from 'lucide-react';

interface SuggestedAction {
  key: string;
  label: string;
  icon?: string;
  action?: string;
}

interface UploadResult {
  success: boolean;
  summary: string;
  suggestedActions: SuggestedAction[];
  context: {
    buildingId: string | null;
    buildingStatus: 'matched' | 'not_found' | 'missing';
    filename: string;
    bytes: number;
    mime: string;
  };
}

interface AskResultCardProps {
  data: UploadResult;
  onActionClick?: (action: SuggestedAction) => void;
}

export function AskResultCard({ data, onActionClick }: AskResultCardProps) {
  const unassigned = !data?.context?.buildingId || data?.context?.buildingStatus !== 'matched';
  
  const getIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'mail':
        return <Mail className="w-4 h-4" />;
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      case 'check-square':
        return <CheckSquare className="w-4 h-4" />;
      case 'users':
        return <Users className="w-4 h-4" />;
      case 'tag':
        return <Tag className="w-4 h-4" />;
      case 'plus':
        return <Plus className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'not_found':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'missing':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'matched':
        return 'Building Linked';
      case 'not_found':
        return 'Building Not Found';
      case 'missing':
        return 'Unassigned';
      default:
        return 'Unknown';
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    if (onActionClick) {
      onActionClick(action);
    } else {
      // Default handling - log to console and show toast
      console.log('Action clicked:', action);
      // You can add toast notification here if you have a toast system
      alert(`Action: ${action.label} - Coming soon!`);
    }
  };

  if (!data?.success) {
    return null;
  }

  return (
    <div className="mt-6 p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Analysis</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(data.context.buildingStatus)}`}>
            {getStatusText(data.context.buildingStatus)}
          </span>
          {unassigned && (
            <span className="text-xs px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
              Unassigned
            </span>
          )}
        </div>
      </div>

      {/* File info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">{data.context.filename}</span>
          <span>{(data.context.bytes / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Type: {data.context.mime}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Summary</h4>
        <div className="p-4 bg-blue-50 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {data.summary}
          </pre>
        </div>
      </div>

      {/* Suggested Actions */}
      {Array.isArray(data.suggestedActions) && data.suggestedActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Suggested Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="flex items-center space-x-3 p-3 rounded-xl border border-gray-200 shadow-sm text-left hover:border-blue-300 hover:shadow-md transition-all bg-white hover:bg-blue-50"
              >
                <div className="text-blue-600">
                  {getIcon(action.icon)}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {action.key.replace('_', ' ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Building ID: {data.context.buildingId || 'None'}</span>
            <span>Status: {data.context.buildingStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
