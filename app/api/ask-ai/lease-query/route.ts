// app/api/ask-ai/lease-query/route.ts - Enhanced Document Q&A for Specific Lease
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface LeaseQARequest {
  question: string;
  documentText: string;
  documentMetadata: {
    filename: string;
    property: string;
    lessor: string;
    lessee: string;
    leaseDate: string;
    premium: string;
    term: string;
  };
}

interface LeaseQAResponse {
  question: string;
  answer: string;
  confidence: number;
  citations: Array<{
    clause: string;
    schedule?: string;
    paragraph?: string;
    text: string;
  }>;
  legalContext?: string;
  category: string;
  practicalImplications?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🏠 Lease Q&A API: Processing lease question...');
    
    const { question, documentText, documentMetadata }: LeaseQARequest = await request.json();
    
    if (!question || !documentText) {
      return NextResponse.json({
        success: false,
        error: 'Missing question or document text'
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }
    
    console.log('🏠 Processing lease question:', question);
    console.log('📍 Property:', documentMetadata.property || 'Not specified');
    
    // Enhanced question classification for lease-specific topics
    const category = classifyLeaseQuestion(question);
    console.log('📊 Question category:', category);
    
    // Extract relevant sections with lease-specific logic
    const relevantSections = extractLeaseRelevantSections(question, documentText, category);
    console.log('🔍 Found relevant sections:', relevantSections.length);
    
    // Generate enhanced AI response with legal context
    const aiResponse = await generateEnhancedLeaseResponse(
      question, 
      relevantSections, 
      documentMetadata, 
      category
    );
    
    // Calculate confidence with lease-specific factors
    const confidence = calculateLeaseConfidence(question, aiResponse, relevantSections);
    
    const response: LeaseQAResponse = {
      question,
      answer: aiResponse.answer,
      confidence,
      citations: aiResponse.citations,
      legalContext: aiResponse.legalContext,
      category,
      practicalImplications: aiResponse.practicalImplications
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Lease response generated in ${processingTime}ms with confidence:`, confidence);
    
    return NextResponse.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('❌ Error processing lease question:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process lease question',
      details: 'Lease Q&A processing failed'
    }, { status: 500 });
  }
}

function classifyLeaseQuestion(question: string): string {
  const questionLower = question.toLowerCase();
  
  const leaseCategories = {
    'repairs_maintenance': [
      'repair', 'maintenance', 'fix', 'broken', 'damage', 'upkeep', 'condition',
      'window', 'door', 'decoration', 'clean', 'replace', 'good repair'
    ],
    'rent_payment': [
      'rent', 'payment', 'pay', 'cost', 'price', 'amount', 'due', '450', 'march', 'september',
      'annual rent', 'initial rent', 'rent review'
    ],
    'service_charge': [
      'service charge', 'service cost', 'communal', 'common parts', 'lift', 'cleaning',
      'heating', 'insurance rent', 'building insurance', 'proportion'
    ],
    'alterations': [
      'alteration', 'modification', 'change', 'renovate', 'structural', 'consent',
      'internal', 'external', 'decoration', 'install', 'written consent'
    ],
    'assignment_subletting': [
      'assign', 'sublet', 'underlet', 'sell', 'transfer', 'mortgage', 'charge',
      'possession', 'subletting', 'assignment'
    ],
    'rights_easements': [
      'right', 'easement', 'access', 'entry', 'common parts', 'bicycle', 'storage',
      'support', 'shelter', 'service media', 'rights granted'
    ],
    'termination_forfeiture': [
      'terminate', 'end', 'break', 'cancel', 'notice', 'leave', 'forfeiture',
      're-entry', 'breach', 'determination'
    ],
    'insurance': [
      'insurance', 'cover', 'policy', 'claim', 'insured risk', 'building insurance',
      'reinstatement'
    ],
    'use_restrictions': [
      'use', 'business', 'trade', 'permitted use', 'dwelling', 'commercial',
      'pet', 'animal', 'noise', 'nuisance', 'regulations'
    ],
    'general_terms': []
  };
  
  for (const [category, keywords] of Object.entries(leaseCategories)) {
    if (keywords.some(keyword => questionLower.includes(keyword))) {
      return category;
    }
  }
  
  return 'general_terms';
}

function extractLeaseRelevantSections(question: string, documentText: string, category: string): Array<{section: string, reference: string}> {
  const questionKeywords = extractKeywords(question);
  const categoryKeywords = getLeaseCategoryKeywords(category);
  const allKeywords = [...questionKeywords, ...categoryKeywords];
  
  // Split document into logical sections (clauses, schedules, paragraphs)
  const sections = [];
  
  // Extract main clauses
  const clauseMatches = documentText.matchAll(/\n\s*(\d+\.\s*[A-Z][^\n]+)\n([\s\S]*?)(?=\n\s*\d+\.\s*[A-Z]|\n\s*SCHEDULE|\n\s*$)/g);
  for (const match of clauseMatches) {
    if (match[0] && match[1]) {
      sections.push({
        section: match[0],
        reference: `Clause ${match[1]}`,
        type: 'clause'
      });
    }
  }
  
  // Extract schedules
  const scheduleMatches = documentText.matchAll(/\n\s*(SCHEDULE\s*\d+[^\n]*)\n([\s\S]*?)(?=\n\s*SCHEDULE|\n\s*$)/g);
  for (const match of scheduleMatches) {
    if (match[0] && match[1]) {
      sections.push({
        section: match[0],
        reference: match[1],
        type: 'schedule'
      });
    }
  }
  
  // Extract paragraphs with specific patterns
  const paragraphMatches = documentText.matchAll(/(Schedule\s+\d+[^:]*:\s*[^.]+\.|paragraph\s+\d+[^.]+\.|Clause\s+\d+[^.]+\.)/gi);
  for (const match of paragraphMatches) {
    if (match[0]) {
      sections.push({
        section: match[0],
        reference: match[0].substring(0, 50) + '...',
        type: 'paragraph'
      });
    }
  }
  
  // Score sections based on relevance
  const scoredSections = sections.map(item => {
    let score = 0;
    const sectionLower = item.section.toLowerCase();
    
    // Score based on keyword matches
    allKeywords.forEach(keyword => {
      const matches = (sectionLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      score += matches * (questionKeywords.includes(keyword) ? 3 : 1);
    });
    
    // Boost score for specific lease provisions
    if (category === 'repairs_maintenance' && /schedule\s*6|regulation|repair|maintain/i.test(item.reference)) score += 5;
    if (category === 'alterations' && /schedule\s*5|tenant covenant|alteration/i.test(item.reference)) score += 5;
    if (category === 'rent_payment' && /initial rent|rent payment|£450|£636/i.test(sectionLower)) score += 5;
    if (category === 'service_charge' && /schedule\s*8|service|proportion/i.test(item.reference)) score += 5;
    
    return { ...item, score };
  });
  
  return scoredSections
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .filter(item => item.score > 0)
    .map(item => ({ section: item.section, reference: item.reference }));
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'they', 'them', 'what', 'when', 'where', 'which', 'have', 'been', 'will', 'from', 'into'].includes(word));
  
  return [...new Set(words)].slice(0, 10);
}

function getLeaseCategoryKeywords(category: string): string[] {
  const leaseKeywords: Record<string, string[]> = {
    'repairs_maintenance': ['repair', 'condition', 'maintain', 'decoration', 'good repair', 'fixtures', 'fittings'],
    'rent_payment': ['initial rent', '£450', 'rent payment dates', 'march', 'september', 'advance'],
    'service_charge': ['service charge', 'service costs', 'tenant proportion', '7.46%', '5.19%'],
    'alterations': ['structural', 'alteration', 'consent', 'written consent', 'internal', 'external'],
    'assignment_subletting': ['assign', 'underlet', 'mortgage', 'charge', 'consent', 'seven years'],
    'rights_easements': ['schedule 3', 'rights', 'access', 'bicycle storage', 'common parts'],
    'termination_forfeiture': ['re-entry', 'forfeiture', '21 days', 'breach', 'determination'],
    'insurance': ['insured risks', 'insurance rent', 'building insurance', 'reinstatement'],
    'use_restrictions': ['permitted use', 'dwelling', 'regulations', 'schedule 6', 'nuisance']
  };
  
  return leaseKeywords[category] || [];
}

async function generateEnhancedLeaseResponse(
  question: string, 
  relevantSections: Array<{section: string, reference: string}>, 
  metadata: any, 
  category: string
) {
  const systemPrompt = `You are a specialist UK leasehold property lawyer and block management expert analyzing a specific lease document.

CRITICAL RULES:
1. Base answers ONLY on the lease document text provided
2. Reference exact clauses, schedules, and paragraphs
3. Add legal context from UK leasehold law where relevant
4. If something isn't in the lease, clearly state this
5. Frame answers for someone working in block management
6. Use plain English to explain legal terms

LEASE DETAILS:
- Property: ${metadata.property || 'Flat 5, 260 Holloway Road, London N7 8PE'}
- Lessor: ${metadata.lessor || 'Kensington & Edinburgh Estates Limited'}
- Lessee: ${metadata.lessee || 'Tenant'}
- Date: ${metadata.leaseDate || '17th February 2017'}
- Term: ${metadata.term || '125 years'}
- Premium: ${metadata.premium || '£636,000'}

KEY LEASE STRUCTURE:
- Main clauses 1-21 (interpretation, grant, rights, reservations, covenants)
- Schedule 1: Property definition
- Schedule 2: Rent review (RPI-linked, 10-yearly)
- Schedule 3: Rights granted to tenant
- Schedule 4: Reservations to landlord
- Schedule 5: Tenant covenants
- Schedule 6: Regulations
- Schedule 7: Landlord covenants  
- Schedule 8: Services and service costs

Always cite specific provisions and explain practical implications for block management.`;

  const userPrompt = `Question: ${question}
Category: ${category}

Relevant lease sections:
${relevantSections.map((item, i) => `${item.reference}:\n${item.section.substring(0, 1000)}${item.section.length > 1000 ? '...' : ''}\n`).join('\n')}

Analyze this question against the lease document. Provide:
1. Direct answer based on the lease text
2. Exact citations (clause/schedule/paragraph)
3. Legal context from UK leasehold law
4. Practical implications for block management

Format as JSON with fields: answer, citations, legalContext, practicalImplications`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || '{}';
    
    try {
      const parsed = JSON.parse(response);
      return {
        answer: parsed.answer || 'Unable to determine from lease document',
        citations: extractStructuredCitations(parsed.answer || '', relevantSections),
        legalContext: parsed.legalContext || null,
        practicalImplications: parsed.practicalImplications || null
      };
    } catch {
      return {
        answer: response.substring(0, 1000),
        citations: extractStructuredCitations(response, relevantSections),
        legalContext: null,
        practicalImplications: null
      };
    }
  } catch (error) {
    console.error('Error with OpenAI completion:', error);
    return {
      answer: 'Unable to analyze the lease document at this time.',
      citations: [],
      legalContext: null,
      practicalImplications: null
    };
  }
}

function extractStructuredCitations(answer: string, sections: Array<{section: string, reference: string}>): Array<{clause: string, schedule?: string, paragraph?: string, text: string}> {
  const citations = [];
  
  // Extract clause references from answer
  const clauseMatches = answer.match(/\b(?:clause|paragraph|schedule)\s+\d+(?:\.\d+)*(?:\s*(?:of\s*schedule\s*\d+)?)/gi);
  if (clauseMatches) {
    clauseMatches.forEach(match => {
      const relevantSection = sections.find(s => 
        s.reference.toLowerCase().includes(match.toLowerCase())
      );
      
      if (relevantSection) {
        citations.push({
          clause: match,
          text: relevantSection.section.substring(0, 200) + (relevantSection.section.length > 200 ? '...' : '')
        });
      }
    });
  }
  
  return citations;
}

function calculateLeaseConfidence(question: string, response: any, sections: any[]): number {
  let confidence = 0.4; // Base confidence
  
  // Boost for finding relevant lease sections
  if (sections.length > 0) confidence += 0.2;
  if (sections.length > 2) confidence += 0.1;
  
  // Boost for specific lease provisions found
  if (response.citations && response.citations.length > 0) confidence += 0.2;
  
  // Boost for detailed answer
  if (response.answer && response.answer.length > 150) confidence += 0.1;
  
  // Check for uncertainty phrases
  const uncertaintyPhrases = ['not specified', 'unclear', 'not mentioned', 'cannot determine', 'unable to determine'];
  if (response.answer && uncertaintyPhrases.some(phrase => response.answer.toLowerCase().includes(phrase))) {
    confidence -= 0.15;
  }
  
  return Math.min(Math.max(confidence, 0.1), 0.95);
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Enhanced Lease Q&A API is running',
    usage: 'POST to this endpoint with question, documentText, and documentMetadata',
    example: {
      question: 'Who is responsible for window repairs?',
      documentText: 'Your lease document text here...',
      documentMetadata: {
        filename: 'lease.pdf',
        property: 'Flat 5, 260 Holloway Road',
        lessor: 'Landlord Name',
        lessee: 'Tenant Name',
        leaseDate: '17th February 2017',
        premium: '£636,000',
        term: '125 years'
      }
    }
  });
}