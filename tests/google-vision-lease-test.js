const vision = require('@google-cloud/vision');
const fs = require('fs');

/**
 * Google Vision vs Blociq Lease Analysis Testing Framework
 * 
 * This test suite validates Google Vision API's ability to extract
 * critical information from lease documents compared to Blociq's
 * current performance.
 */

class LeaseAnalysisTest {
  constructor() {
    // Initialize Google Vision client
    this.client = new vision.ImageAnnotatorClient();
    
    // Known correct values from the actual lease document
    this.knownValues = {
      lessor: "LAING HOMES LIMITED",
      lessee: "NEIL ALAN WORNHAM and JOANNE MAY COSGRIFF", 
      address: "Land on the easterly side of Wimbledon Parkside",
      titleNumber: "TGL 57178",
      premium: "Seventy six thousand nine hundred and ninety five pounds (£76,995.00)",
      proportion: "1.48%",
      // Blociq's incorrect values for comparison
      blociqErrors: {
        lessor: "Wrong lessor name",
        lessee: "Wrong lessee name",
        address: "Flat 5, 260 Holloway Road, London N7 8PE",
        rent: "£450 annual rent",
        deposit: "£636,000 deposit"
      }
    };

    this.testResults = {
      textExtraction: {},
      fieldAccuracy: {},
      structuralPreservation: {},
      errorPatterns: {}
    };
  }

  /**
   * Test A: Basic OCR Quality Comparison
   */
  async testOCRQuality(documentPath) {
    console.log('🔍 Running Test A: Basic OCR Quality...');
    
    const [result] = await this.client.textDetection(documentPath);
    const detections = result.textAnnotations;
    const extractedText = detections[0]?.description || '';
    
    // Get file size for comparison
    const stats = fs.statSync(documentPath);
    const fileSizeKB = stats.size / 1024;
    
    // Calculate extraction metrics
    const extractionRate = extractedText.length / (fileSizeKB * 1024);
    const wordCount = extractedText.split(/\s+/).length;
    
    this.testResults.textExtraction = {
      fileSize: `${fileSizeKB.toFixed(2)} KB`,
      extractedChars: extractedText.length,
      extractedWords: wordCount,
      extractionRate: `${(extractionRate * 100).toFixed(2)}%`,
      blociqComparison: {
        blociqRate: "0.04%", // From user's data: 1,190/2.98MB
        improvement: `${((extractionRate * 100) / 0.04).toFixed(0)}x better`
      }
    };
    
    console.log('✅ OCR Quality Results:', this.testResults.textExtraction);
    return extractedText;
  }

  /**
   * Test B: Key Field Extraction Precision
   */
  testKeyFieldExtraction(extractedText) {
    console.log('🔍 Running Test B: Key Field Extraction...');
    
    const results = {};
    
    // Test each critical field
    Object.keys(this.knownValues).forEach(field => {
      if (field === 'blociqErrors') return;
      
      const knownValue = this.knownValues[field];
      const found = this.findFieldInText(extractedText, field, knownValue);
      
      results[field] = {
        expected: knownValue,
        found: found.found,
        accuracy: found.accuracy,
        confidence: found.confidence
      };
    });
    
    this.testResults.fieldAccuracy = results;
    console.log('✅ Field Extraction Results:', results);
    return results;
  }

  /**
   * Test C: Document Section Recognition
   */
  testSectionRecognition(extractedText) {
    console.log('🔍 Running Test C: Document Section Recognition...');
    
    const sections = {
      definitions: this.findSection(extractedText, 'DEFINITIONS'),
      covenants: this.findSection(extractedText, 'COVENANTS'),
      schedules: this.findSection(extractedText, 'SCHEDULE'),
      clauses: this.extractClauseNumbers(extractedText)
    };
    
    this.testResults.structuralPreservation = sections;
    console.log('✅ Section Recognition Results:', sections);
    return sections;
  }

  /**
   * Test D: Table and Schedule Processing
   */
  testTableProcessing(extractedText) {
    console.log('🔍 Running Test D: Table Processing...');
    
    // Look for proportion tables and payment schedules
    const tablePatterns = [
      /Internal.*Proportion.*\d+\.\d+/gi,
      /External.*Proportion.*\d+\.\d+/gi,
      /Service.*Charge.*£[\d,]+/gi,
      /Premium.*£[\d,]+/gi
    ];
    
    const tables = {};
    tablePatterns.forEach((pattern, index) => {
      const matches = extractedText.match(pattern) || [];
      tables[`table_${index + 1}`] = matches;
    });
    
    return tables;
  }

