import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize Google Cloud Vision client
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export async function ocrWithGoogleVision(fileBuffer: Buffer): Promise<string> {
  try {
    console.log('🔍 Starting Google Cloud Vision OCR...');
    
    // Convert PDF to images if needed (for multi-page PDFs)
    const images = await convertPDFToImages(fileBuffer);
    
    let allText = '';
    
    for (let i = 0; i < images.length; i++) {
      console.log(`📄 Processing page ${i + 1} of ${images.length}...`);
      
      const [result] = await vision.textDetection(images[i]);
      const detections = result.textAnnotations;
      
      if (detections && detections.length > 0) {
        // The first element contains the entire text
        const text = detections[0].description || '';
        allText += text + '\n\n';
        console.log(`✅ Page ${i + 1} OCR completed: ${text.length} characters`);
      } else {
        console.log(`⚠️ No text detected on page ${i + 1}`);
      }
    }
    
    if (allText.trim().length > 0) {
      console.log('✅ OCR completed successfully');
      return allText.trim();
    } else {
      throw new Error('No text detected in document');
    }
    
  } catch (error) {
    console.error('❌ OCR with Google Cloud Vision failed:', error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to convert PDF to images
async function convertPDFToImages(fileBuffer: Buffer): Promise<Buffer[]> {
  try {
    // For now, we'll use a simple approach
    // In production, you might want to use a library like pdf2pic or similar
    console.log('🔄 Converting PDF to images for OCR...');
    
    // This is a placeholder - in a real implementation, you'd use a PDF to image converter
    // For now, we'll return the original buffer as a single image
    return [fileBuffer];
    
  } catch (error) {
    console.error('❌ PDF to image conversion failed:', error);
    throw new Error('Failed to convert PDF to images for OCR');
  }
}

// Alternative OCR using Tesseract.js (client-side fallback)
export async function ocrWithTesseract(fileBuffer: Buffer): Promise<string> {
  try {
    console.log('🔍 Starting Tesseract.js OCR...');
    
    // This would require installing tesseract.js
    // const { createWorker } = require('tesseract.js');
    // const worker = await createWorker();
    // await worker.loadLanguage('eng');
    // await worker.initialize('eng');
    // const { data: { text } } = await worker.recognize(fileBuffer);
    // await worker.terminate();
    
    // For now, return a placeholder
    throw new Error('Tesseract.js OCR not implemented yet');
    
  } catch (error) {
    console.error('❌ Tesseract.js OCR failed:', error);
    throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Enhanced OCR with multiple fallbacks
export async function ocrWithFallbacks(fileBuffer: Buffer): Promise<{
  text: string;
  method: 'google-vision' | 'tesseract' | 'failed';
  confidence: number;
}> {
  try {
    // Try Google Cloud Vision first
    const googleText = await ocrWithGoogleVision(fileBuffer);
    return {
      text: googleText,
      method: 'google-vision',
      confidence: 0.8
    };
  } catch (googleError) {
    console.log('⚠️ Google Cloud Vision failed, trying Tesseract...');
    
    try {
      // Fallback to Tesseract.js
      const tesseractText = await ocrWithTesseract(fileBuffer);
      return {
        text: tesseractText,
        method: 'tesseract',
        confidence: 0.6
      };
    } catch (tesseractError) {
      console.error('❌ All OCR methods failed');
      throw new Error('All OCR methods failed');
    }
  }
} 