import { NextRequest, NextResponse } from 'next/server';
import { HybridLeaseProcessor } from '@/lib/hybrid-lease-processor';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for hybrid processing

// Initialize Supabase client
function getSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  console.log('🎯 Hybrid Ask AI processing request');
  
  try {
    // Get user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await getSupabaseServiceClient().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const question = formData.get('question') as string;
    const buildingId = formData.get('buildingId') as string;
    const pageNumber = formData.get('pageNumber') as string;
    const processingType = formData.get('processingType') as string; // 'quick' | 'background' | 'page'
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    if (!question) {
      return NextResponse.json({ 
        success: false, 
        error: 'No question provided' 
      }, { status: 400 });
    }
    
    console.log(`📄 Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`❓ Question: ${question}`);
    console.log(`🔧 Type: ${processingType || 'auto'}`);
    
    let result;
    
    // Handle different processing types
    if (processingType === 'page' && pageNumber) {
      // Page-specific processing
      const pageNum = parseInt(pageNumber);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid page number' 
        }, { status: 400 });
      }
      
      result = await HybridLeaseProcessor.processSpecificPage(file, pageNum, question);
      
    } else if (processingType === 'background') {
      // Force background processing
      result = await HybridLeaseProcessor.processLease(file, question, {
        buildingId: buildingId || undefined,
        userId: userId,
        maxTimeoutMs: 1000, // Very short timeout to force background
        userQuestion: question
      });
      
    } else {
      // Hybrid processing (default)
      result = await HybridLeaseProcessor.processLease(file, question, {
        buildingId: buildingId || undefined,
        userId: userId,
        userQuestion: question
      });
    }
    
    // Format response based on result type
    if (result.success) {
      if (result.type === 'quick') {
        return NextResponse.json({
          success: true,
          type: 'quick',
          analysis: result.data?.analysis || 'Analysis complete',
          extractedText: result.data?.extractedText,
          ocrSource: result.data?.ocrSource,
          processingTime: result.data?.processingTime,
          documentType: result.data?.documentType || 'lease',
          pageNumber: result.data?.pageNumber,
          message: result.message,
          metadata: {
            filename: file.name,
            fileSize: file.size,
            question: question,
            userId: userId,
            buildingId: buildingId
          }
        });
        
      } else if (result.type === 'background') {
        return NextResponse.json({
          success: true,
          type: 'background',
          jobId: result.jobId,
          message: result.message,
          alternatives: result.alternatives,
          estimatedTime: '5-10 minutes',
          statusUrl: `/api/lease-processing/status/${result.jobId}`,
          metadata: {
            filename: file.name,
            fileSize: file.size,
            question: question,
            userId: userId,
            buildingId: buildingId
          }
        }, { 
          status: 202, // Accepted for processing
          headers: {
            'X-Job-ID': result.jobId || '',
            'Location': `/api/lease-processing/status/${result.jobId}`
          }
        });
      }
    }
    
    // Error case
    return NextResponse.json({
      success: false,
      type: 'error',
      error: result.error || 'Processing failed',
      message: result.message || 'I encountered an issue processing your document. Please try again.',
      alternatives: result.alternatives,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        question: question
      }
    }, { status: 422 });
    
  } catch (error) {
    console.error('❌ Hybrid processing API error:', error);
    
    return NextResponse.json({
      success: false,
      type: 'error',
      error: 'Internal server error',
      message: 'I encountered a technical issue. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for processing information
export async function GET(req: NextRequest) {
  try {
    // Get current processing statistics
    const { data: stats } = await getSupabaseServiceClient()
      .rpc('get_lease_processing_stats', {
        user_uuid: null,
        hours_back: 1
      });
    
    const currentStats = stats?.[0] || {};
    
    return NextResponse.json({
      processingInfo: {
        quickProcessing: {
          maxFileSize: '10MB',
          maxTimeout: '3 minutes',
          bestFor: [
            'Small documents (under 10MB)',
            'Targeted questions (rent amount, parties, dates)',
            'Page-specific queries',
            'Quick fact extraction'
          ]
        },
        backgroundProcessing: {
          maxFileSize: '100MB',
          maxTimeout: '10 minutes',
          bestFor: [
            'Large complex documents',
            'Comprehensive analysis',
            'Full lease review',
            'Multi-page documents'
          ],
          features: [
            'Email notification when complete',
            'Detailed clause extraction',
            'Downloadable reports',
            'No timeout limitations'
          ]
        }
      },
      currentQueue: {
        pendingJobs: currentStats.pending_jobs || 0,
        processingJobs: currentStats.processing_jobs || 0,
        averageTime: currentStats.avg_processing_time_ms 
          ? Math.round(currentStats.avg_processing_time_ms / 1000 / 60) + ' minutes'
          : 'Unknown',
        successRate: currentStats.success_rate ? currentStats.success_rate + '%' : 'Unknown'
      },
      tips: [
        'For fastest results, ask specific questions about small documents',
        'Large documents automatically use background processing',
        'Try \"page 2\" or \"signature page\" for targeted analysis',
        'Background jobs send email notifications when complete'
      ]
    });
    
  } catch (error) {
    console.error('❌ Info endpoint error:', error);
    
    return NextResponse.json({
      processingInfo: {
        quickProcessing: {
          maxFileSize: '10MB',
          maxTimeout: '3 minutes'
        },
        backgroundProcessing: {
          maxFileSize: '100MB',
          maxTimeout: '10 minutes'
        }
      },
      error: 'Could not fetch current statistics'
    });
  }
}