  /**
   * Test E: Covenant Classification
   */
  testCovenantClassification(extractedText) {
    console.log('🔍 Running Test E: Covenant Classification...');
    
    const covenants = {
      maintenance: this.findCovenantReferences(extractedText, ['maintenance', 'repair', 'upkeep']),
      insurance: this.findCovenantReferences(extractedText, ['insurance', 'insure', 'policy']),
      useRestrictions: this.findCovenantReferences(extractedText, ['use', 'occupation', 'restrict']),
      assignment: this.findCovenantReferences(extractedText, ['assign', 'transfer', 'sublet'])
    };
    
    return covenants;
  }

  /**
   * Test F: Financial Calculation Verification
   */
  testFinancialAccuracy(extractedText) {
    console.log('🔍 Running Test F: Financial Calculations...');
    
    // Extract financial figures
    const financialPatterns = {
      premium: /£\s*[\d,]+\.?\d*/g,
      percentage: /\d+\.\d+%/g,
      currency: /£[\d,]+/g
    };
    
    const financials = {};
    Object.keys(financialPatterns).forEach(type => {
      financials[type] = extractedText.match(financialPatterns[type]) || [];
    });
    
    // Validate against known values
    const validation = {
      premiumFound: financials.premium.some(p => p.includes('76,995') || p.includes('76995')),
      proportionFound: financials.percentage.some(p => p.includes('1.48')),
      blociqErrors: {
        incorrectRent: "£450 annual rent (not found in actual document)",
        incorrectDeposit: "£636,000 deposit (actually £76,995 premium)"
      }
    };
    
    return { extracted: financials, validation };
  }

  /**
   * Test G: Systematic Error Detection
   */
  compareWithBlociqErrors(extractedText) {
    console.log('🔍 Running Test G: Error Pattern Analysis...');
    
    const errorAnalysis = {};
    
    Object.keys(this.knownValues.blociqErrors).forEach(field => {
      const blociqError = this.knownValues.blociqErrors[field];
      const actualValue = this.knownValues[field];
      const visionFound = this.findFieldInText(extractedText, field, actualValue);
      
      errorAnalysis[field] = {
        blociqError,
        actualValue,
        visionAccuracy: visionFound.accuracy,
        errorType: this.classifyError(blociqError, actualValue)
      };
    });
    
    this.testResults.errorPatterns = errorAnalysis;
    return errorAnalysis;
  }

  /**
   * Test H: Real-World Scenario Simulation
   */
  testPracticalQuestions(extractedText) {
    console.log('🔍 Running Test H: Practical Questions...');
    
    const questions = [
      {
        question: "What are the annual service charge obligations?",
        searchTerms: ['service charge', 'proportion', '1.48%'],
        answer: null
      },
      {
        question: "Can I sublet this property?",
        searchTerms: ['sublet', 'assignment', 'transfer'],
        answer: null
      },
      {
        question: "What insurance must I maintain?",
        searchTerms: ['insurance', 'policy', 'cover'],
        answer: null
      },
      {
        question: "What maintenance am I responsible for?",
        searchTerms: ['maintenance', 'repair', 'tenant', 'obligation'],
        answer: null
      }
    ];
    
    questions.forEach(q => {
      q.answer = this.findAnswerToQuestion(extractedText, q.searchTerms);
    });
    
    return questions;
  }

  // Helper methods
  findFieldInText(text, fieldType, expectedValue) {
    const searchValue = expectedValue.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (textLower.includes(searchValue)) {
      return { found: true, accuracy: 100, confidence: 'high' };
    }
    
    // Try partial matches
    const words = searchValue.split(' ');
    const foundWords = words.filter(word => textLower.includes(word));
    const accuracy = (foundWords.length / words.length) * 100;
    
    return {
      found: accuracy > 50,
      accuracy: Math.round(accuracy),
      confidence: accuracy > 80 ? 'high' : accuracy > 50 ? 'medium' : 'low'
    };
  }

  findSection(text, sectionName) {
    const pattern = new RegExp(sectionName, 'gi');
    const matches = text.match(pattern);
    return {
      found: matches ? matches.length : 0,
      positions: matches || []
    };
  }

