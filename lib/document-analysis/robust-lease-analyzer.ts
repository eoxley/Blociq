// lib/document-analysis/robust-lease-analyzer.ts
// FIXED LEASE ANALYSIS SYSTEM - Comprehensive, robust analysis with proper confidence validation

interface AnalysisResult {
  answer: string;
  confidence: number;
  confidenceLabel: string;
  citations: string[];
  practicalAdvice: string[];
  nextSteps?: string[];
  documentMetadata?: {
    extractedChars: number;
    quality: string;
    issues: string[];
  };
  analysisType?: string;
  supportingClauses?: number;
  error?: string;
}

interface ContextMatch {
  text: {
    text: string;
    clauseRef: string | null;
    fullContext: string;
  };
  type: string;
  confidence: number;
  index: number;
}

// 1. PROPER CONFIDENCE VALIDATION
function validateConfidence(confidence: number): number {
    // Fix the insane 9000% confidence bug
    if (confidence > 100 || confidence < 0 || isNaN(confidence)) {
        console.error(`Invalid confidence value: ${confidence}, defaulting to 0`);
        return 0;
    }
    return Math.round(confidence);
}

// 2. COMPREHENSIVE WINDOW ANALYSIS
class WindowResponsibilityAnalyzer {
    private text: string;
    private found: ContextMatch[] = [];

    constructor(documentText: string) {
        this.text = documentText;
    }
    
    analyzeWindowResponsibility(): AnalysisResult {
        const windowPatterns = [
            // Direct window mentions
            /windows?.*(?:repair|maintain|replace|responsible)/gi,
            /(?:repair|maintain|replace).*windows?/gi,
            
            // Demise definitions
            /demised premises.*include.*windows?/gi,
            /(?:flat|apartment|unit).*includes?.*windows?/gi,
            
            // Exclusions from demise
            /(?:structure|external|outside).*(?:including|comprises).*windows?/gi,
            /windows?.*(?:part of|form part).*(?:structure|building)/gi,
            
            // Schedule references
            /schedule.*(?:landlord|tenant).*windows?/gi,
            /windows?.*schedule.*(?:repairs|maintenance)/gi,
            
            // Frame vs glass distinctions
            /window frames?.*(?:landlord|tenant|structure)/gi,
            /window glass.*(?:landlord|tenant|lessee)/gi,
            
            // Insurance clauses
            /(?:insure|insurance).*windows?/gi,
            /windows?.*(?:covered by|under).*insurance/gi
        ];
        
        for (const pattern of windowPatterns) {
            const matches = [...this.text.matchAll(pattern)];
            matches.forEach(match => {
                this.found.push({
                    text: this.extractContext(match.index!, 150),
                    type: this.categorizeWindowClause(match[0]),
                    confidence: this.scoreMatch(match[0]),
                    index: match.index!
                });
            });
        }
        
        return this.synthesizeWindowAnalysis();
    }
    
    private extractContext(index: number, length: number) {
        const start = Math.max(0, index - length);
        const end = Math.min(this.text.length, index + length);
        const context = this.text.slice(start, end);
        
        // Find clause reference
        const clauseRef = context.match(/(?:clause|paragraph|schedule)\s*(\d+(?:\.\d+)*)/i);
        
        return {
            text: context.trim(),
            clauseRef: clauseRef ? clauseRef[1] : null,
            fullContext: this.text.slice(Math.max(0, index - 300), Math.min(this.text.length, index + 300))
        };
    }
    
    private categorizeWindowClause(matchText: string): string {
        const lower = matchText.toLowerCase();
        if (lower.includes('landlord') || lower.includes('lessor')) return 'landlord_responsibility';
        if (lower.includes('tenant') || lower.includes('lessee')) return 'tenant_responsibility';
        if (lower.includes('structure') || lower.includes('external')) return 'structural_element';
        if (lower.includes('demise') || lower.includes('include')) return 'demise_definition';
        return 'unclear';
    }
    
