import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for upload handling

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('📤 Async lease upload: Handling file upload for background processing');
  
  try {
    // Validate API key for background processing access
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.NEXT_PUBLIC_BACKGROUND_PROCESSOR_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required for background processing' 
      }, { status: 401 });
    }
    
    // Get user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'User authentication required' 
      }, { status: 401 });
    }
    
    // Extract user from JWT token (you might need to adjust this based on your auth setup)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    const userId = user.id;
    console.log(`👤 Processing upload for user: ${userId}`);
    
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildingId = formData.get('buildingId') as string;
    const priority = parseInt(formData.get('priority') as string) || 0;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    // Validate file
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'image/tiff',
      'image/webp'
    ];
    
    if (file.size > maxFileSize) {
      return NextResponse.json({ 
        success: false, 
        error: `File too large. Maximum size is ${maxFileSize / 1024 / 1024}MB` 
      }, { status: 413 });
    }
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    console.log(`📄 File validated: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB, ${file.type})`);
    
    // Generate unique file path
    const fileExtension = file.name.split('.').pop() || '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFilename = `${timestamp}-${uuidv4()}.${fileExtension}`;
    const filePath = `lease-documents/${userId}/${uniqueFilename}`;
    
    // Upload file to Supabase storage
    console.log(`☁️ Uploading to storage: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload file to storage',
        details: uploadError.message 
      }, { status: 500 });
    }
    
    console.log('✅ File uploaded to storage successfully');
    
    // Create document record
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        building_id: buildingId || null,
        document_type: 'lease',
        uploaded_by: userId,
        extraction_status: 'pending',
        metadata: {
          originalFilename: file.name,
          uploadPath: filePath,
          uploadedAt: new Date().toISOString(),
          fileExtension: fileExtension,
          async: true
        }
      })
      .select()
      .single();
    
    if (documentError) {
      console.error('❌ Failed to create document record:', documentError);
      // Cleanup uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create document record',
        details: documentError.message 
      }, { status: 500 });
    }
    
    const documentId = documentData.id;
    console.log(`📋 Document record created: ${documentId}`);
    
    // Get user email for notifications
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();
    
    const userEmail = profileData?.email || user.email || '';
    const userName = profileData ? `${profileData.first_name} ${profileData.last_name}`.trim() : '';
    
    // Create processing job
    const { data: jobData, error: jobError } = await supabase
      .from('lease_processing_jobs')
      .insert({
        document_id: documentId,
        user_id: userId,
        file_path: filePath,
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        building_id: buildingId || null,
        priority: priority,
        user_email: userEmail,
        status: 'pending',
        retry_count: 0,
        max_retries: 3
      })
      .select()
      .single();
    
    if (jobError) {
      console.error('❌ Failed to create processing job:', jobError);
      
      // Cleanup document and file
      await supabase.from('documents').delete().eq('id', documentId);
      await supabase.storage.from('documents').remove([filePath]);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to queue document for processing',
        details: jobError.message 
      }, { status: 500 });
    }
    
    const jobId = jobData.id;
    console.log(`🎯 Processing job created: ${jobId}`);
    
    // Trigger background processor (optional - you might have a separate cron job)
    if (process.env.BACKGROUND_PROCESSOR_API_KEY) {
      try {
        // Don't await this - let it run in background
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/lease-processing/processor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.BACKGROUND_PROCESSOR_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.warn('⚠️ Failed to trigger background processor:', error);
        });
      } catch (error) {
        console.warn('⚠️ Background processor trigger failed:', error);
      }
    }
    
    // Return immediate response with job ID
    const response = {
      success: true,
      message: 'Document uploaded successfully and queued for processing',
      jobId: jobId,
      documentId: documentId,
      filename: file.name,
      fileSize: file.size,
      status: 'pending',
      estimatedProcessingTime: '5-10 minutes',
      checkStatusUrl: `/api/lease-processing/status/${jobId}`,
      metadata: {
        uploadedAt: new Date().toISOString(),
        filePath: filePath,
        buildingId: buildingId,
        priority: priority,
        userName: userName,
        userEmail: userEmail
      }
    };
    
    console.log(`✅ Upload complete - Job ${jobId} queued for processing`);
    
    return NextResponse.json(response, { 
      status: 202, // Accepted for processing
      headers: {
        'Location': `/api/lease-processing/status/${jobId}`,
        'X-Job-ID': jobId
      }
    });
    
  } catch (error) {
    console.error('❌ Async upload error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error during upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for upload form information
export async function GET(req: NextRequest) {
  try {
    // Get current queue statistics
    const { data: stats } = await supabase
      .rpc('get_lease_processing_stats', {
        user_uuid: null,
        hours_back: 1
      });
    
    const currentStats = stats?.[0] || {};
    
    return NextResponse.json({
      uploadInfo: {
        maxFileSize: '100MB',
        allowedFormats: ['PDF', 'JPEG', 'PNG', 'TIFF', 'WebP'],
        estimatedProcessingTime: '5-10 minutes',
        features: [
          'Background processing - no timeout issues',
          'Email notification when complete',
          'Comprehensive lease analysis',
          'Automatic retry on failures'
        ]
      },
      queueStatus: {
        pendingJobs: currentStats.pending_jobs || 0,
        processingJobs: currentStats.processing_jobs || 0,
        averageProcessingTime: currentStats.avg_processing_time_ms 
          ? Math.round(currentStats.avg_processing_time_ms / 1000 / 60) + ' minutes'
          : 'Unknown',
        successRate: currentStats.success_rate ? currentStats.success_rate + '%' : 'Unknown'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      uploadInfo: {
        maxFileSize: '100MB',
        allowedFormats: ['PDF', 'JPEG', 'PNG', 'TIFF', 'WebP'],
        estimatedProcessingTime: '5-10 minutes',
        features: [
          'Background processing - no timeout issues',
          'Email notification when complete',
          'Comprehensive lease analysis'
        ]
      },
      queueStatus: {
        status: 'Unknown'
      }
    });
  }
}