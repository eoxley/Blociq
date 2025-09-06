import { LeaseSummary, ClauseIndexItem, Source } from '../contracts/leaseSummary';

// Answer template types
export interface LeaseAnswer {
  answer: string;
  keyFacts: KeyFact[];
  sources: Source[];
  confidence: 'high' | 'medium' | 'low';
  requiresReview: boolean;
}

export interface KeyFact {
  label: string;
  value: string;
  source: Source;
  clauseId?: string;
}

// Question intent types
export type QuestionIntent = 
  | 'repairs'
  | 'pets'
  | 'alterations'
  | 'subletting'
  | 'service_charge'
  | 'ground_rent'
  | 'dates'
  | 'parties'
  | 'premises'
  | 'insurance'
  | 'section20'
  | 'consents'
  | 'forfeiture'
  | 'variations'
  | 'general';

// Main adapter class
export class LeaseSummaryAdapter {
  private summary: LeaseSummary;
  
  constructor(summary: LeaseSummary) {
    this.summary = summary;
  }
  
  // Main method to answer questions
  public answerQuestion(question: string): LeaseAnswer {
    const intent = this.detectIntent(question);
    
    switch (intent) {
      case 'repairs':
        return this.answerRepairsQuestion(question);
      case 'pets':
        return this.answerPetsQuestion(question);
      case 'alterations':
        return this.answerAlterationsQuestion(question);
      case 'subletting':
        return this.answerSublettingQuestion(question);
      case 'service_charge':
        return this.answerServiceChargeQuestion(question);
      case 'ground_rent':
        return this.answerGroundRentQuestion(question);
      case 'dates':
        return this.answerDatesQuestion(question);
      case 'parties':
        return this.answerPartiesQuestion(question);
      case 'premises':
        return this.answerPremisesQuestion(question);
      case 'insurance':
        return this.answerInsuranceQuestion(question);
      case 'section20':
        return this.answerSection20Question(question);
      case 'consents':
        return this.answerConsentsQuestion(question);
      case 'forfeiture':
        return this.answerForfeitureQuestion(question);
      case 'variations':
        return this.answerVariationsQuestion(question);
      default:
        return this.answerGeneralQuestion(question);
    }
  }
  
  // Intent detection
  private detectIntent(question: string): QuestionIntent {
    const lowerQuestion = question.toLowerCase();
    
    // Repair-related keywords
    if (/\b(repair|maintenance|fix|broken|damage|windows|doors|walls|floor|ceiling)\b/.test(lowerQuestion)) {
      return 'repairs';
    }
    
    // Pet-related keywords
    if (/\b(pet|pets|dog|cat|animal|pets allowed|pet policy)\b/.test(lowerQuestion)) {
      return 'pets';
    }
    
    // Alteration-related keywords
    if (/\b(alter|alteration|modify|change|renovate|improve|structural|consent)\b/.test(lowerQuestion)) {
      return 'alterations';
    }
    
    // Subletting-related keywords
    if (/\b(sublet|subletting|rent out|let out|tenant|lodger|assignment)\b/.test(lowerQuestion)) {
      return 'subletting';
    }
    
    // Service charge keywords
    if (/\b(service charge|service_charge|apportionment|maintenance charge|building charge)\b/.test(lowerQuestion)) {
      return 'service_charge';
    }
    
    // Ground rent keywords
    if (/\b(ground rent|ground_rent|peppercorn|rent review)\b/.test(lowerQuestion)) {
      return 'ground_rent';
    }
    
    // Date-related keywords
    if (/\b(start|end|term|length|break|expire|commencement)\b/.test(lowerQuestion)) {
      return 'dates';
    }
    
    // Party-related keywords
    if (/\b(landlord|leaseholder|freeholder|managing agent|party|parties)\b/.test(lowerQuestion)) {
      return 'parties';
    }
    
    // Premises-related keywords
    if (/\b(premises|demised|common|rights|parking|bike|bin)\b/.test(lowerQuestion)) {
      return 'premises';
    }
    
    // Insurance keywords
    if (/\b(insurance|insured|excess|claim|damage)\b/.test(lowerQuestion)) {
      return 'insurance';
    }
    
    // Section 20 keywords
    if (/\b(section 20|section20|consultation|major works|qualifying works)\b/.test(lowerQuestion)) {
      return 'section20';
    }
    
    // Consent keywords
    if (/\b(consent|permission|approval|notice|address)\b/.test(lowerQuestion)) {
      return 'consents';
    }
    
    // Forfeiture keywords
    if (/\b(forfeit|forfeiture|breach|re-entry|termination)\b/.test(lowerQuestion)) {
      return 'forfeiture';
    }
    
    // Variation keywords
    if (/\b(variation|deed|modification|change|amendment)\b/.test(lowerQuestion)) {
      return 'variations';
    }
    
    return 'general';
  }
  
