// app/api/enhanced-document-analysis/route.ts
// Enhanced document analysis API with improved OCR and lease analysis

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhancedAnalysisRequest {
  question: string;
  documentText: string;
  documentMetadata?: {
    filename: string;
    fileSize?: number;
    processingEngine?: string;
    ocrConfidence?: number;
  };
}

interface LeaseAnalysisResponse {
  answer: string;
  citations: Array<{
    clause: string;
    schedule?: string;
    paragraph?: string;
    text: string;
  }>;
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  category: string;
  legalContext?: string;
  practicalImplications?: string;
  documentInfo?: {
    extractedLength: number;
    quality: string;
    processingEngine: string;
    issues: string[];
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Enhanced Document Analysis API: Processing request...');
    
    const { question, documentText, documentMetadata }: EnhancedAnalysisRequest = await request.json();
    
    if (!question || !documentText) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: question and documentText'
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }
    
    console.log('📄 Processing question:', question.substring(0, 100) + '...');
    console.log('📊 Document length:', documentText.length);
    
    // Step 1: Assess document quality
    const quality = assessDocumentQuality(documentText);
    console.log('📈 Document quality assessment:', quality);
    
    // Step 2: Categorize the question
    const questionCategory = categorizeQuestion(question);
    console.log('🏷️ Question category:', questionCategory);
    
    // Step 3: Extract relevant clauses using pattern matching
    const relevantClauses = await extractRelevantClauses(documentText, question, questionCategory);
    console.log('📋 Found relevant clauses:', relevantClauses.length);
    
    // Step 4: Generate AI analysis with enhanced prompting
    const aiAnalysis = await generateEnhancedAnalysis(
      question, 
      documentText, 
      relevantClauses, 
      questionCategory,
      quality
    );
    console.log('🤖 AI analysis completed');
    
    // Step 5: Calculate confidence based on multiple factors
    const confidence = calculateEnhancedConfidence(
      aiAnalysis,
      relevantClauses,
      quality,
      documentText.length
    );
    
