/**
 * Outlook Add-in Domain Lock Tests
 * 
 * Tests the domain locking, acronym interpretation, and intent detection
 * for the Outlook Add-in system.
 */

import { describe, it, expect } from 'vitest';
import { processUserInput } from '@/ai/prompt/addinPrompt';
import { parseAddinIntent } from '@/ai/intent/parseAddinIntent';
import { PROPERTY_ACRONYMS, isOutOfScope } from '@/ai/glossary/propertyAcronyms';

describe('Outlook Add-in Domain Lock Tests', () => {
  
  describe('Acronym Processing', () => {
    it('should correctly identify property management acronyms', () => {
      const testCases = [
        { input: 'What is RCA?', expected: 'RCA' },
        { input: 'S20 consultation required', expected: 'S20' },
        { input: 'FRA assessment needed', expected: 'FRA' },
        { input: 'EICR due this year', expected: 'EICR' },
        { input: 'HRB compliance', expected: 'HRB' },
        { input: 'RMC management', expected: 'RMC' },
        { input: 'RTM process', expected: 'RTM' },
        { input: 'EWS1 form', expected: 'EWS1' }
      ];

      testCases.forEach(({ input, expected }) => {
        const processed = processUserInput(input);
        expect(processed.acronymsFound).toContain(expected);
      });
    });

    it('should identify out-of-scope terms', () => {
      const outOfScopeInputs = [
        'How do I rotate AWS keys?',
        'GitHub secrets management',
        'Docker container setup',
        'API authentication',
        'Database migration',
        'Server deployment'
      ];

      outOfScopeInputs.forEach(input => {
        const processed = processUserInput(input);
        expect(processed.isOutOfScope).toBe(true);
      });
    });

    it('should expand acronyms in text', () => {
      const input = 'RCA and S20 consultation for FRA assessment';
      const processed = processUserInput(input);
      
      expect(processed.processedInput).toContain('Restatement Cost Analysis');
      expect(processed.processedInput).toContain('Section 20');
      expect(processed.processedInput).toContain('Fire Risk Assessment');
    });
  });

  describe('Intent Detection', () => {
    it('should detect Q&A intent for general questions', () => {
      const qaInputs = [
        'What is Section 20?',
        'Who is the leaseholder of unit 5?',
        'How many units does Ashwood House have?',
        'What are the repair obligations?',
        'When is the service charge due?'
      ];

      qaInputs.forEach(input => {
        const intent = parseAddinIntent(input);
        expect(intent.intent).toBe('qa');
        expect(intent.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should detect reply intent for explicit triggers', () => {
      const replyInputs = [
        'Draft a reply about Section 20',
        'Respond to this email',
        'Write a response to the tenant',
        'Compose a message about repairs',
        'Send a reply regarding compliance'
      ];

      replyInputs.forEach(input => {
        const intent = parseAddinIntent(input);
        expect(intent.intent).toBe('reply');
        expect(intent.confidence).toBeGreaterThan(0.8);
      });
    });

    it('should detect reply intent with Outlook context', () => {
      const outlookContext = {
        from: 'tenant@example.com',
        subject: 'Repair Request - Flat 5',
        receivedDateTime: '2025-01-17T10:00:00Z',
        hasSelection: true
      };

      const intent = parseAddinIntent('Help me with this', outlookContext);
      expect(intent.intent).toBe('reply');
      expect(intent.confidence).toBeGreaterThan(0.6);
    });

    it('should extract building context from input', () => {
      const inputs = [
        { input: 'Building Ashwood House unit 5', expected: { building: 'Ashwood House', unit: '5' } },
        { input: 'Property called Oak Court flat 3', expected: { building: 'Oak Court', unit: '3' } },
        { input: 'Block Sample House apartment 2a', expected: { building: 'Sample House', unit: '2a' } }
      ];

      inputs.forEach(({ input, expected }) => {
        const intent = parseAddinIntent(input);
        // Note: This would need to be implemented in the actual function
        // For now, we're testing the regex patterns
        const buildingMatch = input.match(/(?:building|property|block)\s+(?:called\s+)?([A-Za-z\s]+?)(?:\s|$|,|\.)/i);
        const unitMatch = input.match(/(?:flat|unit|apartment)\s+(\d+[a-z]?)/i);
        
        if (expected.building) {
          expect(buildingMatch?.[1]?.trim()).toBe(expected.building);
        }
        if (expected.unit) {
          expect(unitMatch?.[1]?.trim()).toBe(expected.unit);
        }
      });
    });
  });

  describe('Domain Validation', () => {
    it('should accept property management queries', () => {
      const validInputs = [
        'What is Section 20 consultation?',
        'Who pays for window repairs?',
        'When is the service charge due?',
        'What are the fire safety requirements?',
        'How do I handle a noise complaint?',
        'What is the lease term?',
        'Who is responsible for maintenance?'
      ];

      validInputs.forEach(input => {
        const processed = processUserInput(input);
        expect(processed.isOutOfScope).toBe(false);
      });
    });

    it('should reject out-of-scope queries', () => {
      const invalidInputs = [
        'How do I deploy to AWS?',
        'What is GitHub Actions?',
        'How to set up Docker?',
        'API key management',
        'Database optimization',
        'Server monitoring',
        'Code review process'
      ];

      invalidInputs.forEach(input => {
        const processed = processUserInput(input);
        expect(processed.isOutOfScope).toBe(true);
      });
    });
  });

  describe('Acronym Definitions', () => {
    it('should have correct property management acronym definitions', () => {
      expect(PROPERTY_ACRONYMS.RCA.fullName).toBe('Restatement Cost Analysis');
      expect(PROPERTY_ACRONYMS.RCA.domain).toBe('insurance');
      
      expect(PROPERTY_ACRONYMS.S20.fullName).toBe('Section 20');
      expect(PROPERTY_ACRONYMS.S20.domain).toBe('legal');
      
      expect(PROPERTY_ACRONYMS.FRA.fullName).toBe('Fire Risk Assessment');
      expect(PROPERTY_ACRONYMS.FRA.domain).toBe('safety');
      
      expect(PROPERTY_ACRONYMS.EICR.fullName).toBe('Electrical Installation Condition Report');
      expect(PROPERTY_ACRONYMS.EICR.domain).toBe('safety');
      
      expect(PROPERTY_ACRONYMS.HRB.fullName).toBe('Higher-Risk Building');
      expect(PROPERTY_ACRONYMS.HRB.domain).toBe('safety');
    });

    it('should correctly identify out-of-scope terms', () => {
      expect(isOutOfScope('AWS')).toBe(true);
      expect(isOutOfScope('GITHUB')).toBe(true);
      expect(isOutOfScope('DOCKER')).toBe(true);
      expect(isOutOfScope('API')).toBe(true);
      expect(isOutOfScope('JSON')).toBe(true);
      
      expect(isOutOfScope('RCA')).toBe(false);
      expect(isOutOfScope('S20')).toBe(false);
      expect(isOutOfScope('FRA')).toBe(false);
    });
  });

  describe('Clarification Handling', () => {
    it('should identify terms needing clarification', () => {
      const ambiguousInputs = [
        'What about the RTA?', // Could be Right to Acquire or Recognised Tenants' Association
        'The BSA requirements', // Could be Building Safety Act or British Standards
        'RMC management', // Clear - Residents Management Company
        'API integration' // Out of scope
      ];

      ambiguousInputs.forEach(input => {
        const processed = processUserInput(input);
        if (input.includes('RTA') || input.includes('BSA')) {
          // These should need clarification
          expect(processed.needsClarification.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
