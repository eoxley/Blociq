import { NextResponse } from 'next/server';
import { extractBuildingId } from '@/lib/extract-building-id';
import { extractText } from '@/lib/extract-text';
import { summarizeAndSuggest } from '@/lib/ask/summarize-and-suggest';
import { createClient } from '@supabase/supabase-js';

export const runtime = "nodejs";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Add GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Upload endpoint is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  console.log('🚀 Upload endpoint hit');
  
  try {
    const ct = req.headers.get('content-type') ?? '';
    console.log('📋 Content-Type:', ct);
    
    if (!ct.includes('multipart/form-data')) {
      console.log('❌ Invalid content type:', ct);
      return NextResponse.json({ success: false, error: 'multipart/form-data required' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    
    if (!file) {
      console.log('❌ No file in request');
      return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 });
    }

    console.log('📄 File received:', file.name, file.type, file.size);

    let buildingId = await extractBuildingId(req);
    let buildingStatus: 'matched' | 'not_found' | 'missing' = 'missing';

    if (buildingId && supabase) {
      const { data, error } = await supabase.from('buildings').select('id').eq('id', buildingId).maybeSingle();
      if (error || !data) { 
        buildingStatus = 'not_found'; 
        buildingId = null; 
      } else { 
        buildingStatus = 'matched'; 
      }
    } else if (buildingId && !supabase) {
      // Can't verify; treat as missing and proceed
      buildingStatus = 'missing';
      buildingId = null;
    }

    console.log('🔍 Building ID:', buildingId, 'Status:', buildingStatus);

    const { text, meta } = await extractText(file);
    console.log('📝 Text extracted, length:', text.length);
    
    const { summary, suggestions } = await summarizeAndSuggest(text, meta.name);
    console.log('🤖 Summary generated, suggestions:', suggestions.length);
    
    const textExcerpt = text.slice(0, 4000);

    if (supabase) {
      try {
        await supabase.from('document_analyses').insert({
          building_id: buildingId, 
          filename: meta.name, 
          mime_type: meta.type, 
          size_bytes: meta.bytes,
          summary, 
          source: 'ask-blociq'
        });
        console.log('💾 Document analysis saved to database');
      } catch (dbError) {
        console.warn('⚠️ Failed to store document analysis:', dbError);
        // Don't fail the request if this fails
      }
    }

    console.log('✅ Upload processing completed successfully');

    return NextResponse.json({
      success: true,
      summary,
      suggestedActions: suggestions,
      textExcerpt,
      context: { buildingId, buildingStatus, filename: meta.name, bytes: meta.bytes, mime: meta.type }
    });
  } catch (error) {
    console.error('❌ Error in upload route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