    // Step 6: Format the response
    const response: LeaseAnalysisResponse = {
      answer: aiAnalysis.answer || "Unable to provide a specific answer based on the available document content.",
      citations: aiAnalysis.citations || [],
      confidence: confidence,
      confidenceLevel: confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low',
      category: questionCategory,
      legalContext: aiAnalysis.legalContext,
      practicalImplications: aiAnalysis.practicalImplications,
      documentInfo: {
        extractedLength: documentText.length,
        quality: quality.score,
        processingEngine: documentMetadata?.processingEngine || 'unknown',
        issues: quality.issues
      }
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Enhanced analysis completed in ${processingTime}ms with confidence: ${confidence}`);
    
    return NextResponse.json({
      success: true,
      data: response,
      processingTime
    });
    
  } catch (error) {
    console.error('❌ Error in enhanced document analysis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze document',
      details: 'Enhanced document analysis failed'
    }, { status: 500 });
  }
}

// Document quality assessment
function assessDocumentQuality(text: string) {
  const issues: string[] = [];
  let score = 100;

  // Length checks
  if (text.length < 1000) {
    issues.push('Document appears very short');
    score -= 30;
  } else if (text.length < 3000) {
    issues.push('Document may be incomplete');
    score -= 15;
  }

  // Content checks
  if (!text.toLowerCase().includes('lease') && !text.toLowerCase().includes('tenancy')) {
    issues.push('May not be a lease document');
    score -= 20;
  }

  if (!text.match(/\d{4}/)) {
    issues.push('No dates found');
    score -= 10;
  }

  if (!text.includes('£') && !text.toLowerCase().includes('pound')) {
    issues.push('No financial terms found');
    score -= 10;
  }

  // OCR quality indicators
  const errorChars = (text.match(/[^\w\s£.,;:()\-"'\n\r]/g) || []).length;
  const errorRate = errorChars / text.length;
  
  if (errorRate > 0.05) {
    issues.push('High OCR error rate detected');
    score -= 15;
  }

  return {
    score: Math.max(score, 10),
    level: score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor',
    issues,
    errorRate,
    wordCount: text.split(/\s+/).length
  };
}

// Question categorization
function categorizeQuestion(question: string): string {
  const q = question.toLowerCase();
  
  if (q.includes('maintain') || q.includes('repair') || q.includes('common parts')) {
    return 'maintenance_repairs';
  }
  if (q.includes('rent') || q.includes('service charge') || q.includes('payment')) {
    return 'financial_obligations';
  }
  if (q.includes('alter') || q.includes('change') || q.includes('modify')) {
    return 'alterations';
  }
  if (q.includes('assign') || q.includes('sublet') || q.includes('transfer')) {
    return 'assignment_subletting';
  }
  if (q.includes('use') || q.includes('business') || q.includes('commercial')) {
    return 'permitted_use';
  }
  if (q.includes('pet') || q.includes('animal')) {
    return 'pets';
  }
  if (q.includes('notice') || q.includes('termination')) {
    return 'termination_notice';
  }
  
  return 'general';
}

// Extract relevant clauses using pattern matching
async function extractRelevantClauses(text: string, question: string, category: string) {
  const clauses: Array<{
    number?: string;
    text: string;
    relevance: number;
    type: string;
  }> = [];

  // Define patterns based on category
  const patterns = getPatternsByCategory(category);
  
  // Extract keywords from question
  const keywords = extractKeywords(question);
  
  // Find numbered clauses
  const clauseMatches = [...text.matchAll(/(\d+(?:\.\d+)*)\.\s*([^.]{50,500})/g)];
  
  clauseMatches.forEach(match => {
    const clauseNumber = match[1];
    const clauseText = match[2];
    let relevance = 0;
    
    // Check against patterns
    for (const pattern of patterns) {
      if (pattern.test(clauseText)) {
        relevance += 30;
      }
    }
    
    // Check against keywords
    keywords.forEach(keyword => {
      if (clauseText.toLowerCase().includes(keyword)) {
        relevance += 10;
      }
    });
    
    if (relevance > 15) { // Only include if moderately relevant
      clauses.push({
        number: clauseNumber,
        text: clauseText.trim(),
        relevance,
        type: 'numbered_clause'
      });
    }
  });

  // Find schedule sections
  const scheduleMatches = [...text.matchAll(/(schedule\s+[ivx\d]+[^.]{100,800})/gi)];
  scheduleMatches.forEach(match => {
    let relevance = 0;
    const scheduleText = match[1];
    
    // Check relevance for schedules
    keywords.forEach(keyword => {
      if (scheduleText.toLowerCase().includes(keyword)) {
        relevance += 15;
      }
    });
    
    if (relevance > 10) {
      clauses.push({
        text: scheduleText.trim(),
        relevance,
        type: 'schedule'
      });
    }
  });

  // Sort by relevance and return top results
  return clauses
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10); // Limit to top 10 most relevant
}

// Get regex patterns by category
function getPatternsByCategory(category: string): RegExp[] {
  const patternMap: Record<string, RegExp[]> = {
    maintenance_repairs: [
      /(?:landlord|tenant).*(?:maintain|repair|keep in repair)/gi,
      /(?:maintenance|repair).*(?:common parts|structure)/gi,
      /service charge.*(?:maintenance|repair)/gi,
    ],
    financial_obligations: [
      /rent.*payable.*£?\d+/gi,
      /service charge.*£?\d+/gi,
      /ground rent.*£?\d+/gi,
      /payment.*due.*date/gi,
    ],
    alterations: [
      /alter(?:ation)?.*consent/gi,
      /change.*property.*consent/gi,
      /structural.*alteration/gi,
    ],
    assignment_subletting: [
      /assign(?:ment)?.*consent/gi,
      /sublet(?:ting)?.*consent/gi,
      /transfer.*lease/gi,
    ],
    permitted_use: [
      /use.*premises.*for/gi,
      /occupation.*building/gi,
      /commercial.*use/gi,
      /residential.*use/gi,
    ],
    pets: [
      /pet.*animal.*keep/gi,
      /dog.*cat.*animal/gi,
      /animal.*consent/gi,
    ],
    termination_notice: [
      /notice.*quit/gi,
      /terminate.*lease/gi,
      /expiry.*term/gi,
    ]
  };
  
  return patternMap[category] || [/./gi]; // Default to match anything if category not found
}

// Extract keywords from question
function extractKeywords(question: string): string[] {
  const stopWords = ['who', 'what', 'when', 'where', 'how', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  return question.toLowerCase()
    .split(/\s+/)
    .filter(word => !stopWords.includes(word) && word.length > 2);
}

// Generate enhanced AI analysis
async function generateEnhancedAnalysis(
  question: string, 
  documentText: string, 
  relevantClauses: any[], 
  category: string,
  quality: any
) {
  const systemPrompt = `You are a specialized UK lease document analyst with expertise in leasehold law and block management.

Your role is to:
1. Answer questions based ONLY on the provided lease document content
2. Provide exact clause citations from the document
3. Give UK leasehold law context where relevant
4. Explain practical implications for block management
5. Be honest about limitations if the document doesn't contain clear answers

IMPORTANT RULES:
- Answer ONLY from the document text provided
- Always cite specific clauses, paragraphs, or schedules
- If the answer isn't clear in the document, say so explicitly
- Provide confidence levels based on how explicitly the document addresses the question
- Focus on practical implications for property management

Response format should be valid JSON:
{
  "answer": "Direct answer based on lease content",
  "citations": [{"clause": "Clause X", "text": "Relevant text excerpt"}],
  "legalContext": "UK leasehold law context if relevant",
  "practicalImplications": "What this means for block management"
}`;

  const contextText = relevantClauses.length > 0 
    ? relevantClauses.map(c => `${c.number ? `Clause ${c.number}: ` : ''}${c.text}`).join('\n\n')
    : documentText.substring(0, 4000);

  const userPrompt = `Question: ${question}
Category: ${category}
Document Quality: ${quality.level} (${quality.score}/100)

Most relevant clauses from the lease document:
${contextText}

${relevantClauses.length === 0 ? `\nFull document preview:\n${documentText.substring(0, 2000)}...` : ''}

Please provide a comprehensive analysis focusing on what the lease document specifically states about this question.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1200
    });

    const response = completion.choices[0]?.message?.content || '{}';
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.warn('⚠️ JSON parse error, using fallback parsing');
      return {
        answer: response.substring(0, 500),
        citations: [],
        legalContext: null,
        practicalImplications: null
      };
    }
  } catch (error) {
    console.error('❌ Error with AI analysis:', error);
    return {
      answer: "AI analysis unavailable due to technical error.",
      citations: [],
      legalContext: null,
      practicalImplications: null
    };
  }
}

