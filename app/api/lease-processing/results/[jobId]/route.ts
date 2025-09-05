import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest, 
  { params }: { params: { jobId: string } }
) {
  console.log(`📋 Retrieving results for job: ${params.jobId}`);
  
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Get job results with comprehensive details
    const { data: jobData, error: jobError } = await supabase
      .from('lease_processing_jobs')
      .select(`
        id,
        document_id,
        filename,
        file_size,
        file_type,
        building_id,
        status,
        processing_started_at,
        processing_completed_at,
        processing_duration_ms,
        results,
        extracted_text,
        lease_analysis,
        ocr_source,
        created_at,
        documents!inner(
          id,
          filename,
          building_id,
          metadata,
          lease_extraction
        )
      `)
      .eq('id', params.jobId)
      .eq('user_id', userId)
      .single();
    
    if (jobError || !jobData) {
      console.error('❌ Job not found or access denied:', jobError);
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }
    
    // Check if job is completed
    if (jobData.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: `Job is not completed. Current status: ${jobData.status}`,
        status: jobData.status,
        jobId: params.jobId
      }, { status: 400 });
    }
    
    // Get detailed lease extraction data
    const { data: leaseExtractionData } = await supabase
      .from('lease_extractions')
      .select('*')
      .eq('document_id', jobData.document_id)
      .single();
    
    // Get building information if available
    let buildingData = null;
    if (jobData.building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('id, building_name, address_line_1, address_line_2, city, county, postcode')
        .eq('id', jobData.building_id)
        .single();
      buildingData = building;
    }
    
    // Parse lease analysis
    let parsedAnalysis = null;
    if (jobData.lease_analysis) {
      try {
        parsedAnalysis = typeof jobData.lease_analysis === 'string' 
          ? JSON.parse(jobData.lease_analysis) 
          : jobData.lease_analysis;
      } catch (error) {
        console.warn('⚠️ Failed to parse lease analysis:', error);
        parsedAnalysis = { error: 'Failed to parse analysis data' };
      }
    }
    
    // Parse results metadata
    let parsedResults = null;
    if (jobData.results) {
      try {
        parsedResults = typeof jobData.results === 'string'
          ? JSON.parse(jobData.results)
          : jobData.results;
      } catch (error) {
        console.warn('⚠️ Failed to parse results metadata:', error);
      }
    }
    
    // Build comprehensive results response
    const results = {
      success: true,
      jobId: jobData.id,
      documentId: jobData.document_id,
      filename: jobData.filename,
      status: jobData.status,
      
      // Processing metadata
      processing: {
        startedAt: jobData.processing_started_at,
        completedAt: jobData.processing_completed_at,
        duration: jobData.processing_duration_ms 
          ? Math.round(jobData.processing_duration_ms / 1000) + ' seconds'
          : null,
        durationMs: jobData.processing_duration_ms,
        ocrSource: jobData.ocr_source,
        createdAt: jobData.created_at
      },
      
      // File information
      file: {
        name: jobData.filename,
        size: jobData.file_size,
        sizeFormatted: (jobData.file_size / 1024 / 1024).toFixed(2) + ' MB',
        type: jobData.file_type
      },
      
      // Extracted text
      extractedText: {
        content: jobData.extracted_text || '',
        length: jobData.extracted_text?.length || 0,
        preview: jobData.extracted_text?.substring(0, 500) || '',
        hasFullText: !!(jobData.extracted_text && jobData.extracted_text.length > 0)
      },
      
      // Lease analysis
      leaseAnalysis: parsedAnalysis ? {
        confidence: parsedAnalysis.confidence || 0,
        summary: parsedAnalysis.summary || 'No summary available',
        clauses: parsedAnalysis.clauses || [],
        keyTerms: parsedAnalysis.keyTerms || {},
        clauseCount: parsedAnalysis.clauses?.length || 0,
        keyTermCount: Object.keys(parsedAnalysis.keyTerms || {}).length,
        hasAnalysis: true
      } : {
        hasAnalysis: false,
        message: 'No lease analysis available'
      },
      
      // Building context
      building: buildingData ? {
        id: buildingData.id,
        name: buildingData.building_name,
        address: [
          buildingData.address_line_1,
          buildingData.address_line_2,
          buildingData.city,
          buildingData.county,
          buildingData.postcode
        ].filter(Boolean).join(', ')
      } : null,
      
      // Detailed extraction data
      leaseExtraction: leaseExtractionData ? {
        id: leaseExtractionData.id,
        extractedClauses: leaseExtractionData.extracted_clauses,
        summary: leaseExtractionData.summary,
        confidence: leaseExtractionData.confidence,
        metadata: leaseExtractionData.metadata,
        extractedAt: leaseExtractionData.created_at
      } : null,
      
      // Processing results metadata
      resultsMetadata: parsedResults,
      
      // URLs for further actions
      urls: {
        downloadText: `/api/lease-processing/results/${params.jobId}/download?format=text`,
        downloadAnalysis: `/api/lease-processing/results/${params.jobId}/download?format=analysis`,
        downloadFull: `/api/lease-processing/results/${params.jobId}/download?format=full`
      }
    };
    
    console.log(`✅ Results retrieved for job ${params.jobId}`);
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('❌ Results retrieval error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to update or annotate results
export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  console.log(`📝 Updating results for job: ${params.jobId}`);
  
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await req.json();
    
    // Verify job belongs to user and is completed
    const { data: jobData, error: jobError } = await supabase
      .from('lease_processing_jobs')
      .select('id, document_id, status')
      .eq('id', params.jobId)
      .eq('user_id', userId)
      .single();
    
    if (jobError || !jobData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }
    
    if (jobData.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Can only update results for completed jobs' 
      }, { status: 400 });
    }
    
    // Handle different types of updates
    const { action, data } = body;
    
    switch (action) {
      case 'add_annotation':
        // Add user annotation to the lease extraction
        const { error: annotationError } = await supabase
          .from('lease_extractions')
          .update({
            metadata: supabase.raw(`
              COALESCE(metadata, '{}'::jsonb) || 
              jsonb_build_object(
                'userAnnotations', 
                COALESCE(metadata->'userAnnotations', '[]'::jsonb) || 
                jsonb_build_array(?::jsonb)
              )
            `, [JSON.stringify({
              annotation: data.annotation,
              createdAt: new Date().toISOString(),
              createdBy: userId
            })])
          })
          .eq('document_id', jobData.document_id);
        
        if (annotationError) {
          console.error('❌ Failed to add annotation:', annotationError);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to add annotation' 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Annotation added successfully' 
        });
        
      case 'correct_analysis':
        // Allow user to correct lease analysis
        const { error: correctionError } = await supabase
          .from('lease_extractions')
          .update({
            extracted_clauses: data.correctedClauses || supabase.raw('extracted_clauses'),
            metadata: supabase.raw(`
              COALESCE(metadata, '{}'::jsonb) || 
              jsonb_build_object(
                'userCorrections',
                jsonb_build_object(
                  'correctedAt', ?::text,
                  'correctedBy', ?::text,
                  'corrections', ?::jsonb
                )
              )
            `, [
              new Date().toISOString(),
              userId,
              JSON.stringify(data.corrections || {})
            ])
          })
          .eq('document_id', jobData.document_id);
        
        if (correctionError) {
          console.error('❌ Failed to save corrections:', correctionError);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to save corrections' 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Corrections saved successfully' 
        });
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: `Unknown action: ${action}` 
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Results update error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}