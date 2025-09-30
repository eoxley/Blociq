import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LeaseSummarySchema, DocumentSummarySchema } from '../../ai/contracts/leaseSummary';
import { validateLeaseSummary, validateLeaseDocument } from '../../ai/contracts/validateLeaseSummary';
import { createLeaseSummaryAdapter, LeaseAnswer } from '../../ai/adapters/leaseSummaryToAnswer';

// Sample lease summary for testing
const sampleLeaseSummary = {
  contract_version: "1.0.0",
  doc_type: "lease",
  normalised_building_name: "Ashwood House",
  parties: [
    {
      role: "landlord",
      name: "ABC Property Ltd",
      source: { page: 12 }
    },
    {
      role: "leaseholder",
      name: "John Smith",
      source: { page: 12 }
    }
  ],
  identifiers: {
    address: "123 Main Street, London SW1A 1AA",
    unit: "Flat 8",
    title_number: "NGL123456",
    tenure: "leasehold",
    source: { page: 1 }
  },
  term: {
    start: "2020-01-01",
    end: "2119-12-31",
    length: "years",
    breaks: [
      {
        date: "2025-01-01",
        type: "mutual",
        source: { page: 6 }
      }
    ],
    source: { page: 5 }
  },
  premises: {
    demised_parts: [
      "windows_in",
      "windows_out",
      "walls_in",
      "internal_doors",
      "floor_covering"
    ],
    common_rights: [
      "bike_store",
      "bin_store",
      "parking_bay_8"
    ],
    plans: [{ page: 46 }],
    source: { page: 2 }
  },
  financials: {
    ground_rent: {
      amount: "£250",
      review_basis: "RPI",
      frequency: "annual",
      source: { page: 8 }
    },
    service_charge: {
      apportionment: "0.5%",
      cap: "£2000",
      frequency: "quarterly",
      mechanism: "on-account",
      source: { page: 9 }
    }
  },
  repair_matrix: [
    {
      item: "windows",
      responsible: "leaseholder",
      notes: "External frames landlord, internal glazing leaseholder",
      source: { page: 14 }
    },
    {
      item: "doors",
      responsible: "landlord",
      notes: "External doors and frames",
      source: { page: 14 }
    }
  ],
  insurance: {
    who_pays: "leaseholder",
    scope: "contents",
    excess_rules: "First £500 by leaseholder",
    source: { page: 10 }
  },
  use_restrictions: [
    {
      topic: "pets",
      rule: "consent_required",
      conditions: "Written consent required",
      source: { page: 18 }
    },
    {
      topic: "alterations",
      rule: "consent_required",
      conditions: "Structural alterations require consent",
      source: { page: 18 }
    }
  ],
  consents_notices: {
    landlord_consent_required: [
      "alterations",
      "assignment",
      "subletting"
    ],
    notice_addresses: [
      {
        name: "ABC Property Management",
        address: "123 Property Street, London"
      }
    ],
    forfeiture_clause: "present",
    section_146_preconditions: "14 days notice required",
    source: { page: 20 }
  },
  section20: {
    consultation_required: "yes",
    method_reference: "clause 3.4",
    source: { page: 22 }
  },
  variations: [
    {
      date: "2023-06-15",
      summary: "Extended lease term by 20 years",
      affected_clauses: ["2.1", "3.2"],
      source: { page: 3 }
    }
  ],
  clause_index: [
    {
      id: "2.3",
      heading: "Repairs and Maintenance",
      normalized_topic: "repairs",
      text_excerpt: "The leaseholder shall keep the demised premises in good repair...",
      pages: [13, 14]
    },
    {
      id: "3.1",
      heading: "Use of Premises",
      normalized_topic: "use",
      text_excerpt: "The premises shall be used as a private dwelling...",
      pages: [15, 16]
    }
  ],
  actions: [
    {
      priority: "high",
      summary: "Register deed of variation",
      reason: "Lease term extended but not registered",
      source: { page: 3 }
    }
  ],
  unknowns: [
    {
      field_path: "financials.ground_rent.review_basis",
      note: "Not specified explicitly in lease"
    }
  ],
  sources: [
    {
      page: 14,
      span: { start: 120, end: 230 }
    }
  ]
};

// Invalid lease summary for testing
const invalidLeaseSummary = {
  contract_version: "1.0.0",
  doc_type: "lease",
  normalised_building_name: "Ashwood House",
  // Missing required parties
  identifiers: {
    address: "123 Main Street, London SW1A 1AA",
    unit: "Flat 8",
    source: { page: 1 }
  },
  // Missing required term
  premises: {
    demised_parts: [],
    source: { page: 2 }
  },
  financials: {
    service_charge: {
      apportionment: "0.5%",
      cap: "£2000",
      frequency: "quarterly",
      mechanism: "on-account",
      source: { page: 9 }
    }
  }
};

