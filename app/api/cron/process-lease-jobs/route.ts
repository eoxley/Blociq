import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailNotificationService } from '@/lib/email-notifications';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for cron job coordination

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailService = new EmailNotificationService();

export async function GET(req: NextRequest) {
  console.log('⏰ Cron job: Processing lease jobs queue');
  
  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get queue statistics
    const { data: statsData } = await supabase
      .rpc('get_lease_processing_stats', {
        user_uuid: null,
        hours_back: 1
      });
    
    const stats = statsData?.[0] || {};
    
    console.log(`📊 Queue stats: ${stats.pending_jobs || 0} pending, ${stats.processing_jobs || 0} processing`);
    
    // Check if we have pending jobs and processing capacity
    const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || '3');
    const currentProcessingJobs = parseInt(stats.processing_jobs || '0');
    
    if (currentProcessingJobs >= maxConcurrentJobs) {
      console.log(`⏸️ Max concurrent jobs reached (${currentProcessingJobs}/${maxConcurrentJobs})`);
      return NextResponse.json({
        success: true,
        message: 'Max concurrent jobs reached',
        stats: {
          pending: stats.pending_jobs || 0,
          processing: stats.processing_jobs || 0,
          maxConcurrent: maxConcurrentJobs
        }
      });
    }
    
    const pendingJobs = parseInt(stats.pending_jobs || '0');
    if (pendingJobs === 0) {
      console.log('📭 No pending jobs to process');
      return NextResponse.json({
        success: true,
        message: 'No pending jobs',
        stats: {
          pending: 0,
          processing: stats.processing_jobs || 0
        }
      });
    }
    
    // Calculate how many jobs we can start
    const jobsToStart = Math.min(pendingJobs, maxConcurrentJobs - currentProcessingJobs);
    console.log(`🚀 Starting ${jobsToStart} background job(s)`);
    
    const results = [];
    
    // Start multiple background processors
    for (let i = 0; i < jobsToStart; i++) {
      try {
        const processorResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-processing/processor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.BACKGROUND_PROCESSOR_API_KEY}`,
            'Content-Type': 'application/json'
          },
          // Don't wait too long for processor response
          signal: AbortSignal.timeout(5000)
        });
        
        if (processorResponse.ok) {
          const result = await processorResponse.json();
          results.push({
            success: true,
            jobId: result.jobId,
            filename: result.filename,
            message: 'Processor started successfully'
          });
          console.log(`✅ Background processor ${i + 1} started for job: ${result.jobId}`);
        } else {
          const error = await processorResponse.json();
          results.push({
            success: false,
            error: error.error || 'Processor failed to start'
          });
          console.warn(`⚠️ Background processor ${i + 1} failed to start:`, error);
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown processor error'
        });
        console.error(`❌ Background processor ${i + 1} error:`, error);
      }
    }
    
    // Check for jobs that need notification (completed but notification not sent)
    await sendPendingNotifications();
    
    // Cleanup old completed jobs (optional)
    await cleanupOldJobs();
    
    const successfulStarts = results.filter(r => r.success).length;
    console.log(`📈 Cron job complete: ${successfulStarts}/${jobsToStart} processors started`);
    
    return NextResponse.json({
      success: true,
      message: `Started ${successfulStarts} background processors`,
      stats: {
        pending: pendingJobs,
        processing: currentProcessingJobs,
        started: successfulStarts,
        maxConcurrent: maxConcurrentJobs
      },
      results
    });
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Send notifications for completed jobs that haven't been notified yet
 */
async function sendPendingNotifications() {
  try {
    console.log('📧 Checking for pending notifications...');
    
    const { data: pendingNotifications, error } = await supabase
      .from('lease_processing_jobs')
      .select(`
        id,
        user_id,
        filename,
        status,
        lease_analysis,
        processing_duration_ms,
        user_email,
        error_message
      `)
      .eq('status', 'completed')
      .eq('notification_sent', false)
      .not('user_email', 'is', null)
      .limit(10); // Process max 10 notifications per cron run
    
    if (error) {
      console.error('❌ Failed to get pending notifications:', error);
      return;
    }
    
    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('📪 No pending notifications');
      return;
    }
    
    console.log(`📬 Found ${pendingNotifications.length} pending notifications`);
    
    for (const job of pendingNotifications) {
      try {
        // Get user profile for better personalization
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', job.user_id)
          .single();
        
        const userName = userProfile 
          ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
          : undefined;
        
        // Parse lease analysis for email content
        let analysisData = null;
        if (job.lease_analysis) {
          try {
            analysisData = typeof job.lease_analysis === 'string'
              ? JSON.parse(job.lease_analysis)
              : job.lease_analysis;
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse analysis for job ${job.id}:`, parseError);
          }
        }
        
        const processingTime = job.processing_duration_ms 
          ? Math.round(job.processing_duration_ms / 1000 / 60) + ' minutes'
          : undefined;
        
        const emailData = {
          userEmail: job.user_email,
          userName: userName,
          jobId: job.id,
          filename: job.filename,
          success: job.status === 'completed',
          analysis: analysisData,
          processingTime: processingTime,
          errorMessage: job.error_message
        };
        
        const sent = await emailService.sendCompletionNotification(emailData);
        
        if (sent) {
          // Mark notification as sent
          await supabase
            .from('lease_processing_jobs')
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          console.log(`✅ Notification sent for job ${job.id}`);
        } else {
          console.warn(`⚠️ Failed to send notification for job ${job.id}`);
        }
      } catch (notificationError) {
        console.error(`❌ Notification error for job ${job.id}:`, notificationError);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking pending notifications:', error);
  }
}

/**
 * Cleanup old completed jobs to prevent database bloat
 */
async function cleanupOldJobs() {
  try {
    const daysToKeep = parseInt(process.env.JOB_RETENTION_DAYS || '30');
    
    const { data: cleanupResult, error } = await supabase
      .rpc('cleanup_old_lease_jobs', {
        days_to_keep: daysToKeep
      });
    
    if (error) {
      console.error('❌ Failed to cleanup old jobs:', error);
      return;
    }
    
    if (cleanupResult && cleanupResult > 0) {
      console.log(`🧹 Cleaned up ${cleanupResult} old completed jobs`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// Health check endpoint for monitoring the cron job
export async function POST(req: NextRequest) {
  try {
    // Get current queue status
    const { data: stats } = await supabase
      .rpc('get_lease_processing_stats', {
        user_uuid: null,
        hours_back: 24
      });
    
    const currentStats = stats?.[0] || {};
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queue: {
        pending: currentStats.pending_jobs || 0,
        processing: currentStats.processing_jobs || 0,
        completed: currentStats.completed_jobs || 0,
        failed: currentStats.failed_jobs || 0,
        successRate: currentStats.success_rate || 0,
        avgProcessingTime: currentStats.avg_processing_time_ms 
          ? Math.round(currentStats.avg_processing_time_ms / 1000) + 's'
          : 'Unknown'
      },
      config: {
        maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS || '3',
        jobRetentionDays: process.env.JOB_RETENTION_DAYS || '30',
        emailNotifications: !!process.env.RESEND_API_KEY
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}