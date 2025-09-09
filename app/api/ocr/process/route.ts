import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const token = process.env.RENDER_OCR_TOKEN;
    const ocrUrl = process.env.RENDER_OCR_URL;
    
    console.log('🔧 Render OCR Configuration:', {
      hasToken: !!token,
      ocrUrl: ocrUrl ? `${ocrUrl.substring(0, 50)}...` : 'NOT SET',
      tokenLength: token ? token.length : 0
    });
    
    if (!token || !ocrUrl) {
      console.error('❌ Missing Render OCR configuration');
      return NextResponse.json({
        success: false,
        reason: 'missing-render-config',
        details: 'RENDER_OCR_TOKEN and RENDER_OCR_URL must be configured',
        config: {
          hasToken: !!token,
          hasUrl: !!ocrUrl
        },
        suggestions: [
          'Set RENDER_OCR_URL to your deployed Render service URL',
          'Set RENDER_OCR_TOKEN to match the token configured on Render service',
          'Verify both environment variables are set in your deployment platform'
        ]
      }, { status: 500 });
    }
    
    const contentType = req.headers.get("content-type") || "";
    let payload: any = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (small files or with storageKey)
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const storageKey = (form.get("storageKey") as string) || "";
      
      if (!file) {
        return NextResponse.json({ 
          success: false, 
          reason: "no-file" 
        }, { status: 400 });
      }
      
      // Check if file is too large for direct processing
      const MAX_DIRECT_BYTES = 4_500_000; // Vercel safe limit
      if (file.size > MAX_DIRECT_BYTES) {
        if (!storageKey) {
          return NextResponse.json({ 
            success: false, 
            reason: "large-file-no-storageKey",
            details: `File ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds ${(MAX_DIRECT_BYTES / (1024 * 1024)).toFixed(1)} MB limit and no storageKey provided`
          }, { status: 400 });
        }
        
        // Large file: use storageKey only
        payload = { 
          storageKey, 
          filename: file.name, 
          mime: file.type || "application/pdf",
          file: null  // Required by Render service validation
        };
        
        console.log('📤 Routing large file via storageKey:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      } else {
        // Small file: can still send via storageKey for consistency
        payload = { 
          storageKey, 
          filename: file.name, 
          mime: file.type || "application/pdf",
          file: null  // Required by Render service validation
        };
        
        console.log('📤 Routing small file via storageKey:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      }
    } else {
      // Handle JSON (storageKey only)
      try {
        payload = await req.json();
      } catch (jsonError) {
        return NextResponse.json({
          success: false,
          reason: "invalid-json",
          details: "Request body is not valid JSON"
        }, { status: 400 });
      }
      
      if (!payload?.storageKey) {
        return NextResponse.json({ 
          success: false, 
          reason: "missing-storageKey",
          details: "storageKey is required in JSON requests"
        }, { status: 400 });
      }
      
      // Add required file field for Render service validation
      if (!payload.file) {
        payload.file = null;
      }
      
      console.log('📤 Routing file via JSON storageKey:', payload.filename);
    }

    // Forward to Render OCR service
    console.log('🔄 Forwarding to Render OCR service:', ocrUrl);
    console.log('📤 Payload keys:', Object.keys(payload));
    console.log('🔐 Using token:', token ? `${token.substring(0, 10)}...` : 'NO TOKEN');
    
    let renderResponse: Response;
    try {
      // Use FormData for the new endpoint format
      const formData = new FormData();
      
      if (payload.storageKey) {
        // StorageKey flow - send as form data
        formData.append('storage_key', payload.storageKey);
        formData.append('filename', payload.filename);
        formData.append('mime', payload.mime);
        formData.append('use_google_vision', 'true'); // Use Google Vision for better results
      } else if (payload.file) {
        // Direct file upload flow
        formData.append('file', payload.file);
        formData.append('use_google_vision', 'true');
      }
      
      renderResponse = await fetch(ocrUrl, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}` 
        },
        body: formData,
      });
      
      console.log('📨 Render service response status:', renderResponse.status);
      
    } catch (fetchError) {
      console.error('❌ Network error connecting to Render service:', fetchError);
      return NextResponse.json({
        success: false,
        reason: "render-connection-failed",
        details: `Cannot connect to Render OCR service at ${ocrUrl}. Service may be down or URL incorrect.`,
        error: fetchError instanceof Error ? fetchError.message : 'Network error',
        suggestions: [
          'Check if the Render service is running and accessible',
          'Verify the RENDER_OCR_URL is correct',
          'Check network connectivity to Render service'
        ]
      }, { status: 503 });
    }

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text().catch(() => "");
      console.error('❌ Render OCR service failed:', renderResponse.status, errorText);
      
      // Handle specific error types with detailed suggestions
      if (renderResponse.status === 401) {
        return NextResponse.json({
          success: false,
          reason: "authentication-failed",
          details: `Authentication failed with Render OCR service. Token may be invalid or expired.`,
          status: renderResponse.status,
          error: errorText,
          suggestions: [
            "Verify RENDER_OCR_TOKEN matches the token configured on Render service",
            "Check if the token has expired or been regenerated",
            "Ensure the token is correctly set in your environment variables"
          ]
        }, { status: 401 });
      }
      
      if (renderResponse.status === 404) {
        return NextResponse.json({
          success: false,
          reason: "render-endpoint-not-found",
          details: `Render OCR service endpoint not found at ${ocrUrl}. Please check the URL and ensure the service is deployed.`,
          suggestions: [
            "Verify RENDER_OCR_URL environment variable is correct",
            "Ensure Render OCR service is deployed and running", 
            "Check that the /upload endpoint exists on the service"
          ],
          status: renderResponse.status
        }, { status: 502 });
      }
      
      // Check for bucket-related errors from Render service
      if (errorText.includes('BUCKET_NOT_FOUND') || errorText.includes('bucket') || errorText.includes('Bucket not found')) {
        const bucketMatch = errorText.match(/BUCKET_NOT_FOUND:([^,\s]+)/);
        const bucket = bucketMatch ? bucketMatch[1] : 'building_documents';
        
        return NextResponse.json({ 
          success: false, 
          reason: "bucket-not-found",
          bucket: bucket,
          detail: `Storage bucket "${bucket}" not found on Render OCR service. Please ensure bucket exists in Supabase.`,
          status: renderResponse.status,
          suggestions: [
            `Create the "${bucket}" bucket in your Supabase storage`,
            "Verify SUPABASE_STORAGE_BUCKET environment variable matches the bucket name",
            "Check that the Render service has access to the Supabase storage bucket"
          ]
        }, { status: 502 });
      }
      
      // Check for file-related errors
      if (errorText.includes('File not found') || errorText.includes('storage_key')) {
        return NextResponse.json({
          success: false,
          reason: "file-not-found",
          details: `File not found in storage. The storage key may be invalid or the file may have been deleted.`,
          status: renderResponse.status,
          error: errorText,
          suggestions: [
            "Verify the file was successfully uploaded to Supabase storage",
            "Check that the storage key is correct and accessible",
            "Ensure the file hasn't been deleted from storage"
          ]
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: false, 
        reason: "render-ocr-failed", 
        status: renderResponse.status, 
        detail: errorText,
        suggestions: [
          "Check Render service logs for detailed error information",
          "Verify all required environment variables are set on Render service",
          "Ensure the service has sufficient resources to process the request"
        ]
      }, { status: 502 });
    }

    const result = await renderResponse.json();
    
    console.log('✅ Render OCR service responded:', {
      success: result.success,
      source: result.source,
      textLength: result.text_length || 0,
      processingMode: result.processing_mode
    });
    
    // Transform response to match expected format
    const transformedResult = {
      success: result.success || true,
      text: result.text || '',
      source: result.source || 'unknown',
      filename: result.filename || 'unknown',
      textLength: result.text_length || 0,
      processingMode: result.processing_mode || 'unknown'
    };
    
    return NextResponse.json(transformedResult);

  } catch (error) {
    console.error('❌ OCR proxy error:', error);
    
    return NextResponse.json({
      success: false,
      reason: "proxy-error",
      details: error instanceof Error ? error.message : 'Unknown proxy error',
      suggestions: [
        "Check the application logs for more detailed error information",
        "Verify all environment variables are correctly configured",
        "Ensure the OCR service is accessible and running"
      ]
    }, { status: 500 });
  }
}