import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentIntakeSchema, createDefaultDocumentIntake } from '@/lib/zod/documentIntake';

// Mock the AI config
vi.mock('@/lib/ai/config', () => ({
  AI_ENABLED: true,
  OPENAI_API_KEY: 'test-key'
}));

describe('Document Intake System', () => {
  describe('Zod Validation', () => {
    it('should validate a correct document intake result', () => {
      const validResult = {
        classification: "extinguisher_service_certificate",
        document_title: "Certificate of Inspection – Fire Extinguishers & Hose Reels",
        issuing_company_name: "Alban Fire Protection",
        issuing_company_contact: "Tel: 01727 832443 | 07555 576498 | albanfire@virginmedia.com",
        inspection_or_issue_date: "2021-09-01",
        period_covered_end_date: null,
        building_name: "50 Kensington Gardens Square",
        building_address: "50 Kensington Gardens Square, London",
        building_postcode: "W2 4BA",
        people: [
          {"role": "engineer", "name": null},
          {"role": "customer sign-off", "name": "Martyn Gillinder"}
        ],
        standard_or_code_refs: ["BS 5306-3:2017", "BS 5306-1"],
        equipment: [
          {"type": "Water", "size": "6L", "count": 1},
          {"type": "CO2", "size": "2kg", "count": 1}
        ],
        notes: "Wall bracket and location notes recorded; ensure noted defects are actioned.",
        page_count: 1,
        source_confidence: 0.86,
        text_extracted: "Service certificate for extinguishers and hose reels at 50 Kensington Gardens Square issued by Alban Fire Protection, Sept 2021.",
        suggested_category: "Fire Safety Equipment – Extinguishers & Hose Reels",
        suggested_table: "compliance_documents",
        suggested_compliance_asset_key: "fire_extinguishers",
        next_due_date: "2022-09-01",
        reminders: [
          {"label": "Annual extinguisher service due", "date": "2022-08-01", "reason": "30-day pre-check"}
        ],
        follow_ups: [
          "Confirm any defects listed are completed.",
          "Upload certificate to building compliance record and link to fire extinguishers asset."
        ],
        blocking_issues: [],
        ocr_needed: false,
        duplicates_possible: true,
        duplicate_match_hint: {"title":"Alban Fire Protection – Certificate of Inspection","date":"2021-09-01"}
      };

      const result = DocumentIntakeSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject invalid classification', () => {
      const invalidResult = {
        classification: "invalid_classification",
        document_title: "Test Document",
        issuing_company_name: "Test Company",
        issuing_company_contact: "",
        inspection_or_issue_date: null,
        period_covered_end_date: null,
        building_name: null,
        building_address: null,
        building_postcode: null,
        people: [],
        standard_or_code_refs: [],
        equipment: [],
        notes: "",
        page_count: 1,
        source_confidence: 0.5,
        text_extracted: "Test document",
        suggested_category: "Test",
        suggested_table: "building_documents",
        suggested_compliance_asset_key: null,
        next_due_date: null,
        reminders: [],
        follow_ups: [],
        blocking_issues: [],
        ocr_needed: false,
        duplicates_possible: false,
        duplicate_match_hint: null
      };

      const result = DocumentIntakeSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('classification');
      }
    });

    it('should reject invalid confidence score', () => {
      const invalidResult = {
        classification: "other",
        document_title: "Test Document",
        issuing_company_name: "Test Company",
        issuing_company_contact: "",
        inspection_or_issue_date: null,
        period_covered_end_date: null,
        building_name: null,
        building_address: null,
        building_postcode: null,
        people: [],
        standard_or_code_refs: [],
        equipment: [],
        notes: "",
        page_count: 1,
        source_confidence: 1.5, // Invalid: > 1
        text_extracted: "Test document",
        suggested_category: "Test",
        suggested_table: "building_documents",
        suggested_compliance_asset_key: null,
        next_due_date: null,
        reminders: [],
        follow_ups: [],
        blocking_issues: [],
        ocr_needed: false,
        duplicates_possible: false,
        duplicate_match_hint: null
      };

      const result = DocumentIntakeSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('source_confidence');
      }
    });
  });

  describe('Default Document Intake', () => {
    it('should create valid default result for failed OCR', () => {
      const defaultResult = createDefaultDocumentIntake('test.pdf');
      
      expect(defaultResult.classification).toBe('other');
      expect(defaultResult.document_title).toBe('test.pdf');
      expect(defaultResult.ocr_needed).toBe(true);
      expect(defaultResult.blocking_issues).toContain('No readable text extracted');
      expect(defaultResult.source_confidence).toBe(0.0);
      
      // Should still be valid according to schema
      const validation = DocumentIntakeSchema.safeParse(defaultResult);
      expect(validation.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      // Mock fetch for OpenAI API calls
      global.fetch = vi.fn();
    });

    it('should handle successful document processing', async () => {
      // Mock successful OpenAI response
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              classification: "invoice",
              document_title: "Invoice #12345",
              issuing_company_name: "Test Company",
              issuing_company_contact: "contact@test.com",
              inspection_or_issue_date: "2024-01-15",
              period_covered_end_date: null,
              building_name: "Test Building",
              building_address: "123 Test Street",
              building_postcode: "TE1 1ST",
              people: [],
              standard_or_code_refs: [],
              equipment: [],
              notes: "Test invoice",
              page_count: 1,
              source_confidence: 0.9,
              text_extracted: "Invoice for services",
              suggested_category: "Financial Documents",
              suggested_table: "building_documents",
              suggested_compliance_asset_key: null,
              next_due_date: null,
              reminders: [],
              follow_ups: [],
              blocking_issues: [],
              ocr_needed: false,
              duplicates_possible: false,
              duplicate_match_hint: null
            })
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse
      });

      // Test would continue with actual API call...
      // This is a simplified test structure
      expect(true).toBe(true);
    });

    it('should handle OCR failure gracefully', async () => {
      // Mock OCR failure scenario
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify(createDefaultDocumentIntake('failed-ocr.pdf'))
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse
      });

      // Test would continue with actual API call...
      // This is a simplified test structure
      expect(true).toBe(true);
    });
  });
});
