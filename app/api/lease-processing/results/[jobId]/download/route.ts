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
  console.log(`⬇️ Download request for job: ${params.jobId}`);
  
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
    
    // Get download format from query params
    const format = req.nextUrl.searchParams.get('format') || 'full';
    const validFormats = ['text', 'analysis', 'full', 'json'];
    
    if (!validFormats.includes(format)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid format. Supported formats: ${validFormats.join(', ')}` 
      }, { status: 400 });
    }
    
    // Get job data with all related information
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
          metadata
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
    
    if (jobData.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: `Job is not completed. Current status: ${jobData.status}` 
      }, { status: 400 });
    }
    
    // Get lease extraction data
    const { data: leaseExtraction } = await supabase
      .from('lease_extractions')
      .select('*')
      .eq('document_id', jobData.document_id)
      .single();
    
    // Get building data if available
    let buildingData = null;
    if (jobData.building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('id, building_name, address_line_1, address_line_2, city, county, postcode')
        .eq('id', jobData.building_id)
        .single();
      buildingData = building;
    }
    
    const filename = jobData.filename.replace(/\.[^/.]+$/, ''); // Remove extension
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    let content: string;
    let mimeType: string;
    let downloadFilename: string;
    
    switch (format) {
      case 'text':
        content = jobData.extracted_text || 'No text extracted';
        mimeType = 'text/plain';
        downloadFilename = `${filename}_extracted_text_${timestamp}.txt`;
        break;
        
      case 'analysis':
        let analysisContent = '';
        
        try {
          const analysis = jobData.lease_analysis 
            ? (typeof jobData.lease_analysis === 'string' 
               ? JSON.parse(jobData.lease_analysis) 
               : jobData.lease_analysis)
            : null;
          
          analysisContent += `LEASE ANALYSIS REPORT\n`;
          analysisContent += `Document: ${jobData.filename}\n`;
          analysisContent += `Processed: ${new Date(jobData.processing_completed_at).toLocaleString()}\n`;
          analysisContent += `OCR Source: ${jobData.ocr_source}\n`;
          if (buildingData) {
            analysisContent += `Building: ${buildingData.building_name}\n`;
          }
          analysisContent += `\n${'='.repeat(50)}\n\n`;
          
          if (analysis) {
            analysisContent += `SUMMARY\n`;
            analysisContent += `Confidence: ${(analysis.confidence * 100).toFixed(1)}%\n`;
            analysisContent += `${analysis.summary || 'No summary available'}\n\n`;
            
            if (analysis.keyTerms) {
              analysisContent += `KEY TERMS EXTRACTED\n`;
              analysisContent += `${'='.repeat(20)}\n`;
              Object.entries(analysis.keyTerms).forEach(([key, value]) => {
                analysisContent += `${key}: ${value}\n`;
              });
              analysisContent += `\n`;
            }
            
            if (analysis.clauses && analysis.clauses.length > 0) {
              analysisContent += `LEASE CLAUSES (${analysis.clauses.length})\n`;
              analysisContent += `${'='.repeat(20)}\n`;
              analysis.clauses.forEach((clause: any, index: number) => {
                analysisContent += `${index + 1}. ${clause.term || 'Unknown Term'}\n`;
                analysisContent += `   ${clause.text || 'No text available'}\n`;
                if (clause.value) {
                  analysisContent += `   Value: ${clause.value}\n`;
                }
                analysisContent += `\n`;
              });
            }
          } else {
            analysisContent += `No analysis data available\n`;
          }
          
        } catch (error) {
          analysisContent += `Error generating analysis report: ${error}\n`;
        }
        
        content = analysisContent;
        mimeType = 'text/plain';
        downloadFilename = `${filename}_lease_analysis_${timestamp}.txt`;
        break;
        
      case 'json':
        const jsonData = {
          jobId: jobData.id,
          documentId: jobData.document_id,
          filename: jobData.filename,
          processing: {
            startedAt: jobData.processing_started_at,
            completedAt: jobData.processing_completed_at,
            duration: jobData.processing_duration_ms,
            ocrSource: jobData.ocr_source
          },
          extractedText: jobData.extracted_text,
          leaseAnalysis: jobData.lease_analysis ? 
            (typeof jobData.lease_analysis === 'string' 
             ? JSON.parse(jobData.lease_analysis) 
             : jobData.lease_analysis) : null,
          leaseExtraction: leaseExtraction,
          building: buildingData,
          results: jobData.results ? 
            (typeof jobData.results === 'string'
             ? JSON.parse(jobData.results)
             : jobData.results) : null,
          exportedAt: new Date().toISOString()
        };
        
        content = JSON.stringify(jsonData, null, 2);
        mimeType = 'application/json';
        downloadFilename = `${filename}_complete_data_${timestamp}.json`;
        break;
        
      case 'full':
      default:
        let fullContent = '';
        
        try {
          const analysis = jobData.lease_analysis 
            ? (typeof jobData.lease_analysis === 'string' 
               ? JSON.parse(jobData.lease_analysis) 
               : jobData.lease_analysis)
            : null;
          
          // Header
          fullContent += `COMPLETE LEASE DOCUMENT ANALYSIS\n`;
          fullContent += `${'='.repeat(60)}\n\n`;
          
          // Document Information
          fullContent += `DOCUMENT INFORMATION\n`;
          fullContent += `Document: ${jobData.filename}\n`;
          fullContent += `File Size: ${(jobData.file_size / 1024 / 1024).toFixed(2)} MB\n`;
          fullContent += `File Type: ${jobData.file_type}\n`;
          fullContent += `Uploaded: ${new Date(jobData.created_at).toLocaleString()}\n`;
          fullContent += `Processed: ${new Date(jobData.processing_completed_at).toLocaleString()}\n`;
          fullContent += `Processing Time: ${jobData.processing_duration_ms ? Math.round(jobData.processing_duration_ms / 1000) + ' seconds' : 'Unknown'}\n`;
          fullContent += `OCR Source: ${jobData.ocr_source}\n`;
          
          if (buildingData) {
            fullContent += `\nBUILDING INFORMATION\n`;
            fullContent += `Name: ${buildingData.building_name}\n`;
            fullContent += `Address: ${[
              buildingData.address_line_1,
              buildingData.address_line_2,
              buildingData.city,
              buildingData.county,
              buildingData.postcode
            ].filter(Boolean).join(', ')}\n`;
          }
          
          fullContent += `\n${'='.repeat(60)}\n\n`;
          
          // Analysis Section
          if (analysis) {
            fullContent += `LEASE ANALYSIS\n`;
            fullContent += `Confidence: ${(analysis.confidence * 100).toFixed(1)}%\n`;
            fullContent += `Summary: ${analysis.summary || 'No summary available'}\n\n`;
            
            if (analysis.keyTerms) {
              fullContent += `KEY TERMS EXTRACTED\n`;
              fullContent += `${'-'.repeat(30)}\n`;
              Object.entries(analysis.keyTerms).forEach(([key, value]) => {
                fullContent += `${key}: ${value}\n`;
              });
              fullContent += `\n`;
            }
            
            if (analysis.clauses && analysis.clauses.length > 0) {
              fullContent += `DETAILED LEASE CLAUSES (${analysis.clauses.length})\n`;
              fullContent += `${'-'.repeat(30)}\n`;
              analysis.clauses.forEach((clause: any, index: number) => {
                fullContent += `${index + 1}. ${clause.term || 'Unknown Term'}\n`;
                fullContent += `   Text: ${clause.text || 'No text available'}\n`;
                if (clause.value) {
                  fullContent += `   Value: ${clause.value}\n`;
                }
                fullContent += `\n`;
              });
            }
          } else {
            fullContent += `LEASE ANALYSIS\nNo analysis data available\n\n`;
          }
          
          fullContent += `${'='.repeat(60)}\n\n`;
          
          // Full extracted text
          fullContent += `COMPLETE EXTRACTED TEXT\n`;
          fullContent += `${'-'.repeat(30)}\n`;
          fullContent += `${jobData.extracted_text || 'No text extracted'}\n`;
          
        } catch (error) {
          fullContent += `Error generating full report: ${error}\n`;
        }
        
        content = fullContent;
        mimeType = 'text/plain';
        downloadFilename = `${filename}_complete_report_${timestamp}.txt`;
        break;
    }
    
    console.log(`✅ Download prepared: ${downloadFilename} (${content.length} characters)`);
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': Buffer.byteLength(content, 'utf8').toString(),
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('❌ Download error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}