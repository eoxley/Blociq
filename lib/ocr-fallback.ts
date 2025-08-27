/**
 * OCR Fallback Utility for BlocIQ
 * Handles multiple OCR strategies and confidence-based fallbacks
 */

import { OCRResult, OCRProcessingError } from './ocr';

export interface OCRFallbackResult extends OCRResult {
  method: 'primary' | 'fallback_1' | 'fallback_2' | 'final';
  attempts: number;
  fallbackReasons: string[];
}

export interface OCRStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  process: (file: File) => Promise<OCRResult>;
}

/**
 * Enhanced OCR processing with multiple fallback strategies
 */
export class OCRFallbackProcessor {
  private strategies: OCRStrategy[] = [];
  private maxAttempts: number = 3;

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize available OCR strategies
   */
  private async initializeStrategies() {
    // Strategy 1: OCR Microservice (primary)
    this.strategies.push({
      name: 'ocr_microservice',
      priority: 1,
      enabled: true,
      process: async (file: File) => {
        const { processDocumentOCR } = await import('./ocr');
        return await processDocumentOCR(file);
      }
    });

    // Strategy 2: Google Vision API (if available)
    if (process.env.GOOGLE_CLOUD_VISION_CREDENTIALS) {
      this.strategies.push({
        name: 'google_vision',
        priority: 2,
        enabled: true,
        process: async (file: File) => {
          // Note: This requires PDF to image conversion
          // For now, we'll skip this as it requires additional setup
          throw new Error('Google Vision not yet implemented - requires PDF to image conversion');
        }
      });
    }

    // Strategy 3: OpenAI Vision API (if available)
    if (process.env.OPENAI_API_KEY) {
      this.strategies.push({
        name: 'openai_vision',
        priority: 3,
        enabled: true,
        process: async (file: File) => {
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          // Convert file to base64
          const arrayBuffer = await file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all readable text from this document. If it's a scanned document or image, describe what you can see. Return only the extracted text without any additional commentary."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${file.type};base64,${base64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000
          });

          const text = response.choices[0]?.message?.content || '';
          
          return {
            text: text.trim(),
            source: 'openai_vision',
            filename: file.name,
            confidence: text.length > 200 ? 0.8 : 0.6,
            quality: text.length > 200 ? 'high' : 'medium'
          };
        }
      });
    }

    console.log(`🔧 OCR Fallback Processor initialized with ${this.strategies.length} strategies`);
  }

  /**
   * Process document with fallback strategies
   */
  async processWithFallback(file: File): Promise<OCRFallbackResult> {
    const fallbackReasons: string[] = [];
    let lastResult: OCRResult | null = null;
    let attempts = 0;

    // Sort strategies by priority
    const sortedStrategies = this.strategies
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      attempts++;
      
      try {
        console.log(`🔄 Attempt ${attempts}: ${strategy.name}`);
        
        const result = await strategy.process(file);
        lastResult = result;
        
        // Validate result quality
        const quality = this.validateResultQuality(result);
        
        if (quality.confidence !== 'low') {
          console.log(`✅ ${strategy.name} succeeded with ${quality.confidence} confidence`);
          
          return {
            ...result,
            method: attempts === 1 ? 'primary' : `fallback_${attempts - 1}`,
            attempts,
            fallbackReasons
          };
        } else {
          const reason = `Low confidence (${quality.confidence}) from ${strategy.name}`;
          fallbackReasons.push(reason);
          console.log(`⚠️ ${reason}, trying next strategy...`);
        }
        
      } catch (error) {
        const reason = `${strategy.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fallbackReasons.push(reason);
        console.log(`❌ ${reason}, trying next strategy...`);
      }
      
      // Stop if we've reached max attempts
      if (attempts >= this.maxAttempts) {
        break;
      }
    }

    // All strategies failed or yielded low confidence
    if (lastResult) {
      console.log('⚠️ All OCR strategies completed but yielded low confidence');
      
      return {
        ...lastResult,
        method: 'final',
        attempts,
        fallbackReasons,
        quality: 'low',
        warnings: [
          'All OCR strategies attempted but yielded low confidence',
          'Document may be of very low quality or in unsupported format',
          'Consider uploading a higher quality document or text-based version'
        ]
      };
    } else {
      // No strategies succeeded at all
      throw new Error(`All OCR strategies failed after ${attempts} attempts`);
    }
  }

  /**
   * Validate OCR result quality
   */
  private validateResultQuality(result: OCRResult): {
    confidence: 'high' | 'medium' | 'low';
    issues: string[];
  } {
    const issues: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'high';
    
    // Check text length
    if (result.text.length < 100) {
      issues.push('Extracted text is very short - document may be image-only or low quality');
      confidence = 'low';
    } else if (result.text.length < 500) {
      issues.push('Extracted text is short - some content may be missing');
      confidence = 'medium';
    }
    
    // Check for common OCR artifacts
    const hasOCRArtifacts = /[^\w\s\.,!?;:'"()\[\]{}@#$%^&*+=<>\/\\|~`]/.test(result.text);
    if (hasOCRArtifacts) {
      issues.push('Text contains unusual characters that may indicate OCR artifacts');
      confidence = confidence === 'high' ? 'medium' : 'low';
    }
    
    // Check for repeated characters (common OCR error)
    const hasRepeatedChars = /(.)\1{4,}/.test(result.text);
    if (hasRepeatedChars) {
      issues.push('Text contains repeated characters - possible OCR scanning issue');
      confidence = confidence === 'high' ? 'medium' : 'low';
    }
    
    // Check for lease-specific keywords to validate content
    const leaseKeywords = ['lease', 'agreement', 'term', 'rent', 'service charge', 'lessor', 'lessee'];
    const hasLeaseContent = leaseKeywords.some(keyword => 
      result.text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!hasLeaseContent) {
      issues.push('Text does not appear to contain lease-related content');
      confidence = confidence === 'high' ? 'medium' : 'low';
    }
    
    return { confidence, issues };
  }

  /**
   * Get available strategies
   */
  getAvailableStrategies(): string[] {
    return this.strategies
      .filter(s => s.enabled)
      .map(s => s.name);
  }

  /**
   * Enable/disable specific strategy
   */
  setStrategyEnabled(strategyName: string, enabled: boolean): void {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Strategy ${strategyName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

// Export singleton instance
export const ocrFallbackProcessor = new OCRFallbackProcessor();

// Export convenience function
export async function processDocumentWithFallback(file: File): Promise<OCRFallbackResult> {
  return await ocrFallbackProcessor.processWithFallback(file);
}
