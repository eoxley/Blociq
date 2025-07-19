"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar,
  TrendingUp,
  FileText,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface TaskProgress {
  total: number;
  completed: number;
  overdue: number;
  percentage: number;
}

interface InspectionProgress {
  totalItems: number;
  okItems: number;
  failedItems: number;
  needsAttentionItems: number;
  percentage: number;
  lastInspectionDate: string | null;
  lastInspectionStatus: string | null;
}

interface ProgressData {
  tasks: TaskProgress;
  inspection: InspectionProgress;
  overall: {
    status: 'good' | 'warning';
    hasWarnings: boolean;
  };
}

interface ProgressTrackerWidgetProps {
  buildingId: string;
  className?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

export default function ProgressTrackerWidget({ 
  buildingId, 
  className = "",
  showRefreshButton = true,
  onRefresh 
}: ProgressTrackerWidgetProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProgressData();
  }, [buildingId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/building-progress/${buildingId}`);
      const result = await response.json();

      if (result.success) {
        setProgressData(result.data);
      } else {
        toast.error('Failed to fetch progress data');
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast.error('Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProgressData();
    setRefreshing(false);
    onRefresh?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (percentage: number, hasWarnings: boolean = false) => {
    if (hasWarnings) return 'bg-red-500';
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            {showRefreshButton && (
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
            <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progressData) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Unable to load progress data</p>
        </CardContent>
      </Card>
    );
  }

  const { tasks, inspection, overall } = progressData;

  return (
    <Card className={`${className} border-2 ${overall.hasWarnings ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Progress Tracker
            {overall.hasWarnings && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ Warnings
              </Badge>
            )}
          </CardTitle>
          {showRefreshButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Tasks Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Tasks</span>
              {tasks.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {tasks.overdue} overdue
                </Badge>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {tasks.completed} of {tasks.total} complete
            </span>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={tasks.percentage} 
              className="h-2"
              style={{
                '--progress-color': getProgressColor(tasks.percentage, tasks.overdue > 0)
              } as React.CSSProperties}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{tasks.percentage}% complete</span>
              <span>{tasks.total - tasks.completed} remaining</span>
            </div>
          </div>
        </div>

        {/* Inspection Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Latest Inspection</span>
              {(inspection.failedItems > 0 || inspection.needsAttentionItems > 0) && (
                <Badge variant="destructive" className="text-xs">
                  {inspection.failedItems + inspection.needsAttentionItems} issues
                </Badge>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {inspection.okItems} of {inspection.totalItems} OK
            </span>
          </div>
          
          {inspection.totalItems > 0 ? (
            <div className="space-y-2">
              <Progress 
                value={inspection.percentage} 
                className="h-2"
                style={{
                  '--progress-color': getProgressColor(inspection.percentage, inspection.failedItems > 0)
                } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{inspection.percentage}% passed</span>
                <span>{inspection.totalItems - inspection.okItems} issues</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No inspection data available
            </div>
          )}

          {/* Last Inspection Info */}
          {inspection.lastInspectionDate && (
            <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Last inspected: {formatDate(inspection.lastInspectionDate)}</span>
              </div>
              {inspection.lastInspectionStatus && (
                <Badge className={`text-xs ${getStatusColor(inspection.lastInspectionStatus)}`}>
                  {inspection.lastInspectionStatus}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Warnings Section */}
        {overall.hasWarnings && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-sm text-red-800">Attention Required</span>
            </div>
            
            <div className="space-y-2 text-sm">
              {tasks.overdue > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <Clock className="h-3 w-3" />
                  <span>{tasks.overdue} task{tasks.overdue > 1 ? 's' : ''} overdue</span>
                </div>
              )}
              
              {inspection.failedItems > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{inspection.failedItems} inspection item{inspection.failedItems > 1 ? 's' : ''} failed</span>
                </div>
              )}
              
              {inspection.needsAttentionItems > 0 && (
                <div className="flex items-center gap-2 text-yellow-700">
                  <Clock className="h-3 w-3" />
                  <span>{inspection.needsAttentionItems} item{inspection.needsAttentionItems > 1 ? 's' : ''} need attention</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={() => window.location.href = `/buildings/${buildingId}?tab=tasks`}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            View Tasks
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={() => window.location.href = `/buildings/${buildingId}?tab=inspections`}
          >
            <FileText className="h-3 w-3 mr-1" />
            View Inspections
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 