import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export async function convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    console.log('🔄 Converting PDF to images...');
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`📄 PDF has ${pageCount} pages`);
    
    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }
    
    const images: Buffer[] = [];
    
    // Convert each page to an image
    for (let i = 0; i < pageCount; i++) {
      try {
        console.log(`🖼️ Converting page ${i + 1}/${pageCount}...`);
        
        // Create a new PDF with just this page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
        singlePagePdf.addPage(copiedPage);
        
        // Convert to PNG bytes
        const pngBytes = await singlePagePdf.saveAsBase64({ dataUri: true });
        
        // Remove data URI prefix and convert to buffer
        const base64Data = pngBytes.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Use sharp to optimize the image for OCR
        const optimizedImage = await sharp(imageBuffer)
          .png()
          .resize(2000, 2000, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .toBuffer();
        
        images.push(optimizedImage);
        console.log(`✅ Page ${i + 1} converted, size: ${optimizedImage.length} bytes`);
        
      } catch (pageError) {
        console.error(`❌ Failed to convert page ${i + 1}:`, pageError);
        // Continue with other pages
      }
    }
    
    console.log(`✅ PDF conversion complete: ${images.length} images created`);
    return images;
    
  } catch (error) {
    console.error('❌ PDF to image conversion failed:', error);
    throw error;
  }
}

export async function convertPdfToSingleImage(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('🔄 Converting PDF to single image...');
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }
    
    // For now, just convert the first page
    console.log(`🖼️ Converting first page of ${pageCount}...`);
    
    // Create a new PDF with just the first page
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [0]);
    singlePagePdf.addPage(copiedPage);
    
    // Convert to PNG bytes
    const pngBytes = await singlePagePdf.saveAsBase64({ dataUri: true });
    
    // Remove data URI prefix and convert to buffer
    const base64Data = pngBytes.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Use sharp to optimize the image for OCR
    const optimizedImage = await sharp(imageBuffer)
      .png()
      .resize(2000, 2000, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .toBuffer();
    
    console.log(`✅ PDF converted to image, size: ${optimizedImage.length} bytes`);
    return optimizedImage;
    
  } catch (error) {
    console.error('❌ PDF to single image conversion failed:', error);
    throw error;
  }
}