    private scoreMatch(matchText: string): number {
        let score = 30; // Base score for finding window reference
        
        if (/\b(?:shall|will|responsible)\b/i.test(matchText)) score += 25;
        if (/\b(?:clause|schedule|paragraph)\b/i.test(matchText)) score += 20;
        if (/\b(?:landlord|tenant|lessee|lessor)\b/i.test(matchText)) score += 20;
        if (/\b(?:repair|maintain|replace)\b/i.test(matchText)) score += 15;
        if (/\b(?:external|internal|structure)\b/i.test(matchText)) score += 10;
        
        return Math.min(score, 90);
    }
    
    private synthesizeWindowAnalysis(): AnalysisResult {
        if (this.found.length === 0) {
            return {
                answer: "No specific references to window responsibilities found in the extracted text.",
                confidence: 15,
                confidenceLabel: getConfidenceLabel(15),
                citations: [],
                practicalAdvice: [],
                nextSteps: ["Check if the full lease document was properly extracted, particularly any schedules or repair covenants."]
            };
        }
        
        // Sort by confidence
        this.found.sort((a, b) => b.confidence - a.confidence);
        const bestMatches = this.found.slice(0, 3);
        
        const answer = this.generateWindowAnswer(bestMatches);
        const citations = this.formatCitations(bestMatches);
        const confidence = this.calculateOverallConfidence(bestMatches);
        
        return {
            answer,
            citations,
            confidence: validateConfidence(confidence),
            confidenceLabel: getConfidenceLabel(validateConfidence(confidence)),
            practicalAdvice: generatePracticalAdvice({ confidence, answer, analysisType: 'window_responsibility' }),
            supportingClauses: bestMatches.length,
            analysisType: 'window_responsibility'
        };
    }
    
    private generateWindowAnswer(matches: ContextMatch[]): string {
        const landlordResp = matches.filter(m => m.type === 'landlord_responsibility');
        const tenantResp = matches.filter(m => m.type === 'tenant_responsibility');
        const structural = matches.filter(m => m.type === 'structural_element');
        
        if (landlordResp.length > 0) {
            return "The landlord is responsible for window repairs and maintenance.";
        }
        
        if (tenantResp.length > 0) {
            return "The tenant is responsible for window repairs and maintenance.";
        }
        
        if (structural.length > 0) {
            return "Windows appear to be treated as structural elements, typically indicating landlord responsibility.";
        }
        
        return "Window responsibility is defined in the lease but requires specific clause review.";
    }
    
    private formatCitations(matches: ContextMatch[]): string[] {
        return matches
            .filter(m => m.text.clauseRef)
            .map(m => `Clause ${m.text.clauseRef}: "${m.text.text.substring(0, 80)}..."`)
            .slice(0, 3); // Limit to top 3 citations
    }
    
    private calculateOverallConfidence(matches: ContextMatch[]): number {
        if (matches.length === 0) return 15;
        
        const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
        const consensusBonus = matches.length > 1 ? 10 : 0;
        
        return Math.min(85, Math.round(avgConfidence + consensusBonus));
    }
}

// 3. REPAIR RESPONSIBILITY ANALYZER
class RepairResponsibilityAnalyzer {
    private text: string;
    private found: ContextMatch[] = [];

    constructor(documentText: string) {
        this.text = documentText;
    }

    analyzeRepairResponsibility(): AnalysisResult {
        const repairPatterns = [
            /(?:landlord|lessor).*(?:shall|will|responsible).*(?:repair|maintain)/gi,
            /(?:tenant|lessee).*(?:shall|will|responsible).*(?:repair|maintain)/gi,
            /(?:repair|maintain).*(?:landlord|lessor|tenant|lessee)/gi,
            /structure.*repair.*(?:landlord|lessor)/gi,
            /internal.*repair.*(?:tenant|lessee)/gi,
            /common parts.*(?:repair|maintain)/gi,
            /service charge.*(?:repair|maintenance)/gi
        ];

        for (const pattern of repairPatterns) {
            const matches = [...this.text.matchAll(pattern)];
            matches.forEach(match => {
                this.found.push({
                    text: this.extractContext(match.index!, 150),
                    type: this.categorizeRepairClause(match[0]),
                    confidence: this.scoreRepairMatch(match[0]),
                    index: match.index!
                });
            });
        }

        return this.synthesizeRepairAnalysis();
    }

