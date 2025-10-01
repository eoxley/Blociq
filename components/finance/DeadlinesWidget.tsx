'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Plus,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ReminderData {
  id: string;
  title: string;
  description: string;
  due_date: string;
  reminder_days: number;
  status: string;
  priority: string;
  period_name: string;
  days_until_due: number;
  building_id: string;
  assigned_to?: string;
}

interface DeadlinesWidgetProps {
  buildingId: string;
  compact?: boolean;
}

export function DeadlinesWidget({ buildingId, compact = false }: DeadlinesWidgetProps) {
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load reminders
  const loadReminders = async () => {
    try {
      const response = await fetch(`/api/ai/deadlines?building_id=${buildingId}&action=list`);
      const data = await response.json();
      
      if (data.success) {
        setReminders(data.data.reminders);
      } else {
        setError(data.error || 'Failed to load reminders');
      }
    } catch (err) {
      setError('Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reminder action
  const handleReminderAction = async (reminderId: string, action: string, notes?: string) => {
    setActionLoading(reminderId);
    
    try {
      const response = await fetch('/api/ai/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          action,
          reminder_id: reminderId,
          status: action,
          notes,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload reminders
        await loadReminders();
      } else {
        setError(data.error || 'Failed to update reminder');
      }
    } catch (err) {
      setError('Failed to update reminder');
    } finally {
      setActionLoading(null);
    }
  };

  // Create standard periods
  const handleCreatePeriods = async () => {
    setActionLoading('create');
    
    try {
      const response = await fetch('/api/ai/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          action: 'create',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload reminders
        await loadReminders();
      } else {
        setError(data.error || 'Failed to create periods');
      }
    } catch (err) {
      setError('Failed to create periods');
    } finally {
      setActionLoading(null);
    }
  };

  // Get status color
  const getStatusColor = (status: string, daysUntilDue: number): 'green' | 'amber' | 'red' => {
    if (status === 'completed') return 'green';
    if (status === 'acknowledged') return 'amber';
    if (daysUntilDue < 0) return 'red';
    if (daysUntilDue <= 7) return 'amber';
    return 'green';
  };

  // Get priority color
  const getPriorityColor = (priority: string): 'green' | 'amber' | 'red' => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'amber';
      case 'medium': return 'green';
      case 'low': return 'green';
      default: return 'green';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'acknowledged': return <Clock className="h-4 w-4 text-amber-600" />;
      case 'overdue': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'sent': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  useEffect(() => {
    if (buildingId) {
      loadReminders();
    }
  }, [buildingId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overdueCount = reminders.filter(r => r.days_until_due < 0).length;
  const dueSoonCount = reminders.filter(r => r.days_until_due >= 0 && r.days_until_due <= 7).length;
  const upcomingCount = reminders.filter(r => r.days_until_due > 7).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Accounting Deadlines</CardTitle>
            <CardDescription>
              Budget, year-end, and audit milestones
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {reminders.length === 0 && (
              <Button
                size="sm"
                onClick={handleCreatePeriods}
                disabled={actionLoading === 'create'}
              >
                {actionLoading === 'create' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Setup
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{dueSoonCount}</div>
              <div className="text-sm text-muted-foreground">Due Soon</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{upcomingCount}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </div>
          </div>

          {/* Reminders List */}
          {reminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p>No deadlines set up yet</p>
              <p className="text-sm">Click "Setup" to create standard accounting periods</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.slice(0, compact ? 3 : undefined).map((reminder) => {
                const statusColor = getStatusColor(reminder.status, reminder.days_until_due);
                const priorityColor = getPriorityColor(reminder.priority);
                
                return (
                  <div
                    key={reminder.id}
                    className={`p-3 border rounded-lg ${
                      statusColor === 'red' ? 'border-red-200 bg-red-50' :
                      statusColor === 'amber' ? 'border-amber-200 bg-amber-50' :
                      'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getStatusIcon(reminder.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{reminder.title}</h4>
                            <Badge variant="outline" className={`text-xs ${
                              priorityColor === 'red' ? 'border-red-300 text-red-700' :
                              priorityColor === 'amber' ? 'border-amber-300 text-amber-700' :
                              'border-green-300 text-green-700'
                            }`}>
                              {reminder.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {reminder.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Due: {new Date(reminder.due_date).toLocaleDateString()}</span>
                            <span>
                              {reminder.days_until_due < 0 
                                ? `${Math.abs(reminder.days_until_due)} days overdue`
                                : reminder.days_until_due === 0
                                ? 'Due today'
                                : `${reminder.days_until_due} days remaining`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {reminder.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReminderAction(reminder.id, 'acknowledged')}
                            disabled={actionLoading === reminder.id}
                          >
                            {actionLoading === reminder.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              'Acknowledge'
                            )}
                          </Button>
                        )}
                        {reminder.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            onClick={() => handleReminderAction(reminder.id, 'completed')}
                            disabled={actionLoading === reminder.id}
                          >
                            {actionLoading === reminder.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              'Complete'
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // This would open AI chat with context
                            console.log('Ask AI about:', reminder);
                          }}
                        >
                          <Bot className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {compact && reminders.length > 3 && (
                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(true)}
                  >
                    View all {reminders.length} deadlines
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}




