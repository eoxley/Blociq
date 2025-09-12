// Enhanced text extraction library with multiple OCR fallbacks
// Handles PDFs, images, and documents with robust error handling

/**
 * Robust Google credentials parsing with multiple fallback strategies
 * Handles common Vercel environment variable corruption issues
 */
function parseRobustGoogleCredentials(credentialsJson: string): any {
  try {
    // Strategy 1: Fix common escaping issues from environment variables
    let cleanedJson = credentialsJson
      .replace(/\\n/g, '\n')           // Fix escaped newlines
      .replace(/\\"/g, '"')            // Fix escaped quotes  
      .replace(/\\\\/g, '\\')          // Fix double backslashes
      .replace(/\\t/g, '\t')           // Fix escaped tabs
      .replace(/\\r/g, '\r');          // Fix escaped carriage returns
    
    return JSON.parse(cleanedJson);
  } catch (jsonError) {
    try {
      // Strategy 2: Character-by-character cleaning for corrupted JSON
      let sanitizedJson = '';
      for (let i = 0; i < credentialsJson.length; i++) {
        const char = credentialsJson[i];
        const charCode = char.charCodeAt(0);
        
        // Skip control characters except newlines, tabs, and carriage returns
        if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
          continue;
        }
        
        // Fix specific problematic characters that appear around position 162
        if (charCode === 8232 || charCode === 8233) { // Line separator, paragraph separator
          sanitizedJson += '\n';
        } else if (charCode === 160) { // Non-breaking space
          sanitizedJson += ' ';
        } else {
          sanitizedJson += char;
        }
      }
      
      sanitizedJson = sanitizedJson.replace(/\\n/g, '\n');
      return JSON.parse(sanitizedJson);
    } catch (sanitizeError) {
      try {
        // Strategy 3: Base64 decode attempt
        const decodedJson = Buffer.from(credentialsJson, 'base64').toString('utf-8');
        const fixedDecodedJson = decodedJson.replace(/\\n/g, '\n');
        return JSON.parse(fixedDecodedJson);
      } catch (base64Error) {
        throw new Error(`All credential parsing strategies failed: ${(jsonError as Error).message}`);
      }
    }
  }
}

export interface TextExtractionResult {
  extractedText: string;
  textLength: number;
  source: 'docai' | 'google_vision' | 'openai_vision' | 'tesseract' | 'pdfjs' | 'pdfjs-raster-openai' | 'test_mode' | 'failed';
  confidence?: number;
  pages?: string[]; // Optional per-page text array (for citations)
  metadata?: {
    pageCount?: number;
    processingTime?: number;
    fileType?: string;
    errorDetails?: string;
  };
}

