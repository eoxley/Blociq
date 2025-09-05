import { supabase } from '@/lib/supabaseClient';

/**
 * Upload file to Supabase storage and return storage key for OCR processing
 */
export async function uploadToSupabase(file: File, userId?: string): Promise<string> {
  try {
    console.log('📤 Uploading to Supabase:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `ocr-temp/${timestamp}-${sanitizedFileName}`;
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('generated') // Using existing bucket
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600', // 1 hour cache
        upsert: false
      });
    
    if (error) {
      console.error('❌ Supabase upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    console.log('✅ File uploaded to Supabase:', filePath);
    return filePath; // Return the storage key/path
    
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
    console.log('📥 Downloading from Supabase:', storageKey);
    
    const { data, error } = await supabase.storage
      .from('generated')
      .download(storageKey);
    
    if (error) {
      console.error('❌ Supabase download failed:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data received from Supabase');
    }
    
    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('✅ File downloaded from Supabase:', buffer.length, 'bytes');
    
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
    const { error } = await supabase.storage
      .from('generated')
      .remove([storageKey]);
    
    if (error) {
      console.warn('⚠️ Failed to cleanup Supabase file:', storageKey, error);
    } else {
      console.log('🗑️ Cleaned up Supabase file:', storageKey);
    }
  } catch (error) {
    console.warn('⚠️ Cleanup error:', error);
  }
}