import { supabase } from '@/lib/supabaseClient';

/**
 * Upload file to Supabase storage and return storage key for OCR processing
 */
export async function uploadToSupabase(file: File, userId?: string): Promise<string> {
  try {
    const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "building_documents";
    console.log('📤 Uploading to Supabase bucket:', BUCKET, 'file:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Generate unique file path (objectKey only, no bucket prefix)
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `ocr-temp/${timestamp}-${sanitizedFileName}`;
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600', // 1 hour cache
        upsert: false
      });
    
    if (error) {
      console.error('❌ Supabase upload failed:', error);
      
      // Check for bucket not found error
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
        throw new Error(`BUCKET_NOT_FOUND:${BUCKET}`);
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    console.log('✅ File uploaded to Supabase bucket:', BUCKET, 'path:', filePath);
    return filePath; // Return the storage key/path (objectKey only)
    
  } catch (error) {
    console.error('❌ Upload to Supabase failed:', error);
    throw error;
  }
}

/**
 * Download file from Supabase storage using storage key
 */
export async function downloadFromSupabase(storageKey: string): Promise<{ buffer: Buffer, contentType: string }> {
  try {
    // Use server-side bucket env var for downloads (typically on Render)
    const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "building_documents";
    console.log('📥 Downloading from Supabase bucket:', BUCKET, 'storageKey:', storageKey);
    
    // Ensure storageKey is just the object key, not including bucket prefix
    let objectKey = storageKey;
    if (storageKey.startsWith(`${BUCKET}/`)) {
      objectKey = storageKey.substring(`${BUCKET}/`.length);
      console.log('🔧 Stripped bucket prefix from storageKey:', objectKey);
    }
    
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(objectKey);
    
    if (error) {
      console.error('❌ Supabase download failed:', error);
      
      // Check for bucket not found error
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
        throw new Error(`BUCKET_NOT_FOUND:${BUCKET}`);
      }
      
      throw new Error(`Download failed: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data received from Supabase');
    }
    
    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('✅ File downloaded from Supabase bucket:', BUCKET, 'size:', buffer.length, 'bytes');
    
    return {
      buffer,
      contentType: data.type || 'application/octet-stream'
    };
    
  } catch (error) {
    console.error('❌ Download from Supabase failed:', error);
    throw error;
  }
}

/**
 * Clean up temporary files from Supabase storage
 */
export async function cleanupSupabaseFile(storageKey: string): Promise<void> {
  try {
    const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "building_documents";
    
    // Ensure storageKey is just the object key, not including bucket prefix
    let objectKey = storageKey;
    if (storageKey.startsWith(`${BUCKET}/`)) {
      objectKey = storageKey.substring(`${BUCKET}/`.length);
    }
    
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([objectKey]);
    
    if (error) {
      console.warn('⚠️ Failed to cleanup Supabase file:', objectKey, 'from bucket:', BUCKET, error);
    } else {
      console.log('🗑️ Cleaned up Supabase file:', objectKey, 'from bucket:', BUCKET);
    }
  } catch (error) {
    console.warn('⚠️ Cleanup error:', error);
  }
}