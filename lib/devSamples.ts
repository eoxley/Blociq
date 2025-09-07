/**
 * Development Sample Files Helper
 * Safely loads test files only in development mode
 */

import fs from 'fs';
import path from 'path';

/**
 * Try to load a sample PDF file for development/testing
 * Only works when NODE_ENV !== "production" AND USE_SAMPLE_PDF === "true"
 */
export function tryLoadSamplePdf(filename: string): Buffer | null {
  // Only load in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  // Only load if explicitly enabled
  if (process.env.USE_SAMPLE_PDF !== 'true') {
    return null;
  }
  
  try {
    const samplePath = path.join(process.cwd(), 'test', 'data', filename);
    
    // Check if file exists before reading
    if (!fs.existsSync(samplePath)) {
      console.warn(`Sample PDF not found: ${samplePath}`);
      return null;
    }
    
    return fs.readFileSync(samplePath);
  } catch (error) {
    console.warn(`Failed to load sample PDF ${filename}:`, error);
    return null;
  }
}

/**
 * Check if sample files should be loaded
 */
export function shouldLoadSamples(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.USE_SAMPLE_PDF === 'true';
}

/**
 * Get sample file path if it exists
 */
export function getSamplePath(filename: string): string | null {
  if (!shouldLoadSamples()) {
    return null;
  }
  
  const samplePath = path.join(process.cwd(), 'test', 'data', filename);
  
  if (!fs.existsSync(samplePath)) {
    return null;
  }
  
  return samplePath;
}