  extractClauseNumbers(text) {
    const clausePattern = /clause\s+\d+/gi;
    const matches = text.match(clausePattern) || [];
    return [...new Set(matches.map(m => m.toLowerCase()))];
  }

  findCovenantReferences(text, keywords) {
    const references = [];
    keywords.forEach(keyword => {
      const pattern = new RegExp(`[^.]*${keyword}[^.]*\\.`, 'gi');
      const matches = text.match(pattern) || [];
      references.push(...matches);
    });
    return references.slice(0, 5); // Limit to first 5 matches
  }

  findAnswerToQuestion(text, searchTerms) {
    const sentences = text.split(/[.!?]/);
    const relevantSentences = sentences.filter(sentence => {
      return searchTerms.some(term => 
        sentence.toLowerCase().includes(term.toLowerCase())
      );
    });
    
    return relevantSentences.slice(0, 3); // Return top 3 relevant sentences
  }

  classifyError(blociqValue, actualValue) {
    if (blociqValue.toLowerCase().includes('flat') && actualValue.toLowerCase().includes('land')) {
      return 'complete_substitution';
    }
    if (blociqValue.includes('£') && actualValue.includes('£')) {
      return 'financial_misinterpretation';
    }
    return 'field_confusion';
  }

  /**
   * Run full test suite
   */
  async runFullTestSuite(documentPath) {
    console.log('🚀 Starting Google Vision vs Blociq Lease Analysis Tests\n');
    
    try {
      // Test A: OCR Quality
      const extractedText = await this.testOCRQuality(documentPath);
      
      // Test B: Field Extraction
      this.testKeyFieldExtraction(extractedText);
      
      // Test C: Section Recognition
      this.testSectionRecognition(extractedText);
      
      // Test D: Table Processing
      const tables = this.testTableProcessing(extractedText);
      
      // Test E: Covenant Classification
      const covenants = this.testCovenantClassification(extractedText);
      
      // Test F: Financial Verification
      const financials = this.testFinancialAccuracy(extractedText);
      
      // Test G: Error Analysis
      const errorAnalysis = this.compareWithBlociqErrors(extractedText);
      
      // Test H: Practical Questions
      const practicalAnswers = this.testPracticalQuestions(extractedText);
      
      // Generate final report
      this.generateFinalReport({
        tables,
        covenants,
        financials,
        errorAnalysis,
        practicalAnswers,
        extractedText: extractedText.substring(0, 1000) + '...' // First 1000 chars
      });
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  generateFinalReport(additionalResults) {
    console.log('\n📊 FINAL TEST REPORT');
    console.log('=====================================');
    
    console.log('\n🔍 OCR QUALITY COMPARISON:');
    console.log(JSON.stringify(this.testResults.textExtraction, null, 2));
    
    console.log('\n🎯 FIELD EXTRACTION ACCURACY:');
    console.log(JSON.stringify(this.testResults.fieldAccuracy, null, 2));
    
    console.log('\n📋 STRUCTURAL PRESERVATION:');
    console.log(JSON.stringify(this.testResults.structuralPreservation, null, 2));
    
    console.log('\n⚠️ ERROR PATTERN ANALYSIS:');
    console.log(JSON.stringify(this.testResults.errorPatterns, null, 2));
    
    console.log('\n💰 FINANCIAL ACCURACY:');
    console.log(JSON.stringify(additionalResults.financials, null, 2));
    
    console.log('\n❓ PRACTICAL Q&A TEST:');
    console.log(JSON.stringify(additionalResults.practicalAnswers, null, 2));
    
    // Calculate overall score
    const fieldAccuracyScore = this.calculateOverallAccuracy();
    console.log(`\n🏆 OVERALL GOOGLE VISION SCORE: ${fieldAccuracyScore}%`);
    console.log('🔴 BLOCIQ BASELINE SCORE: ~10% (based on provided errors)');
    console.log(`📈 IMPROVEMENT FACTOR: ${(fieldAccuracyScore / 10).toFixed(1)}x better\n`);
  }

  calculateOverallAccuracy() {
    const fieldResults = this.testResults.fieldAccuracy;
    if (!fieldResults || Object.keys(fieldResults).length === 0) return 0;
    
    const accuracies = Object.values(fieldResults).map(result => result.accuracy || 0);
    return Math.round(accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length);
  }
}

// Export for use
module.exports = LeaseAnalysisTest;

// Example usage:
// const tester = new LeaseAnalysisTest();
// await tester.runFullTestSuite('./path/to/lease-document.pdf');