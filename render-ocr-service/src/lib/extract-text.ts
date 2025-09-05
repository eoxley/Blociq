/**
 * Server-side text extraction for Render OCR service
 * Uses existing OCR pipeline: DocAI EU → PDF.js → raster → Vision/Tesseract
 */

// Interface for extraction results
interface ExtractionResult {
  text: string;
  source: string;
}

/**
 * Main extraction function for buffer input (server-side)
 */
export async function extractText(buffer: Buffer, mime: string = "application/pdf"): Promise<ExtractionResult> {
  console.log('🔄 Starting server-side text extraction');
  console.log(`📊 Buffer details: ${buffer.length} bytes, mime: ${mime}`);
  
  // Try Document AI first if enabled (EU endpoint)
  const useDocAI = process.env.USE_DOCUMENT_AI === 'true' && !!process.env.DOCUMENT_AI_PROCESSOR_ID;
  console.info("OCR attempt:", "docai", useDocAI ? "enabled" : "disabled");
  
  if (useDocAI) {
    try {
      console.log('🤖 Attempting Document AI OCR (EU endpoint)...');
      const { docaiProcessToText } = await import('../../../lib/docai/client');
      
      const startTime = Date.now();
      const docaiResult = await docaiProcessToText(buffer, mime);
      const processingTime = Date.now() - startTime;
      
      if (docaiResult.text && docaiResult.text.length > 0) {
        console.log('✅ Document AI success:', docaiResult.text.length, 'characters');
        console.info("OCR selected source:", "docai", "textLength:", docaiResult.text.length);
        return {
          text: docaiResult.text,
          source: 'docai'
        };
      } else {
        console.log('⚠️ Document AI returned empty text, trying fallback methods...');
      }
    } catch (docaiError) {
      console.error('❌ Document AI failed:', docaiError instanceof Error ? docaiError.message : docaiError);
    }
  }

  // Fallback methods
  const methods = [
    {
      name: 'PDF.js',
      condition: () => mime.includes('pdf') || mime === 'application/pdf',
      extract: async () => extractWithPDFJS(buffer)
    },
    {
      name: 'OpenAI Vision',
      condition: () => !!process.env.OPENAI_API_KEY,
      extract: async () => extractWithOpenAIVision(buffer, mime)
    }
  ];

  for (const method of methods) {
    if (method.condition()) {
      console.info("OCR attempt:", method.name.toLowerCase().replace(/\s+/g, '_'));
      console.log(`🔍 Trying ${method.name}...`);
      
      try {
        const text = await method.extract();
        if (text && text.length > 0) {
          const source = method.name === 'PDF.js' ? 'pdfjs' : 
                        method.name === 'OpenAI Vision' ? 'openai_vision' : 
                        'unknown';
          
          console.log(`✅ ${method.name} succeeded with ${text.length} characters`);
          console.info("OCR selected source:", source, "textLength:", text.length);
          
          // Check for image-based PDF and implement raster fallback
          if (method.name === 'PDF.js' && text.length < 50 && mime.includes('pdf')) {
            console.info("OCR fallback:", "rasterizing pdf pages");
            try {
              const rasterText = await extractWithRasterizedPDF(buffer);
              if (rasterText && rasterText.length > text.length) {
                console.info("OCR selected source:", "pdfjs-raster-openai", "textLength:", rasterText.length);
                return {
                  text: rasterText,
                  source: 'pdfjs-raster-openai'
                };
              }
            } catch (rasterError) {
              console.error('❌ PDF rasterization failed:', rasterError);
            }
          }
          
          return { text, source };
        }
      } catch (methodError) {
        console.error(`❌ ${method.name} failed:`, methodError instanceof Error ? methodError.message : methodError);
      }
    }
  }

  console.error('❌ All OCR methods failed');
  return { text: '', source: 'failed' };
}

/**
 * Extract text using PDF.js
 */
async function extractWithPDFJS(buffer: Buffer): Promise<string> {
  try {
    // Use dynamic import for PDF.js to avoid bundling issues
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (error) {
    console.error('❌ PDF.js extraction failed:', error);
    return '';
  }
}

/**
 * Extract text using OpenAI Vision API
 */
async function extractWithOpenAIVision(buffer: Buffer, mime: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    let base64: string;
    let imageType: string;

    if (mime.includes('pdf')) {
      // For PDFs, we'd need to convert to image first
      // For now, return empty to trigger other methods
      return '';
    } else if (mime.includes('image')) {
      base64 = buffer.toString('base64');
      imageType = mime;
    } else {
      return '';
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL text from this image. Please extract every piece of text visible, maintaining structure and formatting.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${base64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || '';

  } catch (error) {
    console.error('❌ OpenAI Vision extraction failed:', error);
    return '';
  }
}

/**
 * Rasterized PDF extraction (fallback for image-based PDFs)
 */
async function extractWithRasterizedPDF(buffer: Buffer): Promise<string> {
  try {
    // Import the rasterization utility from the main project
    const { rasterizePdfToPngBuffers } = await import('../../../lib/ocr/rasterize');
    const { extractWithOpenAIVisionImage } = await import('../../../lib/extract-text');
    
    const images = await rasterizePdfToPngBuffers(buffer, 15, 180);
    let concatenatedText = "";
    
    for (const imageBuffer of images) {
      const text = await extractWithOpenAIVisionImage(imageBuffer);
      if (text) {
        concatenatedText += "\n" + text;
      }
    }
    
    return concatenatedText.trim();
  } catch (error) {
    console.error('❌ Rasterized PDF extraction failed:', error);
    return '';
  }
}