  // Repair questions
  private answerRepairsQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    // Extract specific item if mentioned
    const itemMatch = question.match(/\b(windows|doors|walls|floor|ceiling|roof|guttering|heating|plumbing|electrical)\b/i);
    const specificItem = itemMatch ? itemMatch[1].toLowerCase() : null;
    
    if (this.summary.repair_matrix) {
      const relevantRepairs = specificItem 
        ? this.summary.repair_matrix.filter(repair => 
            repair.item.toLowerCase().includes(specificItem) || 
            specificItem.includes(repair.item.toLowerCase())
          )
        : this.summary.repair_matrix;
      
      relevantRepairs.forEach(repair => {
        keyFacts.push({
          label: `${repair.item} responsibility`,
          value: repair.responsible,
          source: repair.source,
          clauseId: this.findClauseForRepair(repair.item)
        });
        
        if (repair.notes) {
          keyFacts.push({
            label: `${repair.item} notes`,
            value: repair.notes,
            source: repair.source
          });
        }
        
        sources.push(repair.source);
      });
    }
    
    // Check for unknown repair items
    const unknownRepairs = this.summary.unknowns?.filter(unknown => 
      unknown.field_path.includes('repair')
    ) || [];
    
    let answer = '';
    if (keyFacts.length > 0) {
      const responsibilities = keyFacts
        .filter(fact => fact.label.includes('responsibility'))
        .map(fact => `${fact.value} (${fact.clauseId || 'Lease Lab'}, p.${fact.source.page})`)
        .join(', ');
      
      answer = `Repair responsibilities: ${responsibilities}`;
    } else if (unknownRepairs.length > 0) {
      answer = 'Repair responsibilities are not fully specified in the lease. Please review the original document for detailed repair obligations.';
    } else {
      answer = 'No specific repair information found in the lease analysis.';
    }
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: keyFacts.length > 0 ? 'high' : 'low',
      requiresReview: keyFacts.length === 0
    };
  }
  
  // Pet questions
  private answerPetsQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const petRestriction = this.summary.use_restrictions?.find(restriction => 
      restriction.topic === 'pets'
    );
    
    if (petRestriction) {
      keyFacts.push({
        label: 'Pet policy',
        value: petRestriction.rule,
        source: petRestriction.source
      });
      
      if (petRestriction.conditions) {
        keyFacts.push({
          label: 'Pet conditions',
          value: petRestriction.conditions,
          source: petRestriction.source
        });
      }
      
      sources.push(petRestriction.source);
    }
    
    const answer = petRestriction 
      ? `Pets are ${petRestriction.rule}${petRestriction.conditions ? ` (${petRestriction.conditions})` : ''}`
      : 'Pet policy is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: petRestriction ? 'high' : 'low',
      requiresReview: !petRestriction
    };
  }
  
  // Alteration questions
  private answerAlterationsQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const alterationRestriction = this.summary.use_restrictions?.find(restriction => 
      restriction.topic === 'alterations'
    );
    
    if (alterationRestriction) {
      keyFacts.push({
        label: 'Alteration policy',
        value: alterationRestriction.rule,
        source: alterationRestriction.source
      });
      
      if (alterationRestriction.conditions) {
        keyFacts.push({
          label: 'Alteration conditions',
          value: alterationRestriction.conditions,
          source: alterationRestriction.source
        });
      }
      
      sources.push(alterationRestriction.source);
    }
    
    // Check consent requirements
    const consentRequired = this.summary.consents_notices?.landlord_consent_required?.includes('alterations');
    if (consentRequired) {
      keyFacts.push({
        label: 'Landlord consent required',
        value: 'Yes',
        source: this.summary.consents_notices!.source
      });
      sources.push(this.summary.consents_notices!.source);
    }
    
    const answer = alterationRestriction 
      ? `Alterations are ${alterationRestriction.rule}${consentRequired ? ' and require landlord consent' : ''}`
      : 'Alteration policy is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: alterationRestriction ? 'high' : 'low',
      requiresReview: !alterationRestriction
    };
  }
  
  // Subletting questions
  private answerSublettingQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const sublettingRestriction = this.summary.use_restrictions?.find(restriction => 
      restriction.topic === 'subletting'
    );
    
    if (sublettingRestriction) {
      keyFacts.push({
        label: 'Subletting policy',
        value: sublettingRestriction.rule,
        source: sublettingRestriction.source
      });
      
      if (sublettingRestriction.conditions) {
        keyFacts.push({
          label: 'Subletting conditions',
          value: sublettingRestriction.conditions,
          source: sublettingRestriction.source
        });
      }
      
      sources.push(sublettingRestriction.source);
    }
    
    // Check consent requirements
    const consentRequired = this.summary.consents_notices?.landlord_consent_required?.includes('subletting');
    if (consentRequired) {
      keyFacts.push({
        label: 'Landlord consent required',
        value: 'Yes',
        source: this.summary.consents_notices!.source
      });
      sources.push(this.summary.consents_notices!.source);
    }
    
    const answer = sublettingRestriction 
      ? `Subletting is ${sublettingRestriction.rule}${consentRequired ? ' and requires landlord consent' : ''}`
      : 'Subletting policy is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: sublettingRestriction ? 'high' : 'low',
      requiresReview: !sublettingRestriction
    };
  }
  
  // Service charge questions
  private answerServiceChargeQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const serviceCharge = this.summary.financials?.service_charge;
    
    if (serviceCharge) {
      keyFacts.push({
        label: 'Apportionment method',
        value: serviceCharge.apportionment,
        source: serviceCharge.source
      });
      
      keyFacts.push({
        label: 'Frequency',
        value: serviceCharge.frequency,
        source: serviceCharge.source
      });
      
      keyFacts.push({
        label: 'Cap',
        value: serviceCharge.cap,
        source: serviceCharge.source
      });
      
      keyFacts.push({
        label: 'Mechanism',
        value: serviceCharge.mechanism,
        source: serviceCharge.source
      });
      
      sources.push(serviceCharge.source);
    }
    
    const answer = serviceCharge 
      ? `Service charge is calculated as ${serviceCharge.apportionment}, payable ${serviceCharge.frequency}${serviceCharge.cap !== 'none' ? ` with a cap of ${serviceCharge.cap}` : ''}`
      : 'Service charge information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: serviceCharge ? 'high' : 'low',
      requiresReview: !serviceCharge
    };
  }
  
  // Ground rent questions
  private answerGroundRentQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const groundRent = this.summary.financials?.ground_rent;
    
    if (groundRent) {
      keyFacts.push({
        label: 'Amount',
        value: groundRent.amount,
        source: groundRent.source
      });
      
      keyFacts.push({
        label: 'Frequency',
        value: groundRent.frequency,
        source: groundRent.source
      });
      
      keyFacts.push({
        label: 'Review basis',
        value: groundRent.review_basis,
        source: groundRent.source
      });
      
      sources.push(groundRent.source);
    }
    
    const answer = groundRent 
      ? `Ground rent is ${groundRent.amount} ${groundRent.frequency}${groundRent.review_basis !== 'unknown' ? ` with ${groundRent.review_basis} reviews` : ''}`
      : 'Ground rent information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: groundRent ? 'high' : 'low',
      requiresReview: !groundRent
    };
  }
  
  // Date questions
  private answerDatesQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const term = this.summary.term;
    
    if (term) {
      keyFacts.push({
        label: 'Lease start',
        value: term.start,
        source: term.source || { page: 1 }
      });
      
      keyFacts.push({
        label: 'Lease end',
        value: term.end,
        source: term.source || { page: 1 }
      });
      
      keyFacts.push({
        label: 'Length',
        value: term.length,
        source: term.source || { page: 1 }
      });
      
      if (term.breaks && term.breaks.length > 0) {
        term.breaks.forEach((breakClause, index) => {
          keyFacts.push({
            label: `Break clause ${index + 1}`,
            value: `${breakClause.date} (${breakClause.type})`,
            source: breakClause.source
          });
          sources.push(breakClause.source);
        });
      }
      
      sources.push(term.source || { page: 1 });
    }
    
    const answer = term 
      ? `Lease runs from ${term.start} to ${term.end} (${term.length})${term.breaks && term.breaks.length > 0 ? ` with ${term.breaks.length} break clause(s)` : ''}`
      : 'Lease term information is not specified. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: term ? 'high' : 'low',
      requiresReview: !term
    };
  }
  
  // Party questions
  private answerPartiesQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    if (this.summary.parties) {
      this.summary.parties.forEach(party => {
        keyFacts.push({
          label: party.role,
          value: party.name,
          source: party.source
        });
        sources.push(party.source);
      });
    }
    
    const answer = this.summary.parties && this.summary.parties.length > 0
      ? `Parties: ${this.summary.parties.map(p => `${p.role} (${p.name})`).join(', ')}`
      : 'Party information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: this.summary.parties && this.summary.parties.length > 0 ? 'high' : 'low',
      requiresReview: !this.summary.parties || this.summary.parties.length === 0
    };
  }
  
  // Premises questions
  private answerPremisesQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const premises = this.summary.premises;
    
    if (premises) {
      if (premises.demised_parts && premises.demised_parts.length > 0) {
        keyFacts.push({
          label: 'Demised parts',
          value: premises.demised_parts.join(', '),
          source: premises.source
        });
      }
      
      if (premises.common_rights && premises.common_rights.length > 0) {
        keyFacts.push({
          label: 'Common rights',
          value: premises.common_rights.join(', '),
          source: premises.source
        });
      }
      
      sources.push(premises.source);
    }
    
    const answer = premises 
      ? `Premises include: ${premises.demised_parts?.join(', ') || 'not specified'}${premises.common_rights && premises.common_rights.length > 0 ? ` with common rights: ${premises.common_rights.join(', ')}` : ''}`
      : 'Premises information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: premises ? 'high' : 'low',
      requiresReview: !premises
    };
  }
  
  // Insurance questions
  private answerInsuranceQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const insurance = this.summary.insurance;
    
    if (insurance) {
      keyFacts.push({
        label: 'Who pays',
        value: insurance.who_pays,
        source: insurance.source
      });
      
      keyFacts.push({
        label: 'Scope',
        value: insurance.scope,
        source: insurance.source
      });
      
      if (insurance.excess_rules) {
        keyFacts.push({
          label: 'Excess rules',
          value: insurance.excess_rules,
          source: insurance.source
        });
      }
      
      sources.push(insurance.source);
    }
    
    const answer = insurance 
      ? `Insurance is paid by ${insurance.who_pays} for ${insurance.scope}${insurance.excess_rules ? ` (${insurance.excess_rules})` : ''}`
      : 'Insurance information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: insurance ? 'high' : 'low',
      requiresReview: !insurance
    };
  }
  
  // Section 20 questions
  private answerSection20Question(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const section20 = this.summary.section20;
    
    if (section20) {
      keyFacts.push({
        label: 'Consultation required',
        value: section20.consultation_required,
        source: section20.source
      });
      
      if (section20.method_reference) {
        keyFacts.push({
          label: 'Method reference',
          value: section20.method_reference,
          source: section20.source
        });
      }
      
      sources.push(section20.source);
    }
    
    const answer = section20 
      ? `Section 20 consultation is ${section20.consultation_required}${section20.method_reference ? ` (${section20.method_reference})` : ''}`
      : 'Section 20 information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: section20 ? 'high' : 'low',
      requiresReview: !section20
    };
  }
  
  // Consent questions
  private answerConsentsQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const consents = this.summary.consents_notices;
    
    if (consents) {
      if (consents.landlord_consent_required && consents.landlord_consent_required.length > 0) {
        keyFacts.push({
          label: 'Consent required for',
          value: consents.landlord_consent_required.join(', '),
          source: consents.source
        });
      }
      
      if (consents.notice_addresses && consents.notice_addresses.length > 0) {
        keyFacts.push({
          label: 'Notice addresses',
          value: consents.notice_addresses.map(addr => `${addr.name}: ${addr.address}`).join('; '),
          source: consents.source
        });
      }
      
      if (consents.forfeiture_clause) {
        keyFacts.push({
          label: 'Forfeiture clause',
          value: consents.forfeiture_clause,
          source: consents.source
        });
      }
      
      sources.push(consents.source);
    }
    
    const answer = consents 
      ? `Landlord consent required for: ${consents.landlord_consent_required?.join(', ') || 'not specified'}`
      : 'Consent information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: consents ? 'high' : 'low',
      requiresReview: !consents
    };
  }
  
  // Forfeiture questions
  private answerForfeitureQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const consents = this.summary.consents_notices;
    
    if (consents) {
      keyFacts.push({
        label: 'Forfeiture clause',
        value: consents.forfeiture_clause,
        source: consents.source
      });
      
      if (consents.section_146_preconditions) {
        keyFacts.push({
          label: 'Section 146 preconditions',
          value: consents.section_146_preconditions,
          source: consents.source
        });
      }
      
      sources.push(consents.source);
    }
    
    const answer = consents 
      ? `Forfeiture clause is ${consents.forfeiture_clause}${consents.section_146_preconditions ? ` (${consents.section_146_preconditions})` : ''}`
      : 'Forfeiture information is not specified in the lease. Please review the original document.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: consents ? 'high' : 'low',
      requiresReview: !consents
    };
  }
  
  // Variation questions
  private answerVariationsQuestion(question: string): LeaseAnswer {
    const keyFacts: KeyFact[] = [];
    const sources: Source[] = [];
    
    const variations = this.summary.variations;
    
    if (variations && variations.length > 0) {
      variations.forEach((variation, index) => {
        keyFacts.push({
          label: `Variation ${index + 1}`,
          value: `${variation.date}: ${variation.summary}`,
          source: variation.source
        });
        sources.push(variation.source);
      });
    }
    
    const answer = variations && variations.length > 0
      ? `Found ${variations.length} variation(s): ${variations.map(v => `${v.date} - ${v.summary}`).join('; ')}`
      : 'No variations found in the lease.';
    
    return {
      answer,
      keyFacts,
      sources,
      confidence: variations && variations.length > 0 ? 'high' : 'medium',
      requiresReview: false
    };
  }
  
  // General questions
  private answerGeneralQuestion(question: string): LeaseAnswer {
    // Try to find relevant clauses
    const relevantClauses = this.findRelevantClauses(question);
    
    if (relevantClauses.length > 0) {
      const keyFacts: KeyFact[] = relevantClauses.map(clause => ({
        label: `Clause ${clause.id}`,
        value: clause.heading,
        source: { page: clause.pages[0] }
      }));
      
      const sources: Source[] = relevantClauses.map(clause => ({ page: clause.pages[0] }));
      
      return {
        answer: `Found ${relevantClauses.length} relevant clause(s). Please review the specific clauses for detailed information.`,
        keyFacts,
        sources,
        confidence: 'medium',
        requiresReview: true
      };
    }
    
    return {
      answer: 'This information is not specified in the lease analysis. Please review the original document or contact the property management office.',
      keyFacts: [],
      sources: [],
      confidence: 'low',
      requiresReview: true
    };
  }
  
  // Helper methods
  private findClauseForRepair(item: string): string | undefined {
    if (!this.summary.clause_index) return undefined;
    
    const repairClause = this.summary.clause_index.find(clause => 
      clause.normalized_topic === 'repairs' || 
      clause.heading.toLowerCase().includes('repair')
    );
    
    return repairClause?.id;
  }
  
  private findRelevantClauses(question: string): ClauseIndexItem[] {
    if (!this.summary.clause_index) return [];
    
    const keywords = question.toLowerCase().split(/\s+/);
    
    return this.summary.clause_index.filter(clause => 
      keywords.some(keyword => 
        clause.heading.toLowerCase().includes(keyword) ||
        clause.normalized_topic.toLowerCase().includes(keyword) ||
        clause.text_excerpt.toLowerCase().includes(keyword)
      )
    );
  }
}

// Utility function to create adapter
export function createLeaseSummaryAdapter(summary: LeaseSummary): LeaseSummaryAdapter {
  return new LeaseSummaryAdapter(summary);
}

// Export types
export type { LeaseAnswer, KeyFact, QuestionIntent };
