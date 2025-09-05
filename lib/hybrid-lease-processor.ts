import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProcessingResult {
  success: boolean;
  type: 'quick' | 'background' | 'error';
  data?: any;
  error?: string;
  jobId?: string;
  message?: string;
  alternatives?: string[];
}

interface QuickProcessingOptions {
  maxTimeoutMs?: number;
  maxFileSizeMB?: number;
  userQuestion?: string;
  buildingId?: string;
  userId?: string;
}

export class HybridLeaseProcessor {
  private static QUICK_TIMEOUT = 90000; // 90 seconds for quick processing
  private static MAX_QUICK_FILE_SIZE = 5 * 1024 * 1024; // 5MB for quick processing
  
  /**
   * Main hybrid processing entry point
   * Attempts quick processing first, falls back to background on timeout/failure
   */
  static async processLease(
    file: File, 
    userQuestion: string,
    options: QuickProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Hybrid processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`❓ User question: ${userQuestion}`);
    
    // Determine if we should try quick processing based on file characteristics
    const shouldTryQuick = this.shouldAttemptQuickProcessing(file, userQuestion);
    
    if (shouldTryQuick) {
      console.log('⚡ Attempting quick processing...');
      
      try {
        const quickResult = await this.attemptQuickProcessing(file, userQuestion, options);
        
        if (quickResult.success) {
          const processingTime = Date.now() - startTime;
          console.log(`✅ Quick processing successful (${processingTime}ms)`);
          
          return {
            success: true,
            type: 'quick',
            data: quickResult.data,
            message: `Analysis complete! Here's what I found in your lease document:`
          };
        }
      } catch (error) {
        console.warn('⚠️ Quick processing failed:', error);
      }
    }
    
    // Quick processing failed or wasn't attempted - fall back to background
    console.log('📋 Creating background processing job...');
    