// Calculate enhanced confidence score
function calculateEnhancedConfidence(
  analysis: any, 
  relevantClauses: any[], 
  quality: any, 
  textLength: number
): number {
  let confidence = 20; // Base confidence
  
  // Document quality impact
  if (quality.level === 'good') confidence += 30;
  else if (quality.level === 'fair') confidence += 20;
  else confidence += 10;
  
  // Relevant clauses found
  if (relevantClauses.length > 0) confidence += 25;
  if (relevantClauses.length > 3) confidence += 10;
  
  // Analysis quality
  if (analysis.answer && analysis.answer.length > 100) confidence += 15;
  if (analysis.citations && analysis.citations.length > 0) confidence += 10;
  if (analysis.legalContext) confidence += 5;
  
  // Document completeness
  if (textLength > 3000) confidence += 5;
  if (textLength > 8000) confidence += 5;
  
  return Math.min(Math.max(confidence, 15), 95);
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Enhanced Document Analysis API is running',
    version: '2.0',
    features: [
      'Improved OCR quality assessment',
      'Enhanced clause detection',
      'Category-based question routing',
      'Multi-factor confidence scoring',
      'UK leasehold law context',
      'Practical management implications'
    ],
    usage: {
      method: 'POST',
      body: {
        question: 'Your lease-related question',
        documentText: 'Extracted text from lease document',
        documentMetadata: {
          filename: 'lease.pdf',
          fileSize: 1234567,
          processingEngine: 'enhanced-ocr',
          ocrConfidence: 0.95
        }
      }
    }
  });
}