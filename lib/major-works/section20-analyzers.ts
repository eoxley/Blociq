/**
 * Section 20 Major Works Analyzers
 * Specialized analyzers for detecting Section 20 consultation stages and extracting major works metadata
 */

export type Section20Stage =
  | 'notice_of_intention'
  | 'statement_of_estimates'
  | 'award_of_contract'
  | 'works_order'
  | 'other';

export type MajorWorksStatus =
  | 'planning'
  | 'notice_of_intention'
  | 'statement_of_estimates'
  | 'contractor_appointed'
  | 'works_in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export interface ContractorInfo {
  name: string;
  address?: string;
  contact?: string;
  estimatedCost?: number;
  description?: string;
}

export interface Section20AnalysisResult {
  stage: Section20Stage;
  projectStatus: MajorWorksStatus;
  buildingName?: string;
  projectTitle?: string;
  estimatedCost?: number;
  totalBudget?: number;
  contractors: ContractorInfo[];
  leaseholderContribution?: {
    amount?: number;
    percentage?: number;
    threshold?: number;
  };
  consultationPeriod?: {
    startDate?: string;
    endDate?: string;
    durationDays?: number;
  };
  workDetails: {
    scope?: string;
    location?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
  };
  timeline: {
    consultationDeadline?: string;
    worksStartDate?: string;
    estimatedCompletion?: string;
  };
  compliance: {
    section20Required: boolean;
    noticePeriodCompliant: boolean;
    estimatesRequired: boolean;
    leaseholderApprovalRequired: boolean;
  };
  extractedText: {
    keyPhrases: string[];
    importantDates: string[];
    financialFigures: string[];
  };
  confidence: number;
}

/**
 * Notice of Intention (Section 20 Stage 1) Analyzer
 */
export class NoticeOfIntentionAnalyzer {
  static analyze(text: string, filename: string): Section20AnalysisResult {
    const normalizedText = text.toLowerCase();
    const result: Section20AnalysisResult = {
      stage: 'notice_of_intention',
      projectStatus: 'notice_of_intention',
      contractors: [],
      workDetails: {},
      timeline: {},
      compliance: {
        section20Required: true,
        noticePeriodCompliant: false,
        estimatesRequired: true,
        leaseholderApprovalRequired: false
      },
      extractedText: {
        keyPhrases: [],
        importantDates: [],
        financialFigures: []
      },
      confidence: 0
    };

    // Notice of Intention indicators
    const noticeIndicators = [
      /notice\s+of\s+intention/gi,
      /proposed\s+major\s+works/gi,
      /section\s+20\s+notice/gi,
      /landlord\s+and\s+tenant\s+act/gi,
      /consultation\s+period/gi,
      /90\s+day\s+notice/gi
    ];

    let confidence = 0;
    noticeIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        confidence += 20;
        result.extractedText.keyPhrases.push(...matches);
      }
    });

    // Extract building name
    const buildingNamePatterns = [
      /building[:\s]*([A-Za-z\s]+)/gi,
      /property[:\s]*([A-Za-z\s]+)/gi,
      /estate[:\s]*([A-Za-z\s]+)/gi,
      /at\s+([A-Za-z\s,0-9]+(?:road|street|avenue|close|way|gardens|court|house|tower|block))/gi
    ];

    buildingNamePatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        result.buildingName = match[1].trim();
      }
    });

    // Extract project title/description
    const projectPatterns = [
      /works?\s+to\s+be\s+carried\s+out[:\s]*([^.]+)/gi,
      /proposed\s+works?[:\s]*([^.]+)/gi,
      /description\s+of\s+works?[:\s]*([^.]+)/gi
    ];

    projectPatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        result.projectTitle = match[1].trim();
        result.workDetails.scope = match[1].trim();
      }
    });

    // Extract consultation period
    const consultationPatterns = [
      /consultation\s+period[:\s]*(\d+)\s+days/gi,
      /90\s+day\s+notice/gi,
      /notice\s+expires?\s+on[:\s]*([^.]+)/gi
    ];

    consultationPatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match) {
        if (match[1] && /\d+/.test(match[1])) {
          result.consultationPeriod = {
            durationDays: parseInt(match[1])
          };
        }
      }
    });

    // Extract estimated costs
    const costPatterns = [
      /estimated\s+cost[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /total\s+cost[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /budget[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /£([0-9,]+(?:\.\d{2})?)/g
    ];

    const financialFigures: string[] = [];
    costPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1]) {
          const cost = parseFloat(match[1].replace(/,/g, ''));
          if (!result.estimatedCost || cost > result.estimatedCost) {
            result.estimatedCost = cost;
          }
          financialFigures.push(match[0]);
        }
      });
    });

    result.extractedText.financialFigures = financialFigures;

    // Extract dates
    const datePatterns = [
      /(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})/g,
      /(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{2,4})/gi
    ];

    const dates: string[] = [];
    datePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => dates.push(match[1]));
    });

    result.extractedText.importantDates = dates;

    // Set consultation deadline (90 days from notice date)
    if (dates.length > 0) {
      try {
        const noticeDate = new Date(dates[0]);
        const deadline = new Date(noticeDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        result.timeline.consultationDeadline = deadline.toISOString().split('T')[0];
        result.consultationPeriod = {
          ...result.consultationPeriod,
          startDate: noticeDate.toISOString().split('T')[0],
          endDate: deadline.toISOString().split('T')[0],
          durationDays: 90
        };
      } catch (error) {
        console.warn('Failed to parse notice date:', error);
      }
    }

    result.confidence = Math.min(100, confidence);
    return result;
  }
}

