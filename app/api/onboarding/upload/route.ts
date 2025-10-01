import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const batchId = formData.get('batchId') as string;
    const buildingName = formData.get('buildingName') as string;
    const notes = formData.get('notes') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'text/csv', // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed types: PDF, Excel, Word, TXT, CSV' 
      }, { status: 400 });
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size: 50MB' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `onboarding-raw/${fileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file' 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Calculate file hash for deduplication
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Save file record to onboarding_raw table
    const { data: rawData, error: rawError } = await supabase
      .from('onboarding_raw')
      .insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        file_hash: hash,
        uploader_id: user.id,
        agency_id: profile.agency_id,
        batch_id: batchId || null,
        building_name: buildingName || null,
        notes: notes || null,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (rawError) {
      console.error('Database error:', rawError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([filePath]);
      return NextResponse.json({ 
        error: 'Failed to save file record' 
      }, { status: 500 });
    }

    // Trigger AI processing (async)
    // This will be handled by a separate processing service
    processFileAsync(rawData.id).catch(error => {
      console.error('Async processing error:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        id: rawData.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadUrl: urlData.publicUrl,
        processingStatus: 'pending'
      }
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Async processing function (will be called by background service)
async function processFileAsync(rawId: string) {
  try {
    // This will trigger the AI extraction service
    // For now, we'll just update the status to processing
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    await supabase
      .from('onboarding_raw')
      .update({ 
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', rawId);

    // TODO: Implement actual AI processing
    // This would call the AI extraction service
    
  } catch (error) {
    console.error('Async processing error:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Check authentication
    const { data: { user }, error: authError } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('onboarding_raw')
      .select(`
        *,
        uploader:profiles!onboarding_raw_uploader_id_fkey(full_name),
        batch:onboarding_batches!onboarding_raw_batch_id_fkey(batch_name, status)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    if (status) {
      query = query.eq('processing_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error fetching uploads:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({
        error: 'Failed to fetch uploads',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('GET uploads error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
