'use client';

import React from 'react';
import { 
  Mail, 
  Clock, 
  Flag, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';

interface InboxStatsProps {
  stats: {
    total: number;
    unread: number;
    today: number;
    flagged: number;
    overdue: number;
    handled: number;
  };
}

export default function InboxStats({ stats }: InboxStatsProps) {
  const getStatColor = (type: string) => {
    switch (type) {
      case 'unread':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'today':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'flagged':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'overdue':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'handled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatIcon = (type: string) => {
    switch (type) {
      case 'unread':
        return <Eye className="h-4 w-4" />;
      case 'today':
        return <Clock className="h-4 w-4" />;
      case 'flagged':
        return <Flag className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'handled':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatLabel = (type: string) => {
    switch (type) {
      case 'unread':
        return 'Unread';
      case 'today':
        return 'Today';
      case 'flagged':
        return 'Flagged';
      case 'overdue':
        return 'Overdue';
      case 'handled':
        return 'Handled';
      default:
        return 'Total';
    }
  };

  const statItems = [
    { type: 'unread', value: stats.unread },
    { type: 'today', value: stats.today },
    { type: 'flagged', value: stats.flagged },
    { type: 'overdue', value: stats.overdue },
    { type: 'handled', value: stats.handled }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Inbox Overview</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingUp className="h-4 w-4" />
          <span>Real-time updates</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((item) => (
          <div
            key={item.type}
            className={`flex flex-col items-center p-3 rounded-lg border ${getStatColor(item.type)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getStatIcon(item.type)}
              <span className="text-xs font-medium uppercase tracking-wide">
                {getStatLabel(item.type)}
              </span>
            </div>
            <span className="text-2xl font-bold">{item.value}</span>
          </div>
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{stats.handled} of {stats.total} emails handled</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.handled / stats.total) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
