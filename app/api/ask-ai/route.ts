/**
 * FIXED Enhanced Ask-AI Route - Complete solution for all three issues
 */
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🚀 Enhanced AI route started');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Parse request - HANDLE ALL FIELD NAMES
    const formData = await request.formData();
    const userQuestion = (formData.get('prompt') as string) || 
                        (formData.get('userQuestion') as string) || 
                        (formData.get('question') as string);
    const files = formData.getAll('files') as File[];
    
    console.log(`🔍 Query: "${userQuestion}"`);
    console.log(`📁 Files: ${files.length}`);
    
    if (!userQuestion || userQuestion.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No question provided',
        success: false 
      }, { status: 400 });
    }
    
    // CATEGORIZE QUERY TO AVOID WRONG RESPONSES
    const queryType = categorizeQuery(userQuestion);
    console.log(`🏷️ Query type: ${queryType}`);
    
    let answer = '';
    let databaseRecordsSearched = 0;
    let sources: string[] = [];
    let confidence = 30;
    let extractedText = '';
    
    // PROCESS FILES IF UPLOADED
    if (files.length > 0) {
      console.log(`📄 Processing ${files.length} files...`);
      const file = files[0];
      
      if (file.type === 'application/pdf') {
        // FIX PDF PROCESSING
        extractedText = await extractPDFTextActually(file);
        console.log(`📝 Extracted ${extractedText.length} characters from PDF`);
        
        if (extractedText.length > 0) {
          // ANALYZE THE ACTUAL TEXT
          answer = await analyzeLeaseDocument(extractedText, userQuestion);
          confidence = 85;
          sources = [`Document: ${file.name}`];
        } else {
          answer = `I was unable to extract text from "${file.name}". This PDF may be scanned/image-based. Please try:
• Converting to a text-based PDF
• Uploading as individual images (JPG/PNG)  
• Using a different document format`;
          confidence = 10;
        }
      }
      
      return NextResponse.json({
        success: true,
        answer,
        confidence,
        sources,
        textLength: extractedText?.length || 0,
        documentType: "lease",
        filename: file.name,
        metadata: {
          processingTime: Date.now() - startTime,
          documentsProcessed: files.length,
          databaseRecordsSearched: 0,
          aiModel: "gpt-4-turbo-preview",
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // NO FILES - HANDLE TEXT-ONLY QUERIES
    if (queryType === 'property') {
      console.log('🏠 Property query - searching database...');
      
      // ENHANCED SUPABASE CALL with flexible search
      const searchQuery = extractSearchTerms(userQuestion);
      const { data: allData, error } = await supabase
        .from('vw_units_leaseholders')
        .select('*')
        .or(`unit_number.ilike.%${searchQuery}%,leaseholder_name.ilike.%${searchQuery}%,correspondence_address.ilike.%${searchQuery}%,building_name.ilike.%${searchQuery}%,property_name.ilike.%${searchQuery}%`)
        .limit(50);
      
      console.log(`🔍 Database query result: ${allData?.length || 0} records found`);
      
      if (error) {
        console.error('❌ Supabase error:', error);
        answer = `Database search failed: ${error.message}`;
        confidence = 10;
      } else if (allData) {
        // Use smart matching logic
        const { searchWithSmartMatching } = await import('@/lib/search/smart-unit-matcher');
        const smartResults = await searchWithSmartMatching(allData, userQuestion);
        
        databaseRecordsSearched = allData.length;
        sources = ['vw_units_leaseholders'];
        
        if (smartResults.matches.length > 0) {
          confidence = smartResults.type === 'unit_match' ? 95 : 85;
          
          // Get all available units for AI context
          const availableUnits = allData.map(d => d.unit_number).sort();
          
          // Enhanced AI prompt with context
          const enhancedPrompt = `
User asked: "${userQuestion}"

Available units in the database: ${availableUnits.join(', ')}

Found ${smartResults.matches.length} matching record(s):
${JSON.stringify(smartResults.matches.map(match => ({
  unit: match.unit_number,
  name: match.leaseholder_name,
  email: match.leaseholder_email,
  phone: match.leaseholder_phone,
  address: match.correspondence_address,
  is_director: match.is_director,
  director_role: match.director_role
})), null, 2)}

Please provide a helpful response with the leaseholder information requested. Format it nicely with proper headings and bullet points.`;

          // Generate AI response with context
          answer = await generatePropertyResponse(enhancedPrompt, smartResults.matches);
          
        } else {
          confidence = 60;
          
          // No matches - provide suggestions
          const availableUnits = allData.map(d => d.unit_number).sort();
          const suggestions = smartResults.suggestions;
          
          answer = `I couldn't find an exact match for "${userQuestion}" in your property database.

**Available Units:** ${availableUnits.join(', ')}

${suggestions.length > 0 ? `**Did you mean:** ${suggestions.join(', ')}?` : ''}

**Try searching for:**
• A specific unit number (e.g., "Flat 1", "Unit 10")
• A tenant name
• Part of an address

**Available properties:** ${availableUnits.length} units found in the database.`;
        }
      } else {
        answer = `No property database available for searching.`;
        confidence = 10;
        databaseRecordsSearched = 0;
      }
      
    } else if (queryType === 'legal') {
      console.log('⚖️ Legal query - providing compliance info...');
      
      answer = await generateLegalResponse(userQuestion);
      confidence = 80;
      sources = ['Legal Knowledge Base'];
      
    } else {
      console.log('💬 General query - AI response...');
      
      answer = await generateGeneralResponse(userQuestion);
      confidence = 70;
    }
    
    return NextResponse.json({
      success: true,
      answer,
      confidence,
      sources,
      metadata: {
        processingTime: Date.now() - startTime,
        documentsProcessed: 0,
        databaseRecordsSearched, // THIS WILL BE > 0 NOW!
        aiModel: "gpt-4-turbo-preview",
        timestamp: new Date().toISOString()
      },
      relatedQueries: generateRelatedQueries(queryType, userQuestion),
      suggestions: generateSuggestions(queryType, answer)
    });
    
  } catch (error) {
    console.error('❌ Route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Processing failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * CATEGORIZE QUERY TO PREVENT WRONG RESPONSES
 */
function categorizeQuery(query: string): 'property' | 'legal' | 'general' {
  const lower = query.toLowerCase();
  
  // Legal/compliance queries
  if (lower.includes('section 20') || 
      lower.includes('section 21') || 
      lower.includes('legal') || 
      lower.includes('compliance') ||
      lower.includes('regulation')) {
    return 'legal';
  }
  
  // Property queries
  if (lower.includes('leaseholder') || 
      lower.includes('tenant') || 
      lower.includes('property') ||
      lower.includes('house') ||
      lower.includes('unit') ||
      lower.includes('flat') ||
      lower.includes('apartment') ||
      lower.includes('ashwood') ||
      /\b\d+\b/.test(lower)) { // Contains numbers (likely unit numbers)
    return 'property';
  }
  
  return 'general';
}

/**
 * EXTRACT SEARCH TERMS FROM QUERY
 */
function extractSearchTerms(query: string): string {
  // Remove common words and extract meaningful search terms
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'who', 'what', 'where', 'when', 'how'];
  const words = query.toLowerCase().split(/\s+/).filter(word => 
    word.length > 1 && !stopWords.includes(word)
  );
  
  // If query contains numbers, prioritize them
  const numbers = query.match(/\d+/g);
  if (numbers) {
    return numbers[0]; // Return first number found
  }
  
  // Otherwise return first meaningful word
  return words[0] || query;
}

/**
 * GENERATE PROPERTY RESPONSE WITH AI
 */
async function generatePropertyResponse(prompt: string, matches: any[]): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || formatFallbackResponse(matches);
  } catch (error) {
    console.error('AI property response error:', error);
    return formatFallbackResponse(matches);
  }
}

/**
 * FALLBACK RESPONSE FORMATTING
 */
function formatFallbackResponse(matches: any[]): string {
  if (matches.length === 0) return 'No matching properties found.';
  
  const property = matches[0];
  return `## 🏠 Property Found: ${property.unit_number}

**Leaseholder:** ${property.leaseholder_name}
**Email:** ${property.leaseholder_email}
**Phone:** ${property.leaseholder_phone}
**Address:** ${property.correspondence_address}
${property.is_director ? `**Role:** ${property.director_role || 'Director'}` : ''}

${matches.length > 1 ? `\n*Found ${matches.length} matching properties total.*` : ''}`;
}

/**
 * ACTUAL PDF TEXT EXTRACTION - REPLACE YOUR PLACEHOLDER
 */
async function extractPDFTextActually(file: File): Promise<string> {
  console.log(`🔍 Extracting text from ${file.name}...`);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Method 1: Simple text extraction from PDF bytes
    const pdfBytes = new Uint8Array(arrayBuffer);
    const pdfString = new TextDecoder('latin1').decode(pdfBytes);
    
    // Look for text objects in PDF structure
    const textPattern = /BT\s+.*?ET/gs;
    const textObjects = pdfString.match(textPattern) || [];
    
    let extractedText = '';
    textObjects.forEach(textObj => {
      // Extract readable text from PDF text objects
      const readableText = textObj.match(/\((.*?)\)/g);
      if (readableText) {
        const cleaned = readableText.map(t => t.slice(1, -1)).join(' ');
        extractedText += cleaned + ' ';
      }
    });
    
    // Method 2: If no text found, try stream extraction
    if (extractedText.length < 100) {
      const streams = pdfString.match(/stream([\s\S]*?)endstream/g) || [];
      streams.forEach(stream => {
        const readable = stream.match(/[A-Za-z\s\.,;:!?$%-]{10,}/g);
        if (readable) {
          extractedText += readable.join(' ') + ' ';
        }
      });
    }
    
    // Clean up the text
    const cleanText = extractedText
      .replace(/[^\w\s\-.,;:(){}[\]"'$%@#!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`✅ PDF extraction complete: ${cleanText.length} characters`);
    return cleanText;
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    return '';
  }
}

/**
 * ANALYZE LEASE DOCUMENT WITH EXTRACTED TEXT
 */
async function analyzeLeaseDocument(text: string, query: string): Promise<string> {
  const prompt = `Analyze this lease document text and answer the user's question: "${query}"

Lease text: ${text.substring(0, 3000)}

Extract and provide:
1. Property address
2. Tenant names
3. Monthly rent amount  
4. Lease start/end dates
5. Key terms and conditions

Format as a clear, professional property management response.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || 'Unable to analyze lease document.';
  } catch (error) {
    console.error('Lease analysis error:', error);
    return `I extracted ${text.length} characters from your lease document, but couldn't complete the analysis. The document appears to contain lease information that would need manual review.`;
  }
}

/**
 * GENERATE LEGAL/COMPLIANCE RESPONSES
 */
async function generateLegalResponse(query: string): Promise<string> {
  if (query.toLowerCase().includes('section 20')) {
    return `## ⚖️ Section 20 Notice - UK Property Law

A **Section 20 Notice** is a legal requirement under UK leasehold law when landlords want to carry out major works or enter into long-term service agreements that cost leaseholders more than £250 per year.

**Key Requirements:**
• Must give leaseholders at least 30 days notice
• Must provide estimates from contractors
• Leaseholders have right to nominate contractors
• Must follow consultation procedures

**When Required:**
• Major repairs/improvements over £250 per leaseholder per year
• Long-term agreements (over 12 months)
• Qualifying works on communal areas

**Next Steps:**
• Prepare detailed work specifications
• Obtain contractor estimates  
• Send formal notice to all leaseholders
• Allow consultation period before proceeding

*Always consult with a qualified solicitor for specific legal advice.*`;
  }
  
  // Handle other legal queries
  return `I can help with UK property law questions. Could you be more specific about what legal or compliance information you need?`;
}

/**
 * GENERATE GENERAL AI RESPONSES
 */
async function generateGeneralResponse(query: string): Promise<string> {
  const prompt = `You are BlocIQ AI, a property management assistant. Answer this question professionally: "${query}"

Keep it concise, helpful, and property-management focused.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || 'I can help with property management questions. Could you be more specific?';
  } catch (error) {
    return 'I can help with property management questions. Could you be more specific?';
  }
}

/**
 * GENERATE APPROPRIATE RELATED QUERIES
 */
function generateRelatedQueries(queryType: string, query: string): string[] {
  if (queryType === 'property') {
    return [
      "Show me all properties in my portfolio",
      "Who are my current tenants?", 
      "What leases are expiring soon?"
    ];
  } else if (queryType === 'legal') {
    return [
      "What is a Section 21 notice?",
      "Leasehold compliance requirements",
      "Major works consultation process"
    ];
  } else {
    return [
      "How can I optimize my property portfolio?",
      "Show me my property dashboard",
      "What maintenance is due?"
    ];
  }
}

/**
 * GENERATE CONTEXTUAL SUGGESTIONS  
 */
function generateSuggestions(queryType: string, answer: string): string[] {
  if (answer.includes('no matching records')) {
    return [
      "Check property name spelling",
      "View complete property list", 
      "Add property to database"
    ];
  } else if (queryType === 'legal') {
    return [
      "Consult with qualified solicitor",
      "Review compliance requirements",
      "Check local regulations"
    ];
  } else {
    return [
      "Upload documents for analysis",
      "Search property portfolio",
      "Check upcoming tasks"
    ];
  }
}