    private extractContext(index: number, length: number) {
        const start = Math.max(0, index - length);
        const end = Math.min(this.text.length, index + length);
        const context = this.text.slice(start, end);
        
        const clauseRef = context.match(/(?:clause|paragraph|schedule)\s*(\d+(?:\.\d+)*)/i);
        
        return {
            text: context.trim(),
            clauseRef: clauseRef ? clauseRef[1] : null,
            fullContext: this.text.slice(Math.max(0, index - 300), Math.min(this.text.length, index + 300))
        };
    }

    private categorizeRepairClause(matchText: string): string {
        const lower = matchText.toLowerCase();
        if (lower.includes('landlord') || lower.includes('lessor')) return 'landlord_responsibility';
        if (lower.includes('tenant') || lower.includes('lessee')) return 'tenant_responsibility';
        if (lower.includes('structure') || lower.includes('common')) return 'structural_repairs';
        if (lower.includes('service charge')) return 'service_charge_funded';
        return 'general_repair';
    }

    private scoreRepairMatch(matchText: string): number {
        let score = 35;
        
        if (/\b(?:shall|will|must|responsible)\b/i.test(matchText)) score += 25;
        if (/\b(?:clause|schedule|paragraph)\b/i.test(matchText)) score += 15;
        if (/\b(?:structure|common parts)\b/i.test(matchText)) score += 15;
        if (/\b(?:internal|external)\b/i.test(matchText)) score += 10;
        
        return Math.min(score, 90);
    }

    private synthesizeRepairAnalysis(): AnalysisResult {
        if (this.found.length === 0) {
            return {
                answer: "No specific repair responsibilities found in the extracted text.",
                confidence: 15,
                confidenceLabel: getConfidenceLabel(15),
                citations: [],
                practicalAdvice: ["Review the full lease document for repair covenant clauses"],
                analysisType: 'repair_responsibility'
            };
        }

        this.found.sort((a, b) => b.confidence - a.confidence);
        const bestMatches = this.found.slice(0, 3);

        const answer = this.generateRepairAnswer(bestMatches);
        const citations = this.formatRepairCitations(bestMatches);
        const confidence = this.calculateRepairConfidence(bestMatches);

        return {
            answer,
            citations,
            confidence: validateConfidence(confidence),
            confidenceLabel: getConfidenceLabel(validateConfidence(confidence)),
            practicalAdvice: generatePracticalAdvice({ confidence, answer, analysisType: 'repair_responsibility' }),
            supportingClauses: bestMatches.length,
            analysisType: 'repair_responsibility'
        };
    }

    private generateRepairAnswer(matches: ContextMatch[]): string {
        const landlordResp = matches.filter(m => m.type === 'landlord_responsibility');
        const tenantResp = matches.filter(m => m.type === 'tenant_responsibility');
        const structural = matches.filter(m => m.type === 'structural_repairs');

        let answer = "";
        
        if (landlordResp.length > 0) {
            answer += "The landlord is responsible for certain repairs. ";
        }
        if (tenantResp.length > 0) {
            answer += "The tenant has specific repair obligations. ";
        }
        if (structural.length > 0) {
            answer += "Structural repairs are typically the landlord's responsibility. ";
        }

        return answer || "Repair responsibilities are outlined in the lease but require detailed review.";
    }

    private formatRepairCitations(matches: ContextMatch[]): string[] {
        return matches
            .filter(m => m.text.clauseRef)
            .map(m => `Clause ${m.text.clauseRef}: "${m.text.text.substring(0, 80)}..."`)
            .slice(0, 3);
    }

    private calculateRepairConfidence(matches: ContextMatch[]): number {
        if (matches.length === 0) return 15;
        
        const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
        const consensusBonus = matches.length > 1 ? 10 : 0;
        
        return Math.min(85, Math.round(avgConfidence + consensusBonus));
    }
}

// 4. GENERAL LEASE ANALYZER
class GeneralLeaseAnalyzer {
    private text: string;

    constructor(documentText: string) {
        this.text = documentText;
    }