/**
 * Statement of Estimates (Section 20 Stage 2) Analyzer
 */
export class StatementOfEstimatesAnalyzer {
  static analyze(text: string, filename: string): Section20AnalysisResult {
    const normalizedText = text.toLowerCase();
    const result: Section20AnalysisResult = {
      stage: 'statement_of_estimates',
      projectStatus: 'statement_of_estimates',
      contractors: [],
      workDetails: {},
      timeline: {},
      compliance: {
        section20Required: true,
        noticePeriodCompliant: true,
        estimatesRequired: true,
        leaseholderApprovalRequired: true
      },
      extractedText: {
        keyPhrases: [],
        importantDates: [],
        financialFigures: []
      },
      confidence: 0
    };

    // Statement of Estimates indicators
    const estimateIndicators = [
      /statement\s+of\s+estimates?/gi,
      /contractor\s+estimates?/gi,
      /tender\s+response/gi,
      /quote\s+(?:from|by)/gi,
      /estimates?\s+received/gi,
      /second\s+stage\s+consultation/gi
    ];

    let confidence = 0;
    estimateIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        confidence += 15;
        result.extractedText.keyPhrases.push(...matches);
      }
    });

    // Extract contractors and estimates
    const contractorPatterns = [
      /contractor[:\s]*([A-Za-z\s&]+)(?:\s*-\s*)?£?([0-9,]+(?:\.\d{2})?)/gi,
      /quote\s+from[:\s]*([A-Za-z\s&]+)(?:\s*-\s*)?£?([0-9,]+(?:\.\d{2})?)/gi,
      /([A-Za-z\s&]+)\s+(?:ltd|limited|plc|contractors?)\s*[:\-]?\s*£([0-9,]+(?:\.\d{2})?)/gi
    ];

    contractorPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && match[2]) {
          const contractor: ContractorInfo = {
            name: match[1].trim(),
            estimatedCost: parseFloat(match[2].replace(/,/g, ''))
          };
          result.contractors.push(contractor);
        }
      });
    });

    // Calculate total budget from all estimates
    if (result.contractors.length > 0) {
      const costs = result.contractors.map(c => c.estimatedCost || 0);
      result.totalBudget = Math.max(...costs);
      result.estimatedCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length; // Average
    }

    // Extract leaseholder contribution information
    const contributionPatterns = [
      /leaseholder\s+contribution[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /your\s+contribution[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /service\s+charge\s+levy[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /(\d+(?:\.\d+)?)%\s+of\s+total\s+cost/gi
    ];

    contributionPatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        if (pattern.source.includes('%')) {
          result.leaseholderContribution = {
            ...result.leaseholderContribution,
            percentage: parseFloat(match[1])
          };
        } else {
          result.leaseholderContribution = {
            ...result.leaseholderContribution,
            amount: parseFloat(match[1].replace(/,/g, ''))
          };
        }
      }
    });

    result.confidence = Math.min(100, confidence + (result.contractors.length * 10));
    return result;
  }
}

/**
 * Award of Contract/Works Order Analyzer
 */