    try {
      const backgroundResult = await this.createBackgroundJob(file, userQuestion, options);
      
      if (backgroundResult.success) {
        return {
          success: true,
          type: 'background',
          jobId: backgroundResult.jobId,
          message: this.generateFallbackMessage(file, userQuestion, backgroundResult.estimatedTime),
          alternatives: this.generateAlternatives(userQuestion)
        };
      } else {
        return {
          success: false,
          type: 'error',
          error: backgroundResult.error,
          message: 'I encountered an issue processing your lease document. Please try uploading it again.'
        };
      }
    } catch (error) {
      console.error('❌ Background job creation failed:', error);
      
      return {
        success: false,
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'I encountered a technical issue. Please try uploading your document again.',
        alternatives: this.generateAlternatives(userQuestion)
      };
    }
  }
  
  /**
   * Determine if quick processing should be attempted based on file and question characteristics
   */
  private static shouldAttemptQuickProcessing(file: File, userQuestion: string): boolean {
    // Conservative approach - only try quick processing for small files and specific patterns
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Very small files (under 2MB) - always try quick processing
    if (file.size <= 2 * 1024 * 1024) {
      console.log(`📄 Very small file (${fileSizeMB.toFixed(1)}MB) - attempting quick processing`);
      return true;
    }
    
    // Medium files (2-5MB) - only if question suggests it might work quickly
    if (file.size <= this.MAX_QUICK_FILE_SIZE) {
      const quickQuestionPatterns = [
        /page \d+/i,
        /first page/i,
        /last page/i,
        /signature/i,
        /parties|tenant|landlord/i,
        /rent amount|monthly rent/i,
        /address/i,
        /date/i,
        /summary/i
      ];
      
      const hasQuickPattern = quickQuestionPatterns.some(pattern => pattern.test(userQuestion));
      
      if (hasQuickPattern) {
        console.log(`🎯 Medium file (${fileSizeMB.toFixed(1)}MB) with targeted question - attempting quick processing`);
        return true;
      }
      
      console.log(`📋 Medium file (${fileSizeMB.toFixed(1)}MB) with complex question - skipping to background`);
      return false;
    }
    
    // Large files (over 5MB) - go straight to background processing
    console.log(`📋 Large file (${fileSizeMB.toFixed(1)}MB) - going straight to background processing`);
    return false;
  }
  
  /**
   * Attempt quick processing with shorter timeout
   */
  private static async attemptQuickProcessing(
    file: File, 
    userQuestion: string,
    options: QuickProcessingOptions
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Quick processing timeout - aborting');
      controller.abort();
    }, options.maxTimeoutMs || this.QUICK_TIMEOUT);
    
    try {
      // Use existing OCR processing logic with shorter timeout
      const formData = new FormData();
      formData.append('file', file);
      
      const startTime = Date.now();
      console.log(`🔍 Quick OCR processing for ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
      
      const response = await fetch('/api/ocr-proxy-cors', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      const elapsedTime = Date.now() - startTime;
      console.log(`📊 OCR request completed in ${elapsedTime}ms, status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`OCR failed: ${response.status} - ${errorText}`);
      }
      
      const ocrResult = await response.json();
      
      if (!ocrResult.success || !ocrResult.text) {
        throw new Error(`No text extracted: ${ocrResult.error || 'Unknown OCR error'}`);
      }
      
      console.log(`📝 Successfully extracted ${ocrResult.text.length} characters in ${elapsedTime}ms`);
      
      // Quick AI analysis focused on the user's question
      const analysis = await this.quickLeaseAnalysis(ocrResult.text, userQuestion);
      
      return {
        success: true,
        data: {
          extractedText: ocrResult.text,
          analysis: analysis,
          ocrSource: ocrResult.source,
          processingTime: Date.now(),
          documentType: 'lease'
        }
      };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏰ Quick processing timed out after', options.maxTimeoutMs || this.QUICK_TIMEOUT, 'ms');
        return { success: false, error: 'Quick processing timeout - falling back to background processing' };
      }
      
      // Log detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Quick processing failed:', errorMessage, error);
      
      // Categorize error types for better fallback decisions
      let fallbackReason = 'Processing failed';
      if (errorMessage.includes('timeout') || errorMessage.includes('time')) {
        fallbackReason = 'Processing timeout - using background processing';
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        fallbackReason = 'Server error - using background processing';
      } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
        fallbackReason = 'File too large for quick processing - using background processing';
      } else if (errorMessage.includes('OCR failed')) {
        fallbackReason = 'OCR processing issue - using background processing';
      }
      
      return { 
        success: false, 
        error: fallbackReason
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  /**
   * Quick AI analysis focused on the user's specific question
   */
  private static async quickLeaseAnalysis(extractedText: string, userQuestion: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return `I extracted the text from your lease document but can't perform AI analysis without OpenAI configuration. Here's a preview of the content:\n\n${extractedText.substring(0, 1000)}...`;
    }
    
    try {
      const prompt = `You are a lease document expert. Analyze this lease text and answer the user's specific question.

User Question: "${userQuestion}"

Lease Text: ${extractedText.substring(0, 8000)}

Provide a focused, helpful answer to their question based on the lease content. If you can't find the specific information they're asking about, suggest where they might look or what sections to check.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.3
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout for AI analysis
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.choices?.[0]?.message?.content || 'Analysis completed but no response generated.';
      } else {
        console.warn('⚠️ OpenAI API failed:', response.status);
        return `I've extracted the text from your lease document. Here's what I found related to your question:\n\n${this.extractRelevantSection(extractedText, userQuestion)}`;
      }
    } catch (error) {
      console.warn('⚠️ AI analysis error:', error);
      return `I've extracted the text from your lease document. Here's what I found:\n\n${this.extractRelevantSection(extractedText, userQuestion)}`;
    }
  }
  
  /**
   * Extract relevant section from text based on keywords in question
   */
  private static extractRelevantSection(text: string, question: string): string {
    const keywords = question.toLowerCase().split(/\s+/).filter(word => 
      word.length > 3 && !['what', 'where', 'when', 'does', 'this', 'that', 'with'].includes(word)
    );
    
    if (keywords.length === 0) {
      return text.substring(0, 1000) + '...';
    }
    
    // Find paragraphs containing keywords
    const paragraphs = text.split(/\n\s*\n/);
    const relevantParagraphs = paragraphs.filter(para => 
      keywords.some(keyword => para.toLowerCase().includes(keyword))
    );
    
    if (relevantParagraphs.length > 0) {
      return relevantParagraphs.slice(0, 3).join('\n\n').substring(0, 1500);
    }
    
    return text.substring(0, 1000) + '...';
  }
  
  /**
   * Create background processing job
   */
  private static async createBackgroundJob(
    file: File,
    userQuestion: string, 
    options: QuickProcessingOptions
  ): Promise<{ success: boolean; jobId?: string; estimatedTime?: string; error?: string }> {
    
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required for background processing');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      if (options.buildingId) formData.append('buildingId', options.buildingId);
      formData.append('priority', '1'); // High priority for Ask AI requests
      
      console.log('📤 Creating background job...');
      const response = await fetch('/api/lease-processing/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Store the user's question with the job for later reference
        if (result.jobId && userQuestion) {
          await this.storeUserQuestion(result.jobId, userQuestion);
        }
        
        return {
          success: true,
          jobId: result.jobId,
          estimatedTime: result.estimatedProcessingTime || '5-10 minutes'
        };
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Background job creation failed');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Background job creation failed'
      };
    }
  }
  
  /**
   * Store user's original question for reference when background processing completes
   */
  private static async storeUserQuestion(jobId: string, userQuestion: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('lease_processing_jobs')
        .update({
          metadata: supabase.raw(`
            COALESCE(metadata, '{}'::jsonb) || 
            jsonb_build_object('userQuestion', ?::text)
          `, [userQuestion])
        })
        .eq('id', jobId);
      
      if (error) {
        console.warn('⚠️ Failed to store user question:', error);
      }
    } catch (error) {
      console.warn('⚠️ Error storing user question:', error);
    }
  }
  
  /**
   * Generate fallback message when background processing is initiated
   */
  private static generateFallbackMessage(file: File, userQuestion: string, estimatedTime: string): string {
    const fileName = file.name;
    const fileSize = (file.size / (1024 * 1024)).toFixed(1);
    
    return `This lease document (${fileName}, ${fileSize}MB) is quite complex and needs more thorough analysis. I've started a comprehensive background analysis that will be ready in approximately **${estimatedTime}**.

🔄 **What's happening now:**
- Your document is being processed with advanced OCR
- Complete lease analysis with all clauses and terms
- You'll receive an email notification when ready

📧 **You'll be notified when complete** with:
- Full lease analysis and key terms
- Downloadable reports
- Answer to your specific question: "${userQuestion}"

⚡ **In the meantime, I can help if you:**`;
  }
  
  /**
   * Generate alternative suggestions for immediate help
   */
  private static generateAlternatives(userQuestion: string): string[] {
    const alternatives = [
      "Ask about a specific page number (e.g., 'What's on page 1?')",
      "Focus on a particular section (e.g., 'rent section', 'signature page')",
      "Ask for general lease advice or terminology explanations",
      "Upload just the relevant page if you know where the information is"
    ];
    
    // Add question-specific alternatives
    if (userQuestion.toLowerCase().includes('rent')) {
      alternatives.unshift("Ask specifically about the rent amount if you know which page it's on");
    }
    
    if (userQuestion.toLowerCase().includes('tenant') || userQuestion.toLowerCase().includes('landlord')) {
      alternatives.unshift("Check the signature page or first page for party names");
    }
    
    if (userQuestion.toLowerCase().includes('date')) {
      alternatives.unshift("Look for dates on the signature page or lease term section");
    }
    
    return alternatives.slice(0, 4); // Keep it concise
  }
  
  /**
   * Process specific page of a document
   */
  static async processSpecificPage(
    file: File, 
    pageNumber: number, 
    userQuestion: string
  ): Promise<ProcessingResult> {
    
    console.log(`📄 Processing page ${pageNumber} of ${file.name}`);
    
    try {
      // For now, process the entire document but focus analysis on specific page
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.QUICK_TIMEOUT);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/ocr-proxy-cors', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`OCR failed: ${response.status}`);
      }
      
      const ocrResult = await response.json();
      
      if (!ocrResult.success || !ocrResult.text) {
        throw new Error('No text extracted');
      }
      
      // Extract text that likely corresponds to the requested page
      const pageText = this.extractPageContent(ocrResult.text, pageNumber);
      
      const analysis = await this.quickLeaseAnalysis(pageText, userQuestion);
      
      return {
        success: true,
        type: 'quick',
        data: {
          extractedText: pageText,
          analysis: analysis,
          ocrSource: ocrResult.source,
          processingTime: Date.now(),
          documentType: 'lease',
          pageNumber: pageNumber
        },
        message: `Here's what I found on page ${pageNumber}:`
      };
      
    } catch (error) {
      console.error(`❌ Page ${pageNumber} processing failed:`, error);
      
      return {
        success: false,
        type: 'error',
        error: error instanceof Error ? error.message : 'Page processing failed',
        message: `I couldn't process page ${pageNumber}. Would you like me to analyze the entire document instead?`
      };
    }
  }
  
  /**
   * Extract content that likely corresponds to a specific page
   */
  private static extractPageContent(fullText: string, pageNumber: number): string {
    // This is a simple approximation - in a real implementation you'd want
    // more sophisticated page detection based on OCR metadata
    const estimatedCharsPerPage = 2000;
    const startIndex = (pageNumber - 1) * estimatedCharsPerPage;
    const endIndex = startIndex + estimatedCharsPerPage;
    
    const pageContent = fullText.substring(startIndex, endIndex);
    
    // If we got less than expected, it might be a short document
    if (pageContent.length < 500 && pageNumber === 1) {
      return fullText.substring(0, estimatedCharsPerPage);
    }
    
    return pageContent || fullText.substring(0, estimatedCharsPerPage);
  }
}