    async analyzeGeneral(question: string): Promise<AnalysisResult> {
        const keywords = this.extractKeywords(question);
        const found: ContextMatch[] = [];

        // Search for keywords in context
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = [...this.text.matchAll(regex)];
            
            matches.forEach(match => {
                found.push({
                    text: this.extractContext(match.index!, 200),
                    type: 'keyword_match',
                    confidence: this.scoreKeywordMatch(keyword, match[0]),
                    index: match.index!
                });
            });
        }

        return this.synthesizeGeneralAnalysis(found, question);
    }

    private extractKeywords(question: string): string[] {
        const stopWords = ['who', 'what', 'when', 'where', 'how', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return question.toLowerCase()
            .split(/\s+/)
            .filter(word => !stopWords.includes(word) && word.length > 2)
            .slice(0, 5); // Limit to 5 most important keywords
    }

    private extractContext(index: number, length: number) {
        const start = Math.max(0, index - length);
        const end = Math.min(this.text.length, index + length);
        const context = this.text.slice(start, end);
        
        const clauseRef = context.match(/(?:clause|paragraph|schedule)\s*(\d+(?:\.\d+)*)/i);
        
        return {
            text: context.trim(),
            clauseRef: clauseRef ? clauseRef[1] : null,
            fullContext: this.text.slice(Math.max(0, index - 300), Math.min(this.text.length, index + 300))
        };
    }

    private scoreKeywordMatch(keyword: string, context: string): number {
        let score = 25; // Base score
        
        if (/\b(?:shall|will|must|responsible)\b/i.test(context)) score += 20;
        if (/\b(?:clause|schedule|paragraph)\b/i.test(context)) score += 15;
        if (/\b(?:landlord|tenant|lessee|lessor)\b/i.test(context)) score += 15;
        
        return Math.min(score, 80);
    }

    private synthesizeGeneralAnalysis(found: ContextMatch[], question: string): AnalysisResult {
        if (found.length === 0) {
            return {
                answer: `No specific information about "${question}" found in the extracted lease text.`,
                confidence: 10,
                confidenceLabel: getConfidenceLabel(10),
                citations: [],
                practicalAdvice: ["Consider reviewing the original lease document manually"],
                analysisType: 'general'
            };
        }

        found.sort((a, b) => b.confidence - a.confidence);
        const bestMatches = found.slice(0, 3);

        const answer = `The lease contains ${bestMatches.length} relevant reference${bestMatches.length > 1 ? 's' : ''} to your question. Review the supporting clauses for detailed information.`;
        const citations = this.formatGeneralCitations(bestMatches);
        const confidence = this.calculateGeneralConfidence(bestMatches);

        return {
            answer,
            citations,
            confidence: validateConfidence(confidence),
            confidenceLabel: getConfidenceLabel(validateConfidence(confidence)),
            practicalAdvice: generatePracticalAdvice({ confidence, answer, analysisType: 'general' }),
            supportingClauses: bestMatches.length,
            analysisType: 'general'
        };
    }

    private formatGeneralCitations(matches: ContextMatch[]): string[] {
        return matches
            .filter(m => m.text.clauseRef)
            .map(m => `Clause ${m.text.clauseRef}: "${m.text.text.substring(0, 80)}..."`)
            .slice(0, 3);
    }

    private calculateGeneralConfidence(matches: ContextMatch[]): number {
        if (matches.length === 0) return 10;
        
        const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
        const matchBonus = matches.length * 5;
        
        return Math.min(75, Math.round(avgConfidence + matchBonus));
    }
}

// 3. CLEAN RESPONSE FORMATTER (NO JSON ARTIFACTS)
function formatCleanResponse(analysis: any): AnalysisResult {
    // Remove any JSON wrapper nonsense
    const cleanAnswer = analysis.answer.replace(/```json\s*{[^}]*}?\s*```/g, '').trim();
    
    return {
        answer: cleanAnswer,
        confidence: validateConfidence(analysis.confidence),
        confidenceLabel: getConfidenceLabel(validateConfidence(analysis.confidence)),
        citations: Array.isArray(analysis.citations) ? analysis.citations : [],
        practicalAdvice: generatePracticalAdvice(analysis),
        nextSteps: suggestNextSteps(analysis),
        analysisType: analysis.analysisType,
        supportingClauses: analysis.supportingClauses,
        documentMetadata: analysis.documentMetadata
    };
}