describe('Lease Summary Contract Validation', () => {
  describe('Schema Validation', () => {
    it('should validate a complete lease summary', () => {
      const result = LeaseSummarySchema.safeParse(sampleLeaseSummary);
      expect(result.success).toBe(true);
    });

    it('should reject invalid lease summary', () => {
      const result = LeaseSummarySchema.safeParse(invalidLeaseSummary);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should validate document summary union', () => {
      const result = DocumentSummarySchema.safeParse(sampleLeaseSummary);
      expect(result.success).toBe(true);
    });
  });

  describe('Quality Gate Validation', () => {
    it('should pass quality gates for complete lease', () => {
      const result = validateLeaseDocument(sampleLeaseSummary);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should fail quality gates for incomplete lease', () => {
      const result = validateLeaseDocument(invalidLeaseSummary);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThan(50);
    });

    it('should generate warnings for data consistency issues', () => {
      const summaryWithInconsistency = {
        ...sampleLeaseSummary,
        repair_matrix: [
          {
            item: "windows",
            responsible: "leaseholder",
            source: { page: 14 }
          }
        ],
        premises: {
          demised_parts: ["walls_in", "doors"], // Missing windows
          source: { page: 2 }
        }
      };

      const result = validateLeaseDocument(summaryWithInconsistency);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'premises.demised_parts')).toBe(true);
    });
  });
});

