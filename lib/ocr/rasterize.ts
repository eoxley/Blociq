// Server-side PDF rasterization utility
// Minimal implementation for converting PDF pages to PNG buffers

export async function rasterizePdfToPngBuffers(pdfBuffer: Buffer, maxPages = 15, dpi = 180): Promise<Buffer[]> {
  try {
    console.log(`🖼️ Rasterizing PDF: ${pdfBuffer.length} bytes, max ${maxPages} pages at ${dpi} DPI`);
    
    // Dynamic import to handle missing dependency gracefully
    const pdfjsModule = await import('pdfjs-dist').catch(() => null);
    if (!pdfjsModule) {
      console.warn('⚠️ PDF.js not available for rasterization');
      return [];
    }
    
    // Try to import canvas for server-side rendering
    let Canvas: any;
    try {
      Canvas = await import('canvas');
    } catch (canvasError) {
      console.warn('⚠️ Canvas not available for PDF rasterization, returning empty array');
      // TODO: Alternative rasterization method could be implemented here
      return [];
    }
    
    // Set worker path
    pdfjsModule.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    const pdf = await pdfjsModule.getDocument(pdfBuffer).promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const imageBuffers: Buffer[] = [];
    
    console.log(`📄 Rasterizing ${pageCount} pages from PDF`);
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: dpi / 72 }); // Convert DPI to scale
        
        const canvas = Canvas.createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to PNG buffer
        const pngBuffer = canvas.toBuffer('image/png');
        imageBuffers.push(pngBuffer);
        
        console.log(`✅ Page ${pageNum} rasterized: ${pngBuffer.length} bytes`);
        
      } catch (pageError) {
        console.error(`❌ Failed to rasterize page ${pageNum}:`, pageError instanceof Error ? pageError.message : pageError);
        // Continue with other pages
      }
    }
    
    console.log(`🎯 Rasterization complete: ${imageBuffers.length} pages converted`);
    return imageBuffers;
    
  } catch (error) {
    console.error('❌ PDF rasterization failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Alternative lightweight method using existing PDF.js render if canvas is not available
export async function rasterizePdfPagesAlternative(pdfBuffer: Buffer, maxPages = 15): Promise<Buffer[]> {
  // Placeholder for alternative rasterization method
  // This could use a different approach like calling an external service
  console.warn('🔄 Alternative rasterization not implemented, returning empty array');
  return [];
}