function getConfidenceLabel(confidence: number): string {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Medium Confidence';
    if (confidence >= 40) return 'Low Confidence';
    return 'Very Low Confidence';
}

// 4. PRACTICAL ADVICE GENERATOR
function generatePracticalAdvice(analysis: any): string[] {
    const advice: string[] = [];
    
    if (analysis.confidence < 60) {
        advice.push("Consider reviewing the original lease document manually for complete details.");
    }
    
    if (analysis.analysisType === 'window_responsibility') {
        if (analysis.answer.includes('landlord')) {
            advice.push("Report window issues to the management company or landlord.");
            advice.push("Ensure window repairs are included in the service charge budget.");
        } else if (analysis.answer.includes('tenant')) {
            advice.push("Budget for window maintenance as part of property ownership costs.");
            advice.push("Consider window insurance as part of contents coverage.");
        }
    }
    
    if (analysis.analysisType === 'repair_responsibility') {
        advice.push("Keep records of all repair requests and communications.");
        advice.push("Understand the distinction between structural and internal repairs.");
    }
    
    return advice;
}

function suggestNextSteps(analysis: any): string[] {
    const steps: string[] = [];
    
    if (analysis.confidence < 50) {
        steps.push("Request a clearer scan of the lease document");
        steps.push("Check if all pages and schedules were included");
    }
    
    if (analysis.supportingClauses && analysis.supportingClauses < 2) {
        steps.push("Look for additional relevant clauses in the full document");
    }
    
    steps.push("Consult with a property law specialist if clarification is needed");
    
    return steps;
}

// 5. COMPLETE QUESTION PROCESSOR
export async function processLeaseQuestionRobustly(question: string, documentText: string): Promise<AnalysisResult> {
    try {
        const questionType = identifyQuestionType(question);
        let analyzer;
        
        switch (questionType) {
            case 'windows':
                analyzer = new WindowResponsibilityAnalyzer(documentText);
                return analyzer.analyzeWindowResponsibility();
                
            case 'repairs':
                analyzer = new RepairResponsibilityAnalyzer(documentText);
                return analyzer.analyzeRepairResponsibility();
                
            case 'general':
            default:
                analyzer = new GeneralLeaseAnalyzer(documentText);
                return await analyzer.analyzeGeneral(question);
        }
        
    } catch (error) {
        return {
            answer: "Analysis failed due to processing error.",
            confidence: 0,
            confidenceLabel: 'Analysis Failed',
            citations: [],
            practicalAdvice: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

function identifyQuestionType(question: string): string {
    const q = question.toLowerCase();
    
    if (q.includes('window')) return 'windows';
    if (q.includes('repair') && (q.includes('tenant') || q.includes('landlord'))) return 'repairs';
    if (q.includes('service charge') || q.includes('maintenance charge')) return 'service_charge';
    if (q.includes('alter') || q.includes('change') || q.includes('modify')) return 'alterations';
    
    return 'general';
}

// 6. MAIN FIXED HANDLER
export async function handleLeaseQuestionFixed(question: string, documentText: string): Promise<AnalysisResult> {
    try {
        console.log(`🔍 Analyzing question: "${question}"`);
        
        // Analyze the specific question
        const rawAnalysis = await processLeaseQuestionRobustly(question, documentText);
        
        // Format clean response (NO JSON ARTIFACTS!)
        const cleanResponse = formatCleanResponse(rawAnalysis);
        
        console.log(`✅ Analysis complete with ${cleanResponse.confidence}% confidence`);
        
        return cleanResponse;
        
    } catch (error) {
        console.error('❌ Lease analysis failed:', error);
        
        return {
            answer: "Unable to analyze the lease document. Please ensure the file is clear and readable.",
            confidence: 0,
            confidenceLabel: 'Analysis Failed',
            citations: [],
            practicalAdvice: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            nextSteps: ["Try uploading a higher quality scan or different file format."]
        };
    }
}

export default {
    handleLeaseQuestionFixed,
    processLeaseQuestionRobustly,
    validateConfidence,
    getConfidenceLabel
};