/**
 * Safe PDF Parse Wrapper
 * This wrapper prevents the pdf-parse library from entering debug mode
 * which tries to read test files and causes ENOENT errors
 */

interface PDFParseOptions {
  normalizeWhitespace?: boolean;
  disableFontFace?: boolean;
  disableEmbeddedFonts?: boolean;
  max?: number;
}

interface PDFParseResult {
  text: string;
  numpages: number;
  numrender: number;
  info: any;
  metadata: any;
  version: string;
}

/**
 * Helper function to safely set environment variable
 */
function setEnvVar(key: string, value: string) {
  (process.env as any)[key] = value;
}

/**
 * Helper function to safely delete environment variable
 */
function deleteEnvVar(key: string) {
  delete (process.env as any)[key];
}

/**
 * Safe PDF parsing function that prevents debug mode activation
 */
export async function safePdfParse(buffer: Buffer, options: PDFParseOptions = {}): Promise<PDFParseResult> {
  // Ensure environment variables that might trigger debug mode are disabled
  const originalDebug = process.env.DEBUG;
  const originalNodeEnv = process.env.NODE_ENV;
  
  try {
    // Temporarily set environment to production to prevent debug mode
    setEnvVar('NODE_ENV', 'production');
    setEnvVar('DEBUG', '');
    
    // Dynamic import to avoid static import issues
    const pdfParse = await import('pdf-parse').then(module => module.default || module);
    
    // Safe default options that prevent internal testing
    const safeOptions: PDFParseOptions = {
      normalizeWhitespace: false,
      disableFontFace: true,
      disableEmbeddedFonts: true,
      max: 0, // Disable max buffer validation that might trigger test file reads
      ...options
    };
    
    // Parse the PDF with safe options
    const result = await pdfParse(buffer, safeOptions);
    
    return result;
    
  } catch (error) {
    // Clean up error messages to remove test file references
    if (error instanceof Error) {
      const cleanMessage = error.message
        .replace(/test\/data\/[^']*/, '[library test file]')
        .replace(/ENOENT.*05-versions-space\.pdf.*/, 'PDF library internal error - file not accessible')
        .replace(/\.\/test\/[^']*/, '[internal test file]');
      
      throw new Error(`PDF parsing failed: ${cleanMessage}`);
    }
    
    throw error;
    
  } finally {
    // Restore original environment variables
    if (originalDebug !== undefined) {
      setEnvVar('DEBUG', originalDebug);
    } else {
      deleteEnvVar('DEBUG');
    }
    
    if (originalNodeEnv !== undefined) {
      setEnvVar('NODE_ENV', originalNodeEnv);
    }
  }
}

/**
 * Check if a buffer is a valid PDF
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  
  // Check PDF magic bytes
  return buffer[0] === 0x25 && // %
         buffer[1] === 0x50 && // P  
         buffer[2] === 0x44 && // D
         buffer[3] === 0x46;   // F
}

/**
 * Get PDF info without full parsing (safer for testing)
 */
export async function getPdfInfo(buffer: Buffer): Promise<{ isPdf: boolean; size: number }> {
  return {
    isPdf: isPdfBuffer(buffer),
    size: buffer.length
  };
}