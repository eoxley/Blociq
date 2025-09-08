'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { useToast } from '@/components/ToastNotifications';
import { useLeaseNotifications } from '@/contexts/LeaseNotificationContext';

export interface LeaseProcessingOptions {
  buildingId?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export function useLeaseProcessing() {
  const { supabase } = useSupabase();
  const [isProcessing, setIsProcessing] = useState(false);
  const { showProcessingStarted, showProcessingFailed } = useToast();
  // Safe hook usage - will return defaults if outside provider context
  const { refreshNotifications } = useLeaseNotifications();

  const processLeaseDocument = async (
    file: File, 
    options: LeaseProcessingOptions = {}
  ) => {
    try {
      setIsProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lease-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create processing job record
      const jobData = {
        user_id: user.id,
        filename: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        file_type: file.type,
        status: 'pending',
        priority: options.priority || 1,
        building_id: options.buildingId,
        metadata: options.metadata,
        created_at: new Date().toISOString()
      };

      const { data: jobRecord, error: jobError } = await supabase
        .from('lease_processing_jobs')
        .insert(jobData)
        .select()
        .single();

      if (jobError) {
        throw jobError;
      }

      // Show processing started notification
      showProcessingStarted(file.name);

      // Refresh notifications to pick up the new job
      await refreshNotifications();

      // Trigger actual processing (this would typically call your OCR service)
      await triggerProcessing(jobRecord.id);

      return {
        success: true,
        jobId: jobRecord.id,
        message: 'Lease document processing started successfully'
      };

    } catch (error: any) {
      console.error('Error processing lease document:', error);
      showProcessingFailed(file.name, error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to start lease document processing'
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerProcessing = async (jobId: string) => {
    try {
      // Update job status to processing
      await supabase
        .from('lease_processing_jobs')
        .update({ 
          status: 'processing',
          processing_started_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Here you would typically call your OCR/processing service
      // For now, we'll just simulate the processing trigger
      console.log('Triggered processing for job:', jobId);
      
      // In a real implementation, you might:
      // 1. Send a request to your OCR service
      // 2. Add the job to a queue
      // 3. Trigger a serverless function
      // 4. Call an external API

    } catch (error) {
      console.error('Error triggering processing:', error);
      throw error;
    }
  };

  const retryProcessingJob = async (jobId: string) => {
    try {
      setIsProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('lease_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      // Update job for retry
      await supabase
        .from('lease_processing_jobs')
        .update({ 
          status: 'retrying',
          retry_count: (job.retry_count || 0) + 1,
          processing_started_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', jobId);

      // Trigger processing again
      await triggerProcessing(jobId);

      // Refresh notifications
      await refreshNotifications();

      return {
        success: true,
        message: 'Job retry started successfully'
      };

    } catch (error: any) {
      console.error('Error retrying job:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retry job'
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const getJobStatus = async (jobId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: job, error } = await supabase
        .from('lease_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        job
      };

    } catch (error: any) {
      console.error('Error getting job status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const cancelProcessingJob = async (jobId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await supabase
        .from('lease_processing_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Cancelled by user',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', user.id);

      await refreshNotifications();

      return {
        success: true,
        message: 'Job cancelled successfully'
      };

    } catch (error: any) {
      console.error('Error cancelling job:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to cancel job'
      };
    }
  };

  return {
    isProcessing,
    processLeaseDocument,
    retryProcessingJob,
    getJobStatus,
    cancelProcessingJob
  };
}