// lib/document-analysis/lease-clause-indexer.ts
// LEASE CLAUSE INDEX & SUMMARY FEATURE

interface LeaseClause {
  number: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
  startIndex: number;
  type: 'main_clause' | 'schedule' | 'covenant' | 'definition' | 'special_provision';
  subsections?: LeaseClause[];
  obligations?: string[];
  terms?: string[];
}

interface ClauseSummary {
  totalClauses: number;
  mainClauses: number;
  schedules: number;
  covenants: number;
  definitions: number;
  categories: Record<string, number>;
  importance: {
    high: number;
    medium: number;
    low: number;
  };
}

// 1. COMPREHENSIVE CLAUSE EXTRACTOR
export class LeaseClauseIndexer {
  private text: string;
  public clauses: LeaseClause[] = [];
  public schedules: LeaseClause[] = [];
  public covenants: LeaseClause[] = [];
  public definitions: LeaseClause[] = [];
  
  constructor(documentText: string) {
    this.text = documentText;
    this.extractAllSections();
  }
  
  private extractAllSections(): void {
    // Extract main numbered clauses
    this.extractMainClauses();
    
    // Extract schedules
    this.extractSchedules();
    
    // Extract covenant sections
    this.extractCovenants();
    
    // Extract definitions
    this.extractDefinitions();
    
    // Extract special provisions
    this.extractSpecialProvisions();
  }
  
  private extractMainClauses(): void {
    // Match various clause numbering formats: 1., 1.1, 1(a), etc.
    const clausePatterns = [
      /(?:^|\n)\s*(\d+(?:\.\d+)*)\s*\.?\s+([^.\n]{20,800})/gm,
      /(?:^|\n)\s*(\d+)\s*\(\s*([a-z])\s*\)\s+([^.\n]{20,800})/gm,
      /(?:^|\n)\s*(Clause\s+\d+(?:\.\d+)*)\s*[-:]?\s*([^.\n]{20,800})/gmi
    ];
    
    clausePatterns.forEach(pattern => {
      const matches = [...this.text.matchAll(pattern)];
      matches.forEach(match => {
        const clauseNumber = match[1];
        const clauseText = (match[2] || match[3] || '').trim();
        
        if (clauseText.length > 10) {
          this.clauses.push({
            number: clauseNumber,
            title: this.extractClauseTitle(clauseText),
            content: clauseText,
            summary: this.generateClauseSummary(clauseText),
            category: this.categorizeClause(clauseText),
            importance: this.assessImportance(clauseText),
            startIndex: match.index || 0,
            type: 'main_clause'
          });
        }
      });
    });
    
    // Remove duplicates and sort
    this.clauses = this.removeDuplicates(this.clauses);
    this.clauses.sort((a, b) => this.compareClauseNumbers(a.number, b.number));
  }
  
  private extractSchedules(): void {
    // Find schedule headers and content
    const schedulePattern = /(schedule\s+(?:[ivx]+|\d+)[^a-z]*?)(?=schedule|\n\n\n|\Z)/gis;
    const matches = [...this.text.matchAll(schedulePattern)];
    
    matches.forEach((match, index) => {
      const scheduleContent = match[1].trim();
      const scheduleTitle = this.extractScheduleTitle(scheduleContent);
      
      this.schedules.push({
        number: `Schedule ${this.romanToNumber(scheduleTitle) || index + 1}`,
        title: scheduleTitle,
        content: scheduleContent,
        summary: this.generateScheduleSummary(scheduleContent),
        category: this.categorizeSchedule(scheduleContent),
        importance: this.assessImportance(scheduleContent),
        startIndex: match.index || 0,
        type: 'schedule',
        subsections: this.extractScheduleSubsections(scheduleContent)
      });
    });
  }
  
  private extractCovenants(): void {
    const covenantPatterns = [
      /(landlord.*covenants?.*?)(?=tenant|schedule|\n\n)/gis,
      /(tenant.*covenants?.*?)(?=landlord|schedule|\n\n)/gis,
      /(lessor.*covenants?.*?)(?=lessee|schedule|\n\n)/gis,
      /(lessee.*covenants?.*?)(?=lessor|schedule|\n\n)/gis
    ];
    
    covenantPatterns.forEach(pattern => {
      const matches = [...this.text.matchAll(pattern)];
      matches.forEach(match => {
        const covenantText = match[1].trim();
        const party = this.identifyCovenantParty(covenantText);
        
        this.covenants.push({
          number: `${party}-covenant`,
          title: `${party} Covenants`,
          content: covenantText,
          summary: this.generateCovenantSummary(covenantText),
          category: 'covenant',
          importance: 'high' as const,
          startIndex: match.index || 0,
          type: 'covenant',
          obligations: this.extractObligations(covenantText)
        });
      });
    });
  }
  
  private extractDefinitions(): void {
    const definitionPatterns = [
      /(definitions?.*?)(?=\n\d+\.|\nschedule|\nthe lessor)/gis,
      /(".*?".*?means.*?)(?="|$)/gis
    ];
    
    definitionPatterns.forEach(pattern => {
      const matches = [...this.text.matchAll(pattern)];
      matches.forEach(match => {
        const definitionText = match[1].trim();
        
        this.definitions.push({
          number: 'definitions',
          title: 'Definitions',
          content: definitionText,
          summary: this.generateDefinitionSummary(definitionText),
          category: 'definition',
          importance: 'medium' as const,
          startIndex: match.index || 0,
          type: 'definition',
          terms: this.extractDefinedTerms(definitionText)
        });
      });
    });
  }
  
  private extractSpecialProvisions(): void {
    const specialTerms = [
      'break clause', 'rent review', 'service charge', 'insurance',
      'assignment', 'subletting', 'user covenant', 'repair', 'forfeiture'
    ];
    
    specialTerms.forEach(term => {
      const pattern = new RegExp(`(.*${term}.*?)(?=\\n\\d+\\.|\\nschedule|\\n\\n)`, 'gis');
      const matches = [...this.text.matchAll(pattern)];
      
      matches.forEach(match => {
        const content = match[1].trim();
        if (content.length > 50) {
          this.clauses.push({
            number: `Special - ${term}`,
            title: this.capitalizeFirst(term),
            content: content,
            summary: this.generateSpecialProvisionSummary(content, term),
            category: 'special',
            importance: 'high' as const,
            startIndex: match.index || 0,
            type: 'special_provision'
          });
        }
      });
    });
  }
  
  // HELPER METHODS FOR CONTENT ANALYSIS
  
  private extractClauseTitle(text: string): string {
    // Extract first meaningful phrase as title
    const sentences = text.split(/[.;]/);
    const title = sentences[0].trim();
    return title.length > 5 && title.length < 80 ? title : this.generateTitleFromContent(text);
  }
  
  private generateTitleFromContent(text: string): string {
    const keywords = this.extractKeywords(text);
    return keywords.slice(0, 3).map(this.capitalizeFirst).join(' ');
  }
  
  private generateClauseSummary(text: string): string {
    const lower = text.toLowerCase();
    
    if (lower.includes('rent') && lower.includes('payment')) {
      return 'Rent payment obligations and timing';
    }
    if (lower.includes('repair') && lower.includes('maintain')) {
      return 'Repair and maintenance responsibilities';
    }
    if (lower.includes('service charge')) {
      return 'Service charge calculation and payment terms';
    }
    if (lower.includes('use') && lower.includes('premises')) {
      return 'Permitted use of the premises';
    }
    if (lower.includes('assign') || lower.includes('underlet')) {
      return 'Assignment and subletting restrictions';
    }
    if (lower.includes('alter') || lower.includes('improve')) {
      return 'Alteration and improvement provisions';
    }
    if (lower.includes('insurance')) {
      return 'Insurance obligations and coverage';
    }
    if (lower.includes('notice')) {
      return 'Notice requirements and procedures';
    }
    if (lower.includes('breach') || lower.includes('default')) {
      return 'Breach and default provisions';
    }
    
    // Generate summary from first sentence
    const firstSentence = text.split(/[.!?]/)[0];
    return firstSentence.length > 10 ? this.simplifyLanguage(firstSentence) : 'General lease provision';
  }
  
  private generateScheduleSummary(content: string): string {
    const lower = content.toLowerCase();
    
    if (lower.includes('landlord') && lower.includes('covenant')) {
      return 'Landlord obligations and responsibilities';
    }
    if (lower.includes('tenant') && lower.includes('covenant')) {
      return 'Leaseholder obligations and responsibilities';
    }
    if (lower.includes('service charge')) {
      return 'Service charge components and calculation';
    }
    if (lower.includes('insurance')) {
      return 'Insurance requirements and coverage details';
    }
    if (lower.includes('repair')) {
      return 'Repair and maintenance specifications';
    }
    
    return 'Additional lease terms and conditions';
  }
  
  private generateCovenantSummary(covenantText: string): string {
    const lower = covenantText.toLowerCase();
    
    if (lower.includes('repair')) return 'Repair and maintenance covenant';
    if (lower.includes('insurance')) return 'Insurance covenant';
    if (lower.includes('use')) return 'Use and occupation covenant';
    if (lower.includes('assign')) return 'Assignment and subletting covenant';
    
    return 'General covenant obligations';
  }
  
  private generateDefinitionSummary(definitionText: string): string {
    const termCount = (definitionText.match(/means/gi) || []).length;
    return `Definitions section containing ${termCount} defined terms`;
  }
  
  private generateSpecialProvisionSummary(content: string, term: string): string {
    return `Special provision relating to ${term}`;
  }
  
  private categorizeClause(text: string): string {
    const lower = text.toLowerCase();
    
    if (lower.includes('rent') || lower.includes('payment')) return 'financial';
    if (lower.includes('repair') || lower.includes('maintain')) return 'maintenance';
    if (lower.includes('use') || lower.includes('occupation')) return 'use_restrictions';
    if (lower.includes('assign') || lower.includes('sublet')) return 'assignment';
    if (lower.includes('alter') || lower.includes('improve')) return 'alterations';
    if (lower.includes('service charge')) return 'service_charges';
    if (lower.includes('insurance')) return 'insurance';
    if (lower.includes('notice')) return 'notices';
    if (lower.includes('breach') || lower.includes('forfeiture')) return 'enforcement';
    
    return 'general';
  }
  
  private categorizeSchedule(content: string): string {
    const lower = content.toLowerCase();
    
    if (lower.includes('repair')) return 'maintenance';
    if (lower.includes('service charge')) return 'service_charges';
    if (lower.includes('insurance')) return 'insurance';
    if (lower.includes('covenant')) return 'covenants';
    
    return 'schedule';
  }
  
  private assessImportance(text: string): 'high' | 'medium' | 'low' {
    const criticalTerms = ['rent', 'service charge', 'repair', 'forfeiture', 'break', 'review'];
    const importantTerms = ['use', 'insurance', 'assign', 'alter', 'notice'];
    
    const lower = text.toLowerCase();
    
    if (criticalTerms.some(term => lower.includes(term))) return 'high';
    if (importantTerms.some(term => lower.includes(term))) return 'medium';
    
    return 'low';
  }
  
  // UTILITY METHODS
  
  private removeDuplicates(items: LeaseClause[]): LeaseClause[] {
    const seen = new Set();
    return items.filter(item => {
      const key = `${item.number}-${item.content?.substring(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private compareClauseNumbers(a: string, b: string): number {
    const numA = parseFloat(a.replace(/[^\d.]/g, '')) || 0;
    const numB = parseFloat(b.replace(/[^\d.]/g, '')) || 0;
    return numA - numB;
  }
  
  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'shall', 'will'];
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5);
  }
  
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  private simplifyLanguage(text: string): string {
    return text
      .replace(/shall/gi, 'must')
      .replace(/pursuant to/gi, 'under')
      .replace(/notwithstanding/gi, 'despite')
      .replace(/hereinafter/gi, 'later')
      .replace(/aforementioned/gi, 'mentioned');
  }
  
  private extractScheduleTitle(content: string): string {
    const lines = content.split('\n');
    const titleLine = lines.find(line => line.toLowerCase().includes('schedule')) || lines[0];
    return titleLine.trim().substring(0, 100);
  }
  
  private extractScheduleSubsections(content: string): LeaseClause[] {
    // Extract subsections within schedules
    const subsections: LeaseClause[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.match(/^\s*\d+\.\s+/) && line.length > 20) {
        subsections.push({
          number: `${index + 1}`,
          title: line.substring(0, 50).trim(),
          content: line,
          summary: this.generateClauseSummary(line),
          category: 'subsection',
          importance: 'low',
          startIndex: 0,
          type: 'main_clause'
        });
      }
    });
    
    return subsections;
  }
  
  private identifyCovenantParty(covenantText: string): string {
    const lower = covenantText.toLowerCase();
    if (lower.includes('landlord') || lower.includes('lessor')) return 'Landlord';
    if (lower.includes('tenant') || lower.includes('lessee')) return 'Leaseholder';
    return 'Party';
  }
  
  private extractObligations(covenantText: string): string[] {
    const obligations: string[] = [];
    const sentences = covenantText.split(/[.;]/);
    
    sentences.forEach(sentence => {
      if (sentence.includes('shall') || sentence.includes('must') || sentence.includes('covenant')) {
        obligations.push(sentence.trim());
      }
    });
    
    return obligations.slice(0, 5); // Limit to first 5 obligations
  }
  
  private extractDefinedTerms(definitionText: string): string[] {
    const terms: string[] = [];
    const matches = definitionText.matchAll(/"([^"]+)"\s+means/gi);
    
    for (const match of matches) {
      terms.push(match[1]);
    }
    
    return terms;
  }
  
  private romanToNumber(roman: string): number | null {
    const romanMap: Record<string, number> = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5 };
    const match = roman.toLowerCase().match(/\b([ivx]+)\b/);
    return match ? romanMap[match[1]] || null : null;
  }
  
  // PUBLIC API METHODS
  
  public getAllClauses(): LeaseClause[] {
    return [...this.clauses, ...this.schedules, ...this.covenants, ...this.definitions]
      .sort((a, b) => a.startIndex - b.startIndex);
  }
  
  public getClausesByCategory(category: string): LeaseClause[] {
    return this.getAllClauses().filter(clause => clause.category === category);
  }
  
  public getClausesByImportance(importance: 'high' | 'medium' | 'low'): LeaseClause[] {
    return this.getAllClauses().filter(clause => clause.importance === importance);
  }
  
  public searchClauses(searchTerm: string): LeaseClause[] {
    const term = searchTerm.toLowerCase();
    return this.getAllClauses().filter(clause =>
      clause.title?.toLowerCase().includes(term) ||
      clause.summary?.toLowerCase().includes(term) ||
      clause.content?.toLowerCase().includes(term)
    );
  }
  
  public getClauseSummary(): ClauseSummary {
    const all = this.getAllClauses();
    
    return {
      totalClauses: all.length,
      mainClauses: this.clauses.length,
      schedules: this.schedules.length,
      covenants: this.covenants.length,
      definitions: this.definitions.length,
      categories: this.getCategoryBreakdown(),
      importance: this.getImportanceBreakdown()
    };
  }
  
  private getCategoryBreakdown(): Record<string, number> {
    const categories: Record<string, number> = {};
    this.getAllClauses().forEach(clause => {
      categories[clause.category] = (categories[clause.category] || 0) + 1;
    });
    return categories;
  }
  
  private getImportanceBreakdown(): { high: number; medium: number; low: number } {
    const importance = { high: 0, medium: 0, low: 0 };
    this.getAllClauses().forEach(clause => {
      importance[clause.importance] = (importance[clause.importance] || 0) + 1;
    });
    return importance;
  }
}

export type { LeaseClause, ClauseSummary };