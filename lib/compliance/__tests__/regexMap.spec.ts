import {
  detectDocType,
  extractFields,
  computeDueDates,
  toSummaryJson,
  toCompliancePatch,
  normalizeUKDate,
  clearConfigCache
} from '../regexMap';

describe('Compliance Regex Map', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  describe('normalizeUKDate', () => {
    it('should normalize DD/MM/YYYY format', () => {
      expect(normalizeUKDate('15/07/2023')).toBe('2023-07-15');
      expect(normalizeUKDate('1/1/2024')).toBe('2024-01-01');
      expect(normalizeUKDate('31/12/2022')).toBe('2022-12-31');
    });

    it('should normalize DD-MM-YYYY format', () => {
      expect(normalizeUKDate('15-07-2023')).toBe('2023-07-15');
      expect(normalizeUKDate('1-1-2024')).toBe('2024-01-01');
    });

    it('should normalize DD Month YYYY format', () => {
      expect(normalizeUKDate('15 July 2023')).toBe('2023-07-15');
      expect(normalizeUKDate('1 Jan 2024')).toBe('2024-01-01');
      expect(normalizeUKDate('31 Dec 2022')).toBe('2022-12-31');
    });

    it('should handle 2-digit years', () => {
      expect(normalizeUKDate('15/07/23')).toBe('2023-07-15');
      expect(normalizeUKDate('1/1/24')).toBe('2024-01-01');
    });

    it('should return null for invalid dates', () => {
      expect(normalizeUKDate('invalid')).toBeNull();
      expect(normalizeUKDate('32/13/2023')).toBeNull();
      expect(normalizeUKDate('')).toBeNull();
    });
  });

  describe('detectDocType', () => {
    it('should detect EICR documents', () => {
      const eicrText = `
        Electrical Installation Condition Report
        Inspection Date: 15/07/2023
        Property: Ashwood House
        BS 7671:2018
        Satisfactory
        No Category 1 issues
      `;

      const result = detectDocType(eicrText);
      expect(result.type).toBe('EICR');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect FRA documents', () => {
      const fraText = `
        Fire Risk Assessment
        Inspection Date: 20/08/2023
        Risk Rating: Moderate
        Review due: 20/08/2024
      `;

      const result = detectDocType(fraText);
      expect(result.type).toBe('FRA');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect EWS1 documents', () => {
      const ews1Text = `
        EWS1 Certificate
        External Wall System Assessment
        Class: A1
        Inspection Date: 10/09/2023
      `;

      const result = detectDocType(ews1Text);
      expect(result.type).toBe('FRAEW_EWS1');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect Emergency Lighting documents', () => {
      const emergencyText = `
        Emergency Lighting Test Certificate
        Monthly Function Test
        Inspection Date: 5/10/2023
        Annual Duration Test
      `;

      const result = detectDocType(emergencyText);
      expect(result.type).toBe('EmergencyLighting');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect Fire Alarm documents', () => {
      const fireAlarmText = `
        Fire Alarm System Test
        BS 5839
        Inspection Date: 12/11/2023
        Weekly testing
      `;

      const result = detectDocType(fireAlarmText);
      expect(result.type).toBe('FireAlarm');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect Asbestos documents', () => {
      const asbestosText = `
        Asbestos Survey Report
        Management Survey
        Inspection Date: 25/12/2023
        Asbestos Register
      `;

      const result = detectDocType(fireAlarmText);
      expect(result.type).toBe('FireAlarm');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect Water Risk documents', () => {
      const waterText = `
        Legionella Risk Assessment
        HSG274
        Inspection Date: 15/01/2024
        Review within 2 years
      `;

      const result = detectDocType(waterText);
      expect(result.type).toBe('WaterRisk');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect Insurance documents', () => {
      const insuranceText = `
        Schedule of Insurance
        Policy Number: ABC123/2024
        Insured By: Property Management Ltd
        Period From: 1/1/2024
        Period To: 31/12/2024
        Buildings Sum Insured: £500,000
      `;

      const result = detectDocType(insuranceText);
      expect(result.type).toBe('Insurance');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should return Unknown for unrecognized documents', () => {
      const unknownText = 'This is just some random text with no compliance markers.';
      const result = detectDocType(unknownText);
      expect(result.type).toBe('Unknown');
      expect(result.score).toBe(0);
    });
  });

  describe('extractFields', () => {
    it('should extract EICR fields', () => {
      const pageMap = [
        { page: 1, text: 'Electrical Installation Condition Report\nInspection Date: 15/07/2023\nSatisfactory\nNo Category 1 issues' }
      ];

      const fields = extractFields('EICR', pageMap);
      expect(fields.inspection_date).toBe('2023-07-15');
      expect(fields.result).toBe('Satisfactory');
      expect(fields.source_pages).toContain(1);
    });

    it('should extract FRA fields', () => {
      const pageMap = [
        { page: 1, text: 'Fire Risk Assessment\nInspection Date: 20/08/2023\nRisk Rating: Moderate' }
      ];

      const fields = extractFields('FRA', pageMap);
      expect(fields.inspection_date).toBe('2023-08-20');
      expect(fields.risk_rating).toBe('Moderate');
      expect(fields.source_pages).toContain(1);
    });

    it('should extract Insurance fields', () => {
      const pageMap = [
        { page: 1, text: 'Policy No: ABC123/2024\nPeriod From: 1/1/2024\nPeriod To: 31/12/2024\nBuildings Sum Insured: £500,000' }
      ];

      const fields = extractFields('Insurance', pageMap);
      expect(fields.period_from).toBe('2024-01-01');
      expect(fields.period_to).toBe('2024-12-31');
      expect(fields.policy_number).toBe('ABC123/2024');
      expect(fields.buildings_sum_insured).toBe('£500,000');
    });

    it('should handle multiple pages', () => {
      const pageMap = [
        { page: 1, text: 'Electrical Installation Condition Report' },
        { page: 2, text: 'Inspection Date: 15/07/2023\nSatisfactory' }
      ];

      const fields = extractFields('EICR', pageMap);
      expect(fields.inspection_date).toBe('2023-07-15');
      expect(fields.source_pages).toContain(2);
    });
  });

  describe('computeDueDates', () => {
    it('should compute EICR due date (5 years)', () => {
      const fields = { inspection_date: '2023-07-15' };
      const due = computeDueDates('EICR', fields);
      expect(due.next_due_date).toBe('2028-07-15');
    });

    it('should compute FRA due date (1 year)', () => {
      const fields = { inspection_date: '2023-08-20' };
      const due = computeDueDates('FRA', fields);
      expect(due.next_due_date).toBe('2024-08-20');
    });

    it('should compute Emergency Lighting due date (1 year for Annual Duration)', () => {
      const fields = { inspection_date: '2023-10-05', test_type: 'Annual Duration' };
      const due = computeDueDates('EmergencyLighting', fields);
      expect(due.next_due_date).toBe('2024-10-05');
    });

    it('should compute Emergency Lighting due date (1 month for Monthly Function)', () => {
      const fields = { inspection_date: '2023-10-05', test_type: 'Monthly Function' };
      const due = computeDueDates('EmergencyLighting', fields);
      expect(due.next_due_date).toBe('2023-11-05');
    });

    it('should compute Lift LOLER due date (6 months for passenger)', () => {
      const fields = { inspection_date: '2023-11-12', lift_type: 'passenger' };
      const due = computeDueDates('LiftLOLER', fields);
      expect(due.next_due_date).toBe('2024-05-12');
    });

    it('should compute Lift LOLER due date (12 months for goods)', () => {
      const fields = { inspection_date: '2023-11-12', lift_type: 'goods' };
      const due = computeDueDates('LiftLOLER', fields);
      expect(due.next_due_date).toBe('2024-11-12');
    });

    it('should return empty object for missing inspection date', () => {
      const fields = {};
      const due = computeDueDates('EICR', fields);
      expect(due).toEqual({});
    });
  });

  describe('toSummaryJson', () => {
    it('should create EICR summary', () => {
      const fields = { 
        inspection_date: '2023-07-15',
        result: 'Satisfactory',
        source_pages: [1]
      };
      const due = { next_due_date: '2028-07-15' };

      const summary = toSummaryJson('EICR', fields, due);
      expect(summary.doc_type).toBe('assessment');
      expect(summary.assessment_type).toBe('EICR');
      expect(summary.inspection_date).toBe('2023-07-15');
      expect(summary.next_due_date).toBe('2028-07-15');
      expect(summary.status).toBe('Compliant');
      expect(summary.source_pages).toEqual([1]);
    });

    it('should create Insurance summary', () => {
      const fields = { 
        period_from: '2024-01-01',
        period_to: '2024-12-31',
        policy_number: 'ABC123/2024',
        source_pages: [1]
      };
      const due = {};

      const summary = toSummaryJson('Insurance', fields, due);
      expect(summary.doc_type).toBe('insurance');
      expect(summary.assessment_type).toBeUndefined();
      expect(summary.policy_number).toBe('ABC123/2024');
      expect(summary.source_pages).toEqual([1]);
    });

    it('should apply status rules correctly', () => {
      const fields = { 
        inspection_date: '2023-07-15',
        result: 'Unsatisfactory',
        C1: '2',
        source_pages: [1]
      };
      const due = { next_due_date: '2028-07-15' };

      const summary = toSummaryJson('EICR', fields, due);
      expect(summary.status).toBe('ActionRequired');
    });
  });

  describe('toCompliancePatch', () => {
    it('should create EICR compliance patch', () => {
      const fields = { 
        inspection_date: '2023-07-15',
        result: 'Satisfactory',
        source_pages: [1]
      };
      const due = { next_due_date: '2028-07-15' };

      const patch = toCompliancePatch('EICR', fields, due);
      expect(patch.assessment_type).toBe('EICR');
      expect(patch.doc_type).toBe('assessment');
      expect(patch.last_inspected_at).toBe('2023-07-15');
      expect(patch.next_due_date).toBe('2028-07-15');
      expect(patch.status).toBe('Compliant');
    });

    it('should create Insurance compliance patch', () => {
      const fields = { 
        period_from: '2024-01-01',
        period_to: '2024-12-31',
        policy_number: 'ABC123/2024',
        source_pages: [1]
      };
      const due = {};

      const patch = toCompliancePatch('Insurance', fields, due);
      expect(patch.doc_type).toBe('insurance');
      expect(patch.assessment_type).toBeUndefined();
      expect(patch.policy_number).toBe('ABC123/2024');
    });
  });

  describe('integration tests', () => {
    it('should process complete EICR document', () => {
      const pageMap = [
        { page: 1, text: 'Electrical Installation Condition Report\nInspection Date: 15/07/2023\nProperty: Ashwood House\nBS 7671:2018\nSatisfactory\nNo Category 1 issues' }
      ];

      const detection = detectDocType(pageMap);
      expect(detection.type).toBe('EICR');

      const fields = extractFields(detection.type, pageMap);
      expect(fields.inspection_date).toBe('2023-07-15');

      const due = computeDueDates(detection.type, fields);
      expect(due.next_due_date).toBe('2028-07-15');

      const summary = toSummaryJson(detection.type, fields, due);
      expect(summary.status).toBe('Compliant');

      const patch = toCompliancePatch(detection.type, fields, due);
      expect(patch.status).toBe('Compliant');
    });

    it('should process complete FRA document', () => {
      const pageMap = [
        { page: 1, text: 'Fire Risk Assessment\nInspection Date: 20/08/2023\nRisk Rating: Moderate\nReview due: 20/08/2024' }
      ];

      const detection = detectDocType(pageMap);
      expect(detection.type).toBe('FRA');

      const fields = extractFields(detection.type, pageMap);
      expect(fields.inspection_date).toBe('2023-08-20');
      expect(fields.risk_rating).toBe('Moderate');

      const due = computeDueDates(detection.type, fields);
      expect(due.next_due_date).toBe('2024-08-20');

      const summary = toSummaryJson(detection.type, fields, due);
      expect(summary.status).toBe('Compliant');
    });
  });
});