export class AwardOfContractAnalyzer {
  static analyze(text: string, filename: string): Section20AnalysisResult {
    const normalizedText = text.toLowerCase();
    const result: Section20AnalysisResult = {
      stage: 'award_of_contract',
      projectStatus: 'contractor_appointed',
      contractors: [],
      workDetails: {},
      timeline: {},
      compliance: {
        section20Required: true,
        noticePeriodCompliant: true,
        estimatesRequired: true,
        leaseholderApprovalRequired: true
      },
      extractedText: {
        keyPhrases: [],
        importantDates: [],
        financialFigures: []
      },
      confidence: 0
    };

    // Award of Contract indicators
    const awardIndicators = [
      /award\s+of\s+contract/gi,
      /contractor\s+appointed/gi,
      /works?\s+order/gi,
      /successful\s+tenderer/gi,
      /appointment\s+of\s+contractor/gi,
      /contract\s+awarded\s+to/gi,
      /works?\s+to\s+commence/gi
    ];

    let confidence = 0;
    awardIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        confidence += 20;
        result.extractedText.keyPhrases.push(...matches);
      }
    });

    // Extract appointed contractor
    const appointedContractorPatterns = [
      /appointed\s+contractor[:\s]*([A-Za-z\s&]+)/gi,
      /contract\s+awarded\s+to[:\s]*([A-Za-z\s&]+)/gi,
      /successful\s+tenderer[:\s]*([A-Za-z\s&]+)/gi
    ];

    appointedContractorPatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        const contractor: ContractorInfo = {
          name: match[1].trim()
        };
        result.contractors.push(contractor);
      }
    });

    // Extract contract value
    const contractValuePatterns = [
      /contract\s+value[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /total\s+contract\s+sum[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi,
      /final\s+cost[:\s]*£?([0-9,]+(?:\.\d{2})?)/gi
    ];

    contractValuePatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        result.estimatedCost = parseFloat(match[1].replace(/,/g, ''));
        if (result.contractors.length > 0) {
          result.contractors[0].estimatedCost = result.estimatedCost;
        }
      }
    });

    // Extract works start date
    const worksStartPatterns = [
      /works?\s+to\s+commence[:\s]*on\s+([^.]+)/gi,
      /start\s+date[:\s]*([^.]+)/gi,
      /commencement\s+date[:\s]*([^.]+)/gi
    ];

    worksStartPatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        result.timeline.worksStartDate = match[1].trim();
        result.workDetails.startDate = match[1].trim();
      }
    });

    // Extract duration
    const durationPatterns = [
      /duration[:\s]*(\d+)\s+(?:weeks?|months?)/gi,
      /expected\s+completion[:\s]*([^.]+)/gi
    ];

    durationPatterns.forEach(pattern => {
      const match = pattern.exec(text);
      if (match && match[1]) {
        if (/\d+/.test(match[1])) {
          result.workDetails.duration = match[1].trim();
        } else {
          result.timeline.estimatedCompletion = match[1].trim();
        }
      }
    });

    result.confidence = Math.min(100, confidence + (result.contractors.length * 15));
    return result;
  }
}

/**
 * Main Section 20 Analyzer - Routes to appropriate stage analyzer
 */
export class Section20Analyzer {
  static analyze(
    text: string,
    filename: string,
    aiSummary?: any
  ): Section20AnalysisResult {
    const normalizedText = text.toLowerCase();
    const normalizedFilename = filename.toLowerCase();

    // Determine stage based on content analysis
    let stage: Section20Stage = 'other';

    // Stage detection patterns
    if (this.isNoticeOfIntention(normalizedText, normalizedFilename)) {
      stage = 'notice_of_intention';
    } else if (this.isStatementOfEstimates(normalizedText, normalizedFilename)) {
      stage = 'statement_of_estimates';
    } else if (this.isAwardOfContract(normalizedText, normalizedFilename)) {
      stage = 'award_of_contract';
    }

    // Route to appropriate analyzer
    switch (stage) {
      case 'notice_of_intention':
        return NoticeOfIntentionAnalyzer.analyze(text, filename);
      case 'statement_of_estimates':
        return StatementOfEstimatesAnalyzer.analyze(text, filename);
      case 'award_of_contract':
        return AwardOfContractAnalyzer.analyze(text, filename);
      default:
        return this.genericMajorWorksAnalysis(text, filename);
    }
  }

  private static isNoticeOfIntention(text: string, filename: string): boolean {
    const indicators = [
      'notice of intention',
      'proposed major works',
      'section 20 notice',
      '90 day notice',
      'consultation period'
    ];

    return indicators.some(indicator =>
      text.includes(indicator) || filename.includes(indicator.replace(/\s/g, '_'))
    );
  }

  private static isStatementOfEstimates(text: string, filename: string): boolean {
    const indicators = [
      'statement of estimates',
      'contractor estimates',
      'tender response',
      'second stage consultation',
      'quotes received'
    ];

    return indicators.some(indicator =>
      text.includes(indicator) || filename.includes(indicator.replace(/\s/g, '_'))
    );
  }

  private static isAwardOfContract(text: string, filename: string): boolean {
    const indicators = [
      'award of contract',
      'contractor appointed',
      'works order',
      'successful tenderer',
      'contract awarded'
    ];

    return indicators.some(indicator =>
      text.includes(indicator) || filename.includes(indicator.replace(/\s/g, '_'))
    );
  }

  private static genericMajorWorksAnalysis(text: string, filename: string): Section20AnalysisResult {
    return {
      stage: 'other',
      projectStatus: 'planning',
      contractors: [],
      workDetails: {},
      timeline: {},
      compliance: {
        section20Required: false,
        noticePeriodCompliant: false,
        estimatesRequired: false,
        leaseholderApprovalRequired: false
      },
      extractedText: {
        keyPhrases: [],
        importantDates: [],
        financialFigures: []
      },
      confidence: 30 // Basic confidence for generic major works document
    };
  }
}