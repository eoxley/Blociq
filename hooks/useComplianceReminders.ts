import { useState, useEffect, useCallback } from 'react';
import { ReminderResponse, hasCriticalReminders, getUrgentReminders } from '@/lib/complianceReminders';

interface UseComplianceRemindersOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  dueSoonDays?: number;
  expiringSoonDays?: number;
  buildingIds?: string[];
  categories?: string[];
}

interface UseComplianceRemindersReturn {
  data: ReminderResponse | null;
  loading: boolean;
  error: string | null;
  hasCritical: boolean;
  urgentCount: number;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useComplianceReminders(options: UseComplianceRemindersOptions = {}): UseComplianceRemindersReturn {
  const {
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    dueSoonDays = 30,
    expiringSoonDays = 30,
    buildingIds,
    categories
  } = options;

  const [data, setData] = useState<ReminderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async (useCustomParams = false) => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/compliance/check-reminders';
      let method = 'GET';
      let body: any = undefined;

      // Use POST with custom parameters if specified
      if (useCustomParams && (buildingIds?.length || categories?.length || dueSoonDays !== 30 || expiringSoonDays !== 30)) {
        method = 'POST';
        body = {
          dueSoonDays,
          expiringSoonDays,
          buildingIds: buildingIds?.length ? buildingIds : undefined,
          categories: categories?.length ? categories : undefined
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ReminderResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching compliance reminders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  }, [dueSoonDays, expiringSoonDays, buildingIds, categories]);

  // Initial fetch
  useEffect(() => {
    fetchReminders(true);
  }, [fetchReminders]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchReminders(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchReminders]);

  // Computed values
  const hasCritical = data ? hasCriticalReminders(data) : false;
  const urgentCount = data ? getUrgentReminders(data).total_urgent : 0;

  const refresh = useCallback(async () => {
    await fetchReminders(true);
  }, [fetchReminders]);

  const refetch = useCallback(async () => {
    await fetchReminders(false); // Use default GET endpoint
  }, [fetchReminders]);

  return {
    data,
    loading,
    error,
    hasCritical,
    urgentCount,
    refresh,
    refetch
  };
}

// Hook for getting just the summary data (lighter weight)
export function useComplianceRemindersSummary(options: UseComplianceRemindersOptions = {}) {
  const { data, loading, error, hasCritical, urgentCount } = useComplianceReminders(options);

  return {
    summary: data?.summary || null,
    hasCritical,
    urgentCount,
    loading,
    error,
    generatedAt: data?.generated_at ? new Date(data.generated_at) : null
  };
}

// Hook for getting critical reminders only
export function useCriticalReminders(options: UseComplianceRemindersOptions = {}) {
  const { data, loading, error } = useComplianceReminders(options);

  const criticalReminders = data ? {
    overdue_assets: data.overdue_assets,
    expired_documents: data.expired_documents,
    total_critical: data.summary.critical_items
  } : null;

  return {
    criticalReminders,
    loading,
    error
  };
}

// Hook for getting urgent reminders (critical + due within 7 days)
export function useUrgentReminders(options: UseComplianceRemindersOptions = {}) {
  const { data, loading, error } = useComplianceReminders(options);

  const urgentReminders = data ? getUrgentReminders(data) : null;

  return {
    urgentReminders,
    loading,
    error
  };
} 