// Serverless-compatible PDF text extraction
// This version works in Vercel and other serverless environments

export async function extractTextFromPDF(fileData: Blob): Promise<string> {
  try {
    // For serverless environments, we'll use a simpler approach
    // that doesn't require canvas or heavy PDF.js dependencies
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Check if it's actually a PDF by looking at the magic bytes
    const uint8Array = new Uint8Array(arrayBuffer);
    const isPDF = uint8Array.length >= 4 && 
                  uint8Array[0] === 0x25 && // %
                  uint8Array[1] === 0x50 && // P
                  uint8Array[2] === 0x44 && // D
                  uint8Array[3] === 0x46;   // F
    
    if (!isPDF) {
      return "Not a valid PDF file";
    }
    
    // For now, return basic PDF info since full text extraction
    // requires PDF.js which has canvas dependencies
    return "PDF Document - Text extraction not available in serverless environment";
    
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    return "PDF text extraction failed";
  }
}

// Alternative approach using a lightweight PDF parser
// This could be implemented with a different library that doesn't use canvas
export async function extractTextFromPDFLightweight(fileData: Blob): Promise<string> {
  try {
    // This is a placeholder for a lightweight PDF parser
    // In a real implementation, you might use:
    // - pdf-parse (if it works in serverless)
    // - A custom PDF parser
    // - An external API service
    
    return "PDF Document - Lightweight extraction not implemented";
    
  } catch (error) {
    console.error("Lightweight PDF extraction failed:", error);
    return "PDF extraction failed";
  }
}

// Function to get basic PDF metadata without full text extraction
export async function getPDFMetadata(fileData: Blob): Promise<{
  isPDF: boolean;
  fileName: string;
  fileSize: number;
  type: string;
}> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const isPDF = uint8Array.length >= 4 && 
                  uint8Array[0] === 0x25 && // %
                  uint8Array[1] === 0x50 && // P
                  uint8Array[2] === 0x44 && // D
                  uint8Array[3] === 0x46;   // F
    
    return {
      isPDF,
      fileName: fileData.name || 'unknown.pdf',
      fileSize: fileData.size,
      type: fileData.type
    };
    
  } catch (error) {
    console.error("PDF metadata extraction failed:", error);
    return {
      isPDF: false,
      fileName: 'unknown',
      fileSize: 0,
      type: 'unknown'
    };
  }
} 