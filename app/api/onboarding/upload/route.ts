import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Configure body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    let user = null;
    let authError = null;

    // First try cookie-based auth
    const cookieAuth = await supabase.auth.getUser();
    if (cookieAuth.data.user) {
      user = cookieAuth.data.user;
    } else {
      // Try Bearer token auth
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const tokenAuth = await supabase.auth.getUser(token);
        if (tokenAuth.data.user) {
          user = tokenAuth.data.user;
        } else {
          authError = tokenAuth.error;
        }
      } else {
        authError = cookieAuth.error;
      }
    }

    if (authError || !user) {
      console.error('Upload API GET auth error:', authError);
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

    // Fetch raw uploads
    const { data: rawUploads, error: uploadsError } = await supabase
      .from('onboarding_raw')
      .select(`
        *,
        onboarding_batches (
          batch_name
        )
      `)
      .order('created_at', { ascending: false });

    if (uploadsError) {
      console.error('Error fetching raw uploads:', uploadsError);
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: rawUploads || []
    });

  } catch (error) {
    console.error('Upload API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Upload API: Starting POST request');
    
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication - try both cookie and Bearer token methods
    let user = null;
    let authError = null;

    console.log('🔐 Upload API: Checking authentication');

    // First try cookie-based auth
    const cookieAuth = await supabase.auth.getUser();
    console.log('🍪 Upload API: Cookie auth result:', { user: !!cookieAuth.data.user, error: cookieAuth.error });
    
    if (cookieAuth.data.user) {
      user = cookieAuth.data.user;
    } else {
      // Try Bearer token auth
      const authHeader = request.headers.get('authorization');
      console.log('🔑 Upload API: Bearer token present:', !!authHeader);
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const tokenAuth = await supabase.auth.getUser(token);
        console.log('🎫 Upload API: Token auth result:', { user: !!tokenAuth.data.user, error: tokenAuth.error });
        
        if (tokenAuth.data.user) {
          user = tokenAuth.data.user;
        } else {
          authError = tokenAuth.error;
        }
      } else {
        authError = cookieAuth.error;
      }
    }

    if (authError || !user) {
      console.error('❌ Upload API auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }

    console.log('✅ Upload API: User authenticated:', user.id);

    // Check if user is super_admin
    console.log('👤 Upload API: Checking super_admin role for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single();

    console.log('👤 Upload API: Profile check result:', { profile, error: profileError });

    if (profileError || !profile || profile.role !== 'super_admin') {
      console.error('❌ Upload API: Super admin access denied:', { profileError, profile });
      return NextResponse.json({ error: 'Super admin access required', details: profileError?.message }, { status: 403 });
    }

    console.log('✅ Upload API: Super admin confirmed');

    // Parse form data
    console.log('📄 Upload API: Parsing form data');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const batchId = formData.get('batchId') as string;
    const buildingName = formData.get('buildingName') as string;
    const notes = formData.get('notes') as string;

    console.log('📄 Upload API: Form data parsed:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      batchId,
      buildingName,
      notes 
    });

    if (!file) {
      console.error('❌ Upload API: No file provided');
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

        // Validate file size (500MB limit)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
          return NextResponse.json({ 
            error: 'File too large. Maximum size: 500MB' 
          }, { status: 413 });
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
