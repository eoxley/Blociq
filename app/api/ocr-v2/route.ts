// Enhanced OCR System (Future Migration Target)
// Date: January 15, 2025
// Status: Ready for future migration from external OCR servers
// Features: Dual provider support, enhanced error handling, quality validation

import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import OpenAI from 'openai';
import pdf2pic from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Initialize Google Vision (when credentials are available)
let vision: ImageAnnotatorClient | null = null;
try {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PROJECT_ID) {
    vision = new ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID,
      },
    });
    console.log('✅ Google Vision client initialized for enhanced OCR');
  } else {
    console.log('⚠️ Google Vision credentials not configured for enhanced OCR');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Vision for enhanced OCR:', error);
}

// Initialize OpenAI (when credentials are available)
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized for enhanced OCR');
  } else {
    console.log('⚠️ OpenAI credentials not configured for enhanced OCR');
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI for enhanced OCR:', error);
}

export async function POST(request: NextRequest) {
  console.log('🚀 Enhanced OCR V2 endpoint called');
  
  try {
    // Check if any provider is available
    if (!vision && !openai) {
      return NextResponse.json({
        error: 'No OCR providers configured. Please set up Google Vision or OpenAI credentials.',
        providers: { googleVision: false, openAI: false }
      }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📄 Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let provider = '';
    let confidence = 0;
    const diagnostics: any = {};

    // Try Google Vision first (if available)
    if (vision) {
      try {
        console.log('🔍 Attempting Google Vision OCR...');
        const result = await processWithGoogleVision(buffer, file.type);
        extractedText = result.text;
        provider = 'google_vision';
        confidence = result.confidence;
        diagnostics.googleVision = result.diagnostics;
        
        if (extractedText && extractedText.trim().length > 0) {
          console.log('✅ Google Vision successful');
        } else {
          console.log('⚠️ Google Vision returned empty text, trying fallback...');
        }
      } catch (error) {
        console.error('❌ Google Vision failed:', error);
        diagnostics.googleVision = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Try OpenAI Vision as fallback (if available and Google Vision failed)
    if (openai && (!extractedText || extractedText.trim().length === 0)) {
      try {
        console.log('🔍 Attempting OpenAI Vision OCR fallback...');
        const result = await processWithOpenAI(buffer, file.type);
        extractedText = result.text;
        provider = provider ? `${provider}+openai_vision` : 'openai_vision';
        confidence = Math.max(confidence, result.confidence);
        diagnostics.openAI = result.diagnostics;
        
        if (extractedText && extractedText.trim().length > 0) {
          console.log('✅ OpenAI Vision fallback successful');
        }
      } catch (error) {
        console.error('❌ OpenAI Vision fallback failed:', error);
        diagnostics.openAI = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Final validation
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        error: 'Failed to extract text from document',
        provider,
        diagnostics,
        availableProviders: { googleVision: !!vision, openAI: !!openai }
      }, { status: 422 });
    }

    // Quality assessment
    const quality = assessTextQuality(extractedText);
    
    console.log(`✅ Enhanced OCR completed: ${extractedText.length} chars, ${confidence}% confidence, ${quality.score}% quality`);

    return NextResponse.json({
      text: extractedText,
      provider,
      confidence,
      quality,
      diagnostics,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        textLength: extractedText.length,
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Enhanced OCR processing failed:', error);
    return NextResponse.json({
      error: 'OCR processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processWithGoogleVision(buffer: Buffer, mimeType: string) {
  if (!vision) throw new Error('Google Vision not initialized');

  const images: Buffer[] = [];
  const diagnostics: any = { provider: 'google_vision' };

  try {
    if (mimeType === 'application/pdf') {
      // Convert PDF to images
      const tempFilePath = `/tmp/pdf_${Date.now()}.pdf`;
      await writeFile(tempFilePath, buffer);
      
      const convert = pdf2pic.fromPath(tempFilePath, {
        density: 300,
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: 2480,
        height: 3508
      });

      const results = await convert.bulk(-1);
      diagnostics.pagesConverted = results.length;
      
      for (const result of results) {
        if (result.path) {
          const imageBuffer = await fs.promises.readFile(result.path);
          const optimizedImage = await sharp(imageBuffer)
            .normalize()
            .sharpen()
            .png({ quality: 100 })
            .toBuffer();
          images.push(optimizedImage);
          await unlink(result.path);
        }
      }
      
      await unlink(tempFilePath);
    } else {
      // Process image directly
      const optimizedImage = await sharp(buffer)
        .normalize()
        .sharpen()
        .png({ quality: 100 })
        .toBuffer();
      images.push(optimizedImage);
      diagnostics.pagesConverted = 1;
    }

    // Process all images with Google Vision
    let allText = '';
    let totalConfidence = 0;
    let pageCount = 0;

    for (const [index, imageBuffer] of images.entries()) {
      const [result] = await vision.textDetection({ image: { content: imageBuffer } });
      const detections = result.textAnnotations;

      if (detections && detections.length > 0) {
        const pageText = detections[0].description || '';
        allText += pageText + '\n\n';
        
        // Calculate confidence from individual words
        const wordConfidences = detections.slice(1).map(detection => 
          detection.confidence || 0.8
        );
        const pageConfidence = wordConfidences.length > 0 
          ? wordConfidences.reduce((a, b) => a + b) / wordConfidences.length 
          : 0.8;
        
        totalConfidence += pageConfidence;
        pageCount++;
        
        diagnostics[`page_${index + 1}`] = {
          textLength: pageText.length,
          confidence: Math.round(pageConfidence * 100),
          wordsDetected: wordConfidences.length
        };
      }
    }

    const avgConfidence = pageCount > 0 ? totalConfidence / pageCount : 0;
    diagnostics.overallConfidence = Math.round(avgConfidence * 100);

    return {
      text: allText.trim(),
      confidence: Math.round(avgConfidence * 100),
      diagnostics
    };

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  }
}

async function processWithOpenAI(buffer: Buffer, mimeType: string) {
  if (!openai) throw new Error('OpenAI not initialized');

  const diagnostics: any = { provider: 'openai_vision' };

  try {
    let base64Data: string;
    
    if (mimeType === 'application/pdf') {
      // Convert first page of PDF to image for OpenAI
      const tempFilePath = `/tmp/pdf_${Date.now()}.pdf`;
      await writeFile(tempFilePath, buffer);
      
      const convert = pdf2pic.fromPath(tempFilePath, {
        density: 300,
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: 2480,
        height: 3508
      });

      const result = await convert(1); // Convert first page only
      if (!result.path) throw new Error('Failed to convert PDF page');
      
      const imageBuffer = await fs.promises.readFile(result.path);
      base64Data = imageBuffer.toString('base64');
      
      await unlink(result.path);
      await unlink(tempFilePath);
      
      diagnostics.pdfConverted = true;
    } else {
      base64Data = buffer.toString('base64');
      diagnostics.directImage = true;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this image. Return only the extracted text, no additional commentary or formatting. If the image contains a document, transcribe it exactly as written."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType === 'application/pdf' ? 'image/png' : mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000
    });

    const extractedText = response.choices[0]?.message?.content || '';
    diagnostics.tokensUsed = response.usage?.total_tokens || 0;
    diagnostics.model = "gpt-4-vision-preview";

    return {
      text: extractedText,
      confidence: 85, // OpenAI Vision typically has good accuracy
      diagnostics
    };

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  }
}

function assessTextQuality(text: string) {
  const length = text.length;
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const avgWordLength = wordCount > 0 ? length / wordCount : 0;
  
  // Check for common OCR artifacts
  const hasSpecialChars = /[^\w\s\.,!?;:\-()"]/.test(text);
  const hasRepeatedChars = /(.)\1{3,}/.test(text);
  const hasValidWords = /\b[a-zA-Z]{3,}\b/.test(text);
  
  let score = 100;
  
  if (length < 50) score -= 30;
  if (avgWordLength < 3) score -= 20;
  if (hasSpecialChars) score -= 15;
  if (hasRepeatedChars) score -= 25;
  if (!hasValidWords) score -= 40;
  
  score = Math.max(0, Math.min(100, score));
  
  return {
    score: Math.round(score),
    metrics: {
      textLength: length,
      wordCount,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      hasSpecialChars,
      hasRepeatedChars,
      hasValidWords
    }
  };
}