// Method 1: Google Vision API (Fixed configuration)
export async function extractWithGoogleVision(file: File): Promise<TextExtractionResult> {
  try {
    console.log('🔍 Attempting Google Vision OCR...');
    
    // Convert file to base64 for Vision API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Check for Google Cloud credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && 
        !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && 
        !process.env.GOOGLE_VISION_API_KEY) {
      throw new Error('Google Vision credentials not configured');
    }

    // Use the Google Vision client with proper configuration
    const visionPayload = {
      requests: [
        {
          image: {
            content: base64
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 1
            }
          ]
        }
      ]
    };

    let response;
    
    // Try direct API call with API key first
    if (process.env.GOOGLE_VISION_API_KEY) {
      response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionPayload)
      });
    } else {
      // Try alternative authentication methods first
      try {
        const { tryAlternativeAuth, getAuthHeaders, getAuthenticatedEndpoint } = await import('./google-auth-alternatives');
        
        console.log('🔐 Attempting alternative authentication for Google Vision...');
        const authResult = await tryAlternativeAuth();
        
        if (authResult.success && authResult.method === 'api_key') {
          // Use API key authentication
          const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_VISION_API_KEY;
          response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(visionPayload)
          });
          console.log('✅ Using API key authentication for Google Vision');
        } else if (authResult.success && authResult.method === 'token') {
          // Use access token authentication
          const accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
          response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(visionPayload)
          });
          console.log('✅ Using access token authentication for Google Vision');
        } else {
          throw new Error('Alternative authentication failed');
        }
      } catch (altAuthError) {
        console.log('⚠️  Alternative authentication failed, trying service account...');
        
        // Fallback to service account authentication
        const googleAuthModule = await import('google-auth-library').catch(() => null);
        if (!googleAuthModule) {
          throw new Error('google-auth-library not available');
        }
        
        // Use robust credential parsing for service account
        let credentials;
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
          credentials = parseRobustGoogleCredentials(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        }
        
        const auth = new googleAuthModule.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-vision'],
          ...(credentials && { credentials })
        });
        
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(visionPayload)
        });
        console.log('✅ Using service account authentication for Google Vision');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Google Vision API error (${response.status}):`, errorText);
      throw new Error(`Google Vision API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.responses && result.responses[0] && result.responses[0].fullTextAnnotation) {
      const extractedText = result.responses[0].fullTextAnnotation.text;
      console.log('✅ Google Vision success:', extractedText.length, 'characters');
      
      return {
        extractedText,
        textLength: extractedText.length,
        source: 'google_vision',
        confidence: result.responses[0].fullTextAnnotation.pages?.[0]?.confidence || 0
      };
    } else if (result.responses && result.responses[0] && result.responses[0].error) {
      throw new Error(`Google Vision error: ${result.responses[0].error.message}`);
    } else {
      throw new Error('No text found in document by Google Vision');
    }

  } catch (error) {
    console.error('❌ Google Vision extraction failed:', error);
    return {
      extractedText: '',
      textLength: 0,
      source: 'failed',
      metadata: {
        errorDetails: error instanceof Error ? error.message : 'Unknown Google Vision error'
      }
    };
  }
}

