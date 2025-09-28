import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface TrackerItem {
  id: string;
  building_id: string;
  item_text: string;
  due_date: string | null;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  priority: 'low' | 'medium' | 'high';
  source: 'Manual' | 'Meeting' | 'Call' | 'Email';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrackerStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  dueSoon: number;
}

export interface CreateTrackerItem {
  item_text: string;
  due_date?: string | null;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  source?: 'Manual' | 'Meeting' | 'Call' | 'Email';
}

export interface UpdateTrackerItem {
  item_text?: string;
  due_date?: string | null;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  source?: 'Manual' | 'Meeting' | 'Call' | 'Email';
  completed?: boolean;
}

interface TrackerResponse {
  success: boolean;
  data: TrackerItem[];
  stats: TrackerStats;
}

export function useActionTracker(buildingId: string) {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);

  // Query key for this building's tracker items
  const queryKey = ['action-tracker', buildingId, showCompleted];

  // Fetch tracker items
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<TrackerResponse> => {
      const url = `/api/buildings/${buildingId}/tracker?includeCompleted=${showCompleted}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch tracker items');
      }
      
      return res.json();
    },
    enabled: !!buildingId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  const items = response?.data || [];
  const stats = response?.stats || {
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0
  };

  // Create new tracker item
  const createItemMutation = useMutation({
    mutationFn: async (newItem: CreateTrackerItem): Promise<TrackerItem> => {
      const res = await fetch(`/api/buildings/${buildingId}/tracker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create tracker item');
      }

      const result = await res.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['action-tracker', buildingId] });
    },
  });

  // Update tracker item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTrackerItem }): Promise<TrackerItem> => {
      const res = await fetch(`/api/tracker/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update tracker item');
      }

      const result = await res.json();
      return result.data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: TrackerResponse | undefined) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data.map(item =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  ...(updates.completed !== undefined && updates.completed ? 
                    { completed_at: new Date().toISOString() } : 
                    updates.completed === false ? { completed_at: null } : {}
                  )
                }
              : item
          )
        };
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['action-tracker', buildingId] });
    },
  });

  // Delete tracker item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/tracker/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete tracker item');
      }
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(queryKey);

      // Optimistically remove item
      queryClient.setQueryData(queryKey, (old: TrackerResponse | undefined) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data.filter(item => item.id !== id)
        };
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['action-tracker', buildingId] });
    },
  });

  // Toggle completed items visibility
  const toggleShowCompleted = useCallback(() => {
    setShowCompleted(prev => !prev);
  }, []);

  // Mark item as completed/incomplete
  const toggleItemCompleted = useCallback(
    (id: string, completed: boolean) => {
      updateItemMutation.mutate({
        id,
        updates: { completed }
      });
    },
    [updateItemMutation]
  );

  // Helper function to check if item is overdue
  const isItemOverdue = useCallback((item: TrackerItem): boolean => {
    if (item.completed || !item.due_date) return false;
    return new Date(item.due_date) < new Date();
  }, []);

  // Helper function to check if item is due soon (within 3 days)
  const isItemDueSoon = useCallback((item: TrackerItem): boolean => {
    if (item.completed || !item.due_date) return false;
    const dueDate = new Date(item.due_date);
    const today = new Date();
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= threeDaysFromNow;
  }, []);

  // Get priority color
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'amber';
      case 'low': return 'green';
      default: return 'gray';
    }
  }, []);

  // Get source icon
  const getSourceIcon = useCallback((source: string) => {
    switch (source) {
      case 'Meeting': return 'users';
      case 'Call': return 'phone';
      case 'Email': return 'mail';
      case 'Manual': return 'edit';
      default: return 'edit';
    }
  }, []);

  return {
    // Data
    items,
    stats,
    showCompleted,

    // Loading states
    isLoading,
    error,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,

    // Actions
    createItem: (newItem: CreateTrackerItem, options?: { onSuccess?: () => void }) => {
      createItemMutation.mutate(newItem, {
        onSuccess: () => {
          options?.onSuccess?.();
        },
        onError: (error) => {
          console.error('Failed to create action item:', error);
          // Could add toast notification here if needed
        }
      });
    },
    updateItem: (id: string, updates: UpdateTrackerItem) =>
      updateItemMutation.mutate({ id, updates }),
    deleteItem: deleteItemMutation.mutate,
    toggleItemCompleted,
    toggleShowCompleted,
    refetch,

    // Helpers
    isItemOverdue,
    isItemDueSoon,
    getPriorityColor,
    getSourceIcon,

    // Mutation objects for error handling
    createItemError: createItemMutation.error,
    updateItemError: updateItemMutation.error,
    deleteItemError: deleteItemMutation.error,
  };
}