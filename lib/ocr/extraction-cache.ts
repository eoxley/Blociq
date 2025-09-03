// Extraction Caching System
// Caches OCR results to avoid re-processing identical documents

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { generateFileHash, ExtractionStats } from './intelligent-selection';

export interface CacheEntry {
  id: string;
  file_hash: string;
  extracted_text: string;
  ocr_method: string;
  extraction_stats: ExtractionStats;
  quality_score: number;
  created_at: string;
  last_accessed: string;
  access_count: number;
}

export interface CacheResult {
  hit: boolean;
  entry?: CacheEntry;
  extracted_text?: string;
}

/**
 * Check if extraction exists in cache
 */
export async function checkExtractionCache(fileBuffer: Buffer): Promise<CacheResult> {
  try {
    const fileHash = generateFileHash(fileBuffer);
    const supabase = createClient(cookies());
    
    console.log(`🔍 Checking cache for file hash: ${fileHash.substring(0, 8)}...`);
    
    const { data: cacheEntry, error } = await supabase
      .from('extraction_cache')
      .select('*')
      .eq('file_hash', fileHash)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - cache miss
        console.log('❌ Cache miss - file not found in cache');
        return { hit: false };
      } else {
        console.error('❌ Cache check error:', error);
        return { hit: false };
      }
    }
    
    // Update access statistics
    await supabase
      .from('extraction_cache')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: cacheEntry.access_count + 1
      })
      .eq('file_hash', fileHash);
    
    console.log(`✅ Cache hit! Method: ${cacheEntry.ocr_method}, Quality: ${cacheEntry.quality_score}`);
    
    return {
      hit: true,
      entry: cacheEntry,
      extracted_text: cacheEntry.extracted_text
    };
    
  } catch (error) {
    console.error('❌ Cache check failed:', error);
    return { hit: false };
  }
}

/**
 * Store extraction result in cache
 */
export async function storeInExtractionCache(
  fileBuffer: Buffer,
  extractedText: string,
  ocrMethod: string,
  extractionStats: ExtractionStats,
  qualityScore: number
): Promise<boolean> {
  try {
    const fileHash = generateFileHash(fileBuffer);
    const supabase = createClient(cookies());
    
    console.log(`💾 Storing in cache: ${fileHash.substring(0, 8)}... (${ocrMethod})`);
    
    const { error } = await supabase
      .from('extraction_cache')
      .upsert({
        file_hash: fileHash,
        extracted_text: extractedText,
        ocr_method: ocrMethod,
        extraction_stats: extractionStats,
        quality_score: qualityScore,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 1
      }, {
        onConflict: 'file_hash'
      });
    
    if (error) {
      console.error('❌ Cache storage failed:', error);
      return false;
    }
    
    console.log('✅ Successfully stored in cache');
    return true;
    
  } catch (error) {
    console.error('❌ Cache storage error:', error);
    return false;
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStatistics(): Promise<{
  totalEntries: number;
  totalHits: number;
  averageQuality: number;
  methodDistribution: Record<string, number>;
  oldestEntry: string;
  newestEntry: string;
}> {
  try {
    const supabase = createClient(cookies());
    
    const { data: entries, error } = await supabase
      .from('extraction_cache')
      .select('ocr_method, quality_score, access_count, created_at');
    
    if (error) {
      throw error;
    }
    
    const totalEntries = entries.length;
    const totalHits = entries.reduce((sum, entry) => sum + entry.access_count, 0);
    const averageQuality = entries.reduce((sum, entry) => sum + entry.quality_score, 0) / totalEntries;
    
    const methodDistribution: Record<string, number> = {};
    entries.forEach(entry => {
      methodDistribution[entry.ocr_method] = (methodDistribution[entry.ocr_method] || 0) + 1;
    });
    
    const sortedByDate = entries.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    return {
      totalEntries,
      totalHits,
      averageQuality: Number(averageQuality.toFixed(2)),
      methodDistribution,
      oldestEntry: sortedByDate[0]?.created_at || '',
      newestEntry: sortedByDate[sortedByDate.length - 1]?.created_at || ''
    };
    
  } catch (error) {
    console.error('❌ Failed to get cache statistics:', error);
    return {
      totalEntries: 0,
      totalHits: 0,
      averageQuality: 0,
      methodDistribution: {},
      oldestEntry: '',
      newestEntry: ''
    };
  }
}

/**
 * Clean up old cache entries to manage storage
 */
export async function cleanupCache(
  maxAge: number = 30, // days
  minAccessCount: number = 2
): Promise<number> {
  try {
    const supabase = createClient(cookies());
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    
    console.log(`🧹 Cleaning cache entries older than ${maxAge} days with < ${minAccessCount} accesses`);
    
    const { data: deletedEntries, error } = await supabase
      .from('extraction_cache')
      .delete()
      .lt('last_accessed', cutoffDate.toISOString())
      .lt('access_count', minAccessCount)
      .select('id');
    
    if (error) {
      throw error;
    }
    
    const deletedCount = deletedEntries?.length || 0;
    console.log(`✅ Cleaned up ${deletedCount} old cache entries`);
    
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error);
    return 0;
  }
}

/**
 * Get cached extraction or return null if not found
 */
export async function getOrExtractText(
  fileBuffer: Buffer,
  extractionFunction: () => Promise<{
    text: string;
    method: string;
    stats: ExtractionStats;
    quality: number;
  }>
): Promise<{
  text: string;
  method: string;
  fromCache: boolean;
  stats: ExtractionStats;
  quality: number;
}> {
  // Check cache first
  const cacheResult = await checkExtractionCache(fileBuffer);
  
  if (cacheResult.hit && cacheResult.entry) {
    return {
      text: cacheResult.entry.extracted_text,
      method: cacheResult.entry.ocr_method,
      fromCache: true,
      stats: cacheResult.entry.extraction_stats,
      quality: cacheResult.entry.quality_score
    };
  }
  
  // Cache miss - extract text
  console.log('🔄 Cache miss - performing extraction...');
  const extractionResult = await extractionFunction();
  
  // Store in cache for future use
  await storeInExtractionCache(
    fileBuffer,
    extractionResult.text,
    extractionResult.method,
    extractionResult.stats,
    extractionResult.quality
  );
  
  return {
    ...extractionResult,
    fromCache: false
  };
}