describe('Lease Summary Adapter', () => {
  let adapter: ReturnType<typeof createLeaseSummaryAdapter>;

  beforeAll(() => {
    adapter = createLeaseSummaryAdapter(sampleLeaseSummary as any);
  });

  describe('Repair Questions', () => {
    it('should answer repair responsibility questions', () => {
      const answer = adapter.answerQuestion('Who is responsible for windows?');
      
      expect(answer.answer).toContain('leaseholder');
      expect(answer.keyFacts).toHaveLength(2); // responsibility + notes
      expect(answer.confidence).toBe('high');
      expect(answer.sources).toHaveLength(1);
      expect(answer.sources[0].page).toBe(14);
    });

    it('should answer general repair questions', () => {
      const answer = adapter.answerQuestion('What are the repair obligations?');
      
      expect(answer.answer).toContain('Repair responsibilities');
      expect(answer.keyFacts.length).toBeGreaterThan(0);
      expect(answer.confidence).toBe('high');
    });

    it('should handle unknown repair items', () => {
      const answer = adapter.answerQuestion('Who is responsible for the roof?');
      
      expect(answer.answer).toContain('not specified');
      expect(answer.confidence).toBe('low');
      expect(answer.requiresReview).toBe(true);
    });
  });

  describe('Pet Questions', () => {
    it('should answer pet policy questions', () => {
      const answer = adapter.answerQuestion('Are pets allowed?');
      
      expect(answer.answer).toContain('consent_required');
      expect(answer.keyFacts).toHaveLength(2); // policy + conditions
      expect(answer.confidence).toBe('high');
    });

    it('should include consent conditions', () => {
      const answer = adapter.answerQuestion('What are the pet rules?');
      
      expect(answer.keyFacts.some(fact => fact.label === 'Pet conditions')).toBe(true);
      expect(answer.keyFacts.some(fact => fact.value.includes('Written consent'))).toBe(true);
    });
  });

  describe('Alteration Questions', () => {
    it('should answer alteration policy questions', () => {
      const answer = adapter.answerQuestion('Can I make alterations?');
      
      expect(answer.answer).toContain('consent_required');
      expect(answer.keyFacts.some(fact => fact.label === 'Landlord consent required')).toBe(true);
      expect(answer.confidence).toBe('high');
    });
  });

  describe('Financial Questions', () => {
    it('should answer service charge questions', () => {
      const answer = adapter.answerQuestion('How is service charge calculated?');
      
      expect(answer.answer).toContain('0.5%');
      expect(answer.answer).toContain('quarterly');
      expect(answer.keyFacts).toHaveLength(4); // apportionment, frequency, cap, mechanism
      expect(answer.confidence).toBe('high');
    });

    it('should answer ground rent questions', () => {
      const answer = adapter.answerQuestion('What is the ground rent?');
      
      expect(answer.answer).toContain('£250');
      expect(answer.answer).toContain('annual');
      expect(answer.keyFacts).toHaveLength(3); // amount, frequency, review basis
      expect(answer.confidence).toBe('high');
    });
  });

  describe('Date Questions', () => {
    it('should answer lease term questions', () => {
      const answer = adapter.answerQuestion('What is the lease term?');
      
      expect(answer.answer).toContain('2020-01-01');
      expect(answer.answer).toContain('2119-12-31');
      expect(answer.answer).toContain('years');
      expect(answer.keyFacts).toHaveLength(4); // start, end, length, break clause
      expect(answer.confidence).toBe('high');
    });
  });

  describe('Party Questions', () => {
    it('should answer party questions', () => {
      const answer = adapter.answerQuestion('Who are the parties to the lease?');
      
      expect(answer.answer).toContain('landlord');
      expect(answer.answer).toContain('leaseholder');
      expect(answer.answer).toContain('ABC Property Ltd');
      expect(answer.answer).toContain('John Smith');
      expect(answer.keyFacts).toHaveLength(2);
      expect(answer.confidence).toBe('high');
    });
  });

  describe('Premises Questions', () => {
    it('should answer premises questions', () => {
      const answer = adapter.answerQuestion('What is included in the premises?');
      
      expect(answer.answer).toContain('windows_in');
      expect(answer.answer).toContain('windows_out');
      expect(answer.answer).toContain('bike_store');
      expect(answer.keyFacts).toHaveLength(2); // demised parts + common rights
      expect(answer.confidence).toBe('high');
    });
  });

  describe('Section 20 Questions', () => {
    it('should answer section 20 questions', () => {
      const answer = adapter.answerQuestion('Is section 20 consultation required?');
      
      expect(answer.answer).toContain('yes');
      expect(answer.answer).toContain('clause 3.4');
      expect(answer.keyFacts).toHaveLength(2); // consultation required + method reference
      expect(answer.confidence).toBe('high');
    });
  });

  describe('General Questions', () => {
    it('should handle general questions with clause search', () => {
      const answer = adapter.answerQuestion('What does the lease say about maintenance?');
      
      expect(answer.answer).toContain('relevant clause');
      expect(answer.keyFacts.some(fact => fact.label.includes('Clause'))).toBe(true);
      expect(answer.confidence).toBe('medium');
    });

    it('should handle questions with no relevant clauses', () => {
      const answer = adapter.answerQuestion('What does the lease say about swimming pools?');
      
      expect(answer.answer).toContain('not specified');
      expect(answer.confidence).toBe('low');
      expect(answer.requiresReview).toBe(true);
    });
  });

  describe('Source Verification', () => {
    it('should include source page references in all answers', () => {
      const answer = adapter.answerQuestion('Who is responsible for windows?');
      
      expect(answer.sources).toHaveLength(1);
      expect(answer.sources[0].page).toBe(14);
      expect(answer.keyFacts[0].source.page).toBe(14);
    });

    it('should preserve source information through adapter', () => {
      const answer = adapter.answerQuestion('What is the service charge?');
      
      expect(answer.sources).toHaveLength(1);
      expect(answer.sources[0].page).toBe(9);
      expect(answer.keyFacts.every(fact => fact.source.page === 9)).toBe(true);
    });
  });

  describe('Unknown Field Handling', () => {
    it('should handle unknown fields safely', () => {
      const answer = adapter.answerQuestion('What is the ground rent review basis?');
      
      expect(answer.answer).toContain('RPI'); // Should still return the value
      expect(answer.confidence).toBe('high');
    });

    it('should return safe responses for truly unknown fields', () => {
      const answer = adapter.answerQuestion('What is the lease renewal option?');
      
      expect(answer.answer).toContain('not specified');
      expect(answer.confidence).toBe('low');
      expect(answer.requiresReview).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should validate and answer questions end-to-end', () => {
    // Validate the summary
    const validation = validateLeaseDocument(sampleLeaseSummary);
    expect(validation.isValid).toBe(true);

    // Create adapter
    const adapter = createLeaseSummaryAdapter(sampleLeaseSummary as any);

    // Answer questions
    const repairAnswer = adapter.answerQuestion('Who fixes the windows?');
    const petAnswer = adapter.answerQuestion('Can I have a dog?');
    const financialAnswer = adapter.answerQuestion('How much is service charge?');

    // Verify all answers are valid
    expect(repairAnswer.confidence).toBe('high');
    expect(petAnswer.confidence).toBe('high');
    expect(financialAnswer.confidence).toBe('high');

    // Verify all answers have sources
    expect(repairAnswer.sources.length).toBeGreaterThan(0);
    expect(petAnswer.sources.length).toBeGreaterThan(0);
    expect(financialAnswer.sources.length).toBeGreaterThan(0);
  });

  it('should handle malformed data gracefully', () => {
    const malformedSummary = {
      ...sampleLeaseSummary,
      parties: null, // Invalid data
      financials: {
        service_charge: {
          apportionment: "invalid", // Invalid format
          source: { page: 9 }
        }
      }
    };

    // Should not crash
    expect(() => {
      const adapter = createLeaseSummaryAdapter(malformedSummary as any);
      const answer = adapter.answerQuestion('What is the service charge?');
      expect(answer.confidence).toBe('low');
    }).not.toThrow();
  });
});

describe('Performance Tests', () => {
  it('should answer questions quickly', () => {
    const adapter = createLeaseSummaryAdapter(sampleLeaseSummary as any);
    
    const start = Date.now();
    const answer = adapter.answerQuestion('Who is responsible for windows?');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should answer in under 100ms
    expect(answer.confidence).toBe('high');
  });

  it('should handle multiple questions efficiently', () => {
    const adapter = createLeaseSummaryAdapter(sampleLeaseSummary as any);
    const questions = [
      'Who is responsible for windows?',
      'Are pets allowed?',
      'What is the service charge?',
      'What is the lease term?',
      'Can I make alterations?'
    ];

    const start = Date.now();
    const answers = questions.map(q => adapter.answerQuestion(q));
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // Should handle 5 questions in under 500ms
    expect(answers.every(a => a.confidence === 'high')).toBe(true);
  });
});