// OpenAI Vision API for image buffers (used by rasterized PDF pages)
export async function extractWithOpenAIVisionImage(imageBuffer: Buffer): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const base64 = imageBuffer.toString('base64');
    
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
                text: 'Extract ALL text from this image. Please extract every piece of text visible, maintaining structure and formatting. Include all headers, body text, footnotes, and any small text.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64}`,
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
      throw new Error(`OpenAI Vision API failed: ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content?.trim() || '';

  } catch (error) {
    console.error('❌ OpenAI Vision image extraction failed:', error);
    return '';
  }
}

// Method 2: OpenAI Vision API (Most reliable for PDFs)
export async function extractWithOpenAI(file: File): Promise<TextExtractionResult> {
  try {
    console.log('🤖 Attempting OpenAI Vision OCR...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    const extractionPrompt = file.type === 'application/pdf' 
      ? `Extract ALL text from this PDF document. This is a lease agreement document, so please extract:
         - All property details, addresses, and legal descriptions
         - All party names (lessors, lessees, guarantors)
         - All financial information (premiums, rents, charges)
         - All dates (commencement, expiry, review dates)
         - All terms, conditions, and legal clauses
         - All schedules and appendices text
         Return the complete text content preserving the document structure and formatting as much as possible.`
      : `Extract ALL text from this image/document. Please extract every piece of text visible, maintaining structure and formatting. Include all headers, body text, footnotes, and any small text.`;
    
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
                text: extractionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
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
      const errorText = await response.text();
      console.error(`❌ OpenAI Vision API error (${response.status}):`, errorText);
      throw new Error(`OpenAI Vision API failed: ${response.status}`);
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content?.trim() || '';
    
    if (extractedText.length === 0) {
      throw new Error('OpenAI returned empty text');
    }

    console.log('✅ OpenAI Vision success:', extractedText.length, 'characters');
    
    return {
      extractedText,
      textLength: extractedText.length,
      source: 'openai_vision',
      metadata: {
        fileType: file.type,
        processingTime: Date.now()
      }
    };

  } catch (error) {
    console.error('❌ OpenAI Vision extraction failed:', error);
    return {
      extractedText: '',
      textLength: 0,
      source: 'failed',
      metadata: {
        errorDetails: error instanceof Error ? error.message : 'Unknown OpenAI error'
      }
    };
  }
}

// Method 3: Tesseract.js (Local OCR fallback)
export async function extractWithTesseract(file: File): Promise<TextExtractionResult> {
  try {
    console.log('📝 Attempting Tesseract.js OCR...');
    
    // Dynamic import to handle missing dependency gracefully
    const tesseractModule = await import('tesseract.js').catch(() => null);
    if (!tesseractModule) {
      throw new Error('Tesseract.js not available');
    }
    
    const startTime = Date.now();
    const worker = await tesseractModule.createWorker('eng');
    
    // Convert file to image buffer for Tesseract
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const { data: { text, confidence } } = await worker.recognize(buffer);
    await worker.terminate();
    
    const processingTime = Date.now() - startTime;
    
    if (text.trim().length === 0) {
      throw new Error('Tesseract found no text in document');
    }

    console.log('✅ Tesseract success:', text.length, 'characters, confidence:', confidence);
    
    return {
      extractedText: text.trim(),
      textLength: text.trim().length,
      source: 'tesseract',
      confidence,
      metadata: {
        processingTime,
        fileType: file.type
      }
    };

  } catch (error) {
    console.error('❌ Tesseract extraction failed:', error);
    return {
      extractedText: '',
      textLength: 0,
      source: 'failed',
      metadata: {
        errorDetails: error instanceof Error ? error.message : 'Unknown Tesseract error'
      }
    };
  }
}

// Method 4: PDF.js text extraction (for text-based PDFs)
export async function extractWithPDFJS(file: File): Promise<TextExtractionResult> {
  try {
    console.log('📄 Attempting PDF.js text extraction...');
    
    if (file.type !== 'application/pdf') {
      throw new Error('PDF.js only works with PDF files');
    }

    // Dynamic import to handle missing dependency gracefully
    const pdfjsModule = await import('pdfjs-dist').catch(() => null);
    if (!pdfjsModule) {
      throw new Error('PDF.js not available');
    }
    
    // Set worker path
    pdfjsModule.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsModule.getDocument(arrayBuffer).promise;
    
    let extractedText = '';
    const pages: string[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      pages.push(pageText);
      extractedText += pageText + '\n\n';
    }

    extractedText = extractedText.trim();
    
    if (extractedText.length === 0) {
      throw new Error('PDF contains no extractable text (possibly scanned/image-based)');
    }

    console.log('✅ PDF.js success:', extractedText.length, 'characters,', pdf.numPages, 'pages');
    
    return {
      extractedText,
      textLength: extractedText.length,
      source: 'pdfjs',
      pages, // Include per-page text for citation detection
      metadata: {
        pageCount: pdf.numPages,
        fileType: file.type
      }
    };

  } catch (error) {
    console.error('❌ PDF.js extraction failed:', error);
    return {
      extractedText: '',
      textLength: 0,
      source: 'failed',
      metadata: {
        errorDetails: error instanceof Error ? error.message : 'Unknown PDF.js error'
      }
    };
  }
}

// Main extraction function with fallback chain
export async function extractText(file: File): Promise<TextExtractionResult> {
  console.log('🔄 Starting text extraction for:', file.name);
  console.log(`📊 File details: ${(file.size / (1024 * 1024)).toFixed(2)} MB, type: ${file.type}`);
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.info("OCR input bytes:", buffer.length, "mime:", file.type);
  
  // Try Document AI first if enabled (EU endpoint)
  const useDocAI = process.env.USE_DOCUMENT_AI === 'true' && !!process.env.DOCUMENT_AI_PROCESSOR_ID;
  console.info("OCR attempt:", "docai", useDocAI ? "enabled" : "disabled");
  
  if (useDocAI) {
    try {
      console.log('🤖 Attempting Document AI OCR (EU endpoint)...');
      const { docaiProcessToText } = await import('@/lib/docai/client');
      
      const startTime = Date.now();
      const docaiResult = await docaiProcessToText(buffer, file.type || 'application/pdf');
      const processingTime = Date.now() - startTime;
      
      if (docaiResult.text && docaiResult.text.length > 0) {
        console.log('✅ Document AI success:', docaiResult.text.length, 'characters');
        const result = {
          extractedText: docaiResult.text,
          textLength: docaiResult.text.length,
          source: 'docai',
          metadata: {
            fileType: file.type,
            processingTime: docaiResult.processingTime || processingTime
          }
        };
        console.info("OCR selected source:", result.source, "textLength:", result.textLength);
        return result;
      } else {
        console.log('⚠️ Document AI returned empty text, trying fallback methods...');
      }
    } catch (error) {
      console.log('⚠️ Document AI failed, continuing with fallback methods:', (error as Error).message);
    }
  } else {
    console.log('ℹ️ Document AI disabled or not configured, using fallback OCR methods');
  }
  
  // Define OCR fallback chain: PDF.js → OpenAI Vision → Google Vision → Tesseract
  const methods = [
    { name: 'PDF.js', fn: extractWithPDFJS, condition: () => file.type === 'application/pdf' },
    { name: 'OpenAI Vision', fn: extractWithOpenAI, condition: () => !!process.env.OPENAI_API_KEY },
    { name: 'Google Vision', fn: extractWithGoogleVision, condition: () => true },
    { name: 'Tesseract', fn: extractWithTesseract, condition: () => file.size < 10 * 1024 * 1024 } // 10MB limit for Tesseract
  ];

  for (const method of methods) {
    if (method.condition()) {
      console.info("OCR attempt:", method.name.toLowerCase().replace(/\s+/g, '_'));
      console.log(`🔍 Trying ${method.name}...`);
      
      // Add timeout to each method to prevent hanging
      const methodPromise = method.fn(file);
      const timeoutPromise = new Promise<TextExtractionResult>((_, reject) => {
        setTimeout(() => reject(new Error(`${method.name} timeout after 60 seconds`)), 60000);
      });
      
      const result = await Promise.race([methodPromise, timeoutPromise]).catch(error => {
        console.error(`⏰ ${method.name} timed out or failed:`, error);
        return {
          extractedText: '',
          textLength: 0,
          source: 'failed' as const,
          metadata: {
            errorDetails: `${method.name} timed out: ${error instanceof Error ? error.message : 'Unknown timeout error'}`
          }
        };
      });
      
      if (result.source !== 'failed' && result.textLength > 0) {
        console.log(`✅ ${method.name} succeeded with ${result.textLength} characters`);
        console.info("OCR selected source:", result.source, "textLength:", result.textLength);
        return result;
      } else {
        console.log(`⚠️ ${method.name} failed: ${result.metadata?.errorDetails || 'Unknown error'}`);
        
        // Special case: If PDF.js failed with no text (image-based PDF), try rasterize-on-empty fallback
        if (method.name === 'PDF.js' && file.type === 'application/pdf' && 
            result.metadata?.errorDetails?.includes('no extractable text')) {
          console.info("OCR fallback:", "rasterizing pdf pages");
          try {
            const { rasterizePdfToPngBuffers } = await import('@/lib/ocr/rasterize');
            const images = await rasterizePdfToPngBuffers(buffer, 60, 180);
            let concat = "";
            
            for (const img of images) {
              const txt = await extractWithOpenAIVisionImage(img);
              if (txt) concat += "\n" + txt;
            }
            
            if (concat.trim().length > 0) {
              const rasterResult = {
                extractedText: concat.trim(),
                textLength: concat.trim().length,
                source: 'pdfjs-raster-openai' as const,
                metadata: {
                  fileType: file.type,
                  pageCount: images.length
                }
              };
              console.info("OCR selected source:", rasterResult.source, "textLength:", rasterResult.textLength);
              return rasterResult;
            } else {
              console.log('⚠️ Rasterized PDF OCR produced no text');
            }
          } catch (rasterError) {
            console.error('❌ PDF rasterization failed:', rasterError);
          }
        }
      }
    } else {
      console.log(`⏭️ Skipping ${method.name} (conditions not met)`);
    }
  }

  // All OCR methods failed - return detailed error information
  console.log('❌ All OCR methods failed, no text could be extracted');
  
  return {
    extractedText: '',
    textLength: 0,
    source: 'failed',
    metadata: {
      errorDetails: 'All OCR methods failed. Check API keys: OpenAI, Google Vision, or ensure PDF contains extractable text',
      fileType: file.type,
      attemptedMethods: methods.map(m => m.name).join(', ')
    }
  };
}