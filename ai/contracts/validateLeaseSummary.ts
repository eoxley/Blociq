import { z } from 'zod';
import { LeaseSummarySchema, DocumentSummarySchema, LeaseSummary, DocumentSummary } from './leaseSummary';

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Quality gate configuration
export interface QualityGates {
  requireClauseIndex: boolean;
  requireParties: boolean;
  requireTermStart: boolean;
  requireDemisedParts: boolean;
  requireServiceChargeApportionment: boolean;
  maxUnknownFields: number;
  requireSourcePages: boolean;
}

// Default quality gates for leases
export const DEFAULT_LEASE_QUALITY_GATES: QualityGates = {
  requireClauseIndex: true,
  requireParties: true,
  requireTermStart: true,
  requireDemisedParts: true,
  requireServiceChargeApportionment: true,
  maxUnknownFields: 10,
  requireSourcePages: true
};

// Linter rules for data consistency
export interface LinterRule {
  name: string;
  check: (summary: DocumentSummary) => ValidationWarning[];
  severity: 'warning' | 'error';
}

// Linter rules implementation
export const LINTER_RULES: LinterRule[] = [
  {
    name: 'windows_repair_consistency',
    check: (summary) => {
      const warnings: ValidationWarning[] = [];
      
      if (summary.doc_type === 'lease') {
        const lease = summary as LeaseSummary;
        
        // Check if repair matrix mentions windows but premises doesn't include window parts
        const hasWindowsRepair = lease.repair_matrix?.some(item => 
          item.item.toLowerCase().includes('window')
        );
        
        const hasWindowParts = lease.premises?.demised_parts?.some(part => 
          part.toLowerCase().includes('window')
        );
        
        if (hasWindowsRepair && !hasWindowParts) {
          warnings.push({
            field: 'premises.demised_parts',
            message: 'Repair matrix mentions windows but premises does not specify window parts',
            suggestion: 'Consider adding windows_in/windows_out to demised_parts or clarify repair responsibility'
          });
        }
      }
      
      return warnings;
    },
    severity: 'warning'
  },
  
  {
    name: 'section20_method_consistency',
    check: (summary) => {
      const warnings: ValidationWarning[] = [];
      
      if (summary.doc_type === 'lease') {
        const lease = summary as LeaseSummary;
        
        if (lease.section20?.consultation_required === 'yes' && !lease.section20?.method_reference) {
          warnings.push({
            field: 'section20.method_reference',
            message: 'Section 20 consultation required but no method reference provided',
            suggestion: 'Add clause reference or schedule reference for consultation method'
          });
        }
      }
      
      return warnings;
    },
    severity: 'warning'
  },
  
  {
    name: 'managing_agent_notice_address',
    check: (summary) => {
      const warnings: ValidationWarning[] = [];
      
      if (summary.doc_type === 'lease') {
        const lease = summary as LeaseSummary;
        
        const hasManagingAgent = lease.parties?.some(party => party.role === 'managing_agent');
        const hasNoticeAddresses = lease.consents_notices?.notice_addresses?.length > 0;
        
        if (hasManagingAgent && !hasNoticeAddresses) {
          warnings.push({
            field: 'consents_notices.notice_addresses',
            message: 'Managing agent identified but no notice addresses provided',
            suggestion: 'Add notice addresses for proper correspondence handling'
          });
        }
      }
      
      return warnings;
    },
    severity: 'warning'
  },
  
  {
    name: 'ground_rent_review_consistency',
    check: (summary) => {
      const warnings: ValidationWarning[] = [];
      
      if (summary.doc_type === 'lease') {
        const lease = summary as LeaseSummary;
        
        if (lease.financials?.ground_rent?.review_basis === 'unknown') {
          const isInUnknowns = lease.unknowns?.some(unknown => 
            unknown.field_path === 'financials.ground_rent.review_basis'
          );
          
          if (!isInUnknowns) {
            warnings.push({
              field: 'unknowns',
              message: 'Ground rent review basis is unknown but not listed in unknowns',
              suggestion: 'Add financials.ground_rent.review_basis to unknowns array'
            });
          }
        }
      }
      
      return warnings;
    },
    severity: 'warning'
  }
];

// Main validation function
export function validateLeaseSummary(
  data: unknown,
  qualityGates: QualityGates = DEFAULT_LEASE_QUALITY_GATES
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Step 1: Zod schema validation
  const schemaResult = DocumentSummarySchema.safeParse(data);
  
  if (!schemaResult.success) {
    schemaResult.error.issues.forEach(issue => {
      errors.push({
        field: issue.path.join('.'),
        message: issue.message,
        severity: 'error'
      });
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      qualityScore: 0
    };
  }
  
  const summary = schemaResult.data;
  
  // Step 2: Quality gate validation
  if (summary.doc_type === 'lease') {
    const lease = summary as LeaseSummary;
    
    // Required fields for leases
    if (qualityGates.requireParties && (!lease.parties || lease.parties.length === 0)) {
      errors.push({
        field: 'parties',
        message: 'Parties array is required for lease documents',
        severity: 'critical'
      });
    }
    
    if (qualityGates.requireTermStart && !lease.term?.start) {
      errors.push({
        field: 'term.start',
        message: 'Lease start date is required',
        severity: 'critical'
      });
    }
    
    if (qualityGates.requireDemisedParts && (!lease.premises?.demised_parts || lease.premises.demised_parts.length === 0)) {
      errors.push({
        field: 'premises.demised_parts',
        message: 'Demised parts are required for lease documents',
        severity: 'critical'
      });
    }
    
    if (qualityGates.requireServiceChargeApportionment && !lease.financials?.service_charge?.apportionment) {
      errors.push({
        field: 'financials.service_charge.apportionment',
        message: 'Service charge apportionment method is required for lease documents',
        severity: 'critical'
      });
    }
    
    if (qualityGates.requireClauseIndex && (!lease.clause_index || lease.clause_index.length === 0)) {
      errors.push({
        field: 'clause_index',
        message: 'Clause index is required for lease documents',
        severity: 'critical'
      });
    }
    
    // Unknown fields limit
    if (lease.unknowns && lease.unknowns.length > qualityGates.maxUnknownFields) {
      warnings.push({
        field: 'unknowns',
        message: `Too many unknown fields (${lease.unknowns.length}/${qualityGates.maxUnknownFields})`,
        suggestion: 'Consider improving extraction logic or accepting partial data'
      });
    }
    
    // Source page validation
    if (qualityGates.requireSourcePages) {
      const missingSources = findMissingSourcePages(lease);
      if (missingSources.length > 0) {
        warnings.push({
          field: 'sources',
          message: `Missing source page references: ${missingSources.join(', ')}`,
          suggestion: 'Add page references to improve traceability'
        });
      }
    }
  }
  
  // Step 3: Linter rules
  LINTER_RULES.forEach(rule => {
    const ruleWarnings = rule.check(summary);
    warnings.push(...ruleWarnings);
  });
  
  // Step 4: Calculate quality score
  const qualityScore = calculateQualityScore(summary, errors, warnings);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    qualityScore
  };
}

// Helper function to find missing source pages
function findMissingSourcePages(lease: LeaseSummary): string[] {
  const missing: string[] = [];
  
  // Check parties
  lease.parties?.forEach((party, index) => {
    if (!party.source?.page) {
      missing.push(`parties[${index}].source.page`);
    }
  });
  
  // Check term
  if (lease.term && !lease.term.source?.page) {
    missing.push('term.source.page');
  }
  
  // Check premises
  if (lease.premises && !lease.premises.source?.page) {
    missing.push('premises.source.page');
  }
  
  // Check financials
  if (lease.financials?.ground_rent && !lease.financials.ground_rent.source?.page) {
    missing.push('financials.ground_rent.source.page');
  }
  
  if (lease.financials?.service_charge && !lease.financials.service_charge.source?.page) {
    missing.push('financials.service_charge.source.page');
  }
  
  // Check repair matrix
  lease.repair_matrix?.forEach((item, index) => {
    if (!item.source?.page) {
      missing.push(`repair_matrix[${index}].source.page`);
    }
  });
  
  // Check use restrictions
  lease.use_restrictions?.forEach((restriction, index) => {
    if (!restriction.source?.page) {
      missing.push(`use_restrictions[${index}].source.page`);
    }
  });
  
  return missing;
}

// Calculate quality score (0-100)
function calculateQualityScore(
  summary: DocumentSummary,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): number {
  let score = 100;
  
  // Deduct points for errors
  errors.forEach(error => {
    if (error.severity === 'critical') {
      score -= 20;
    } else {
      score -= 10;
    }
  });
  
  // Deduct points for warnings
  warnings.forEach(warning => {
    score -= 5;
  });
  
  // Bonus points for completeness
  if (summary.doc_type === 'lease') {
    const lease = summary as LeaseSummary;
    
    // Check for key completeness indicators
    if (lease.clause_index && lease.clause_index.length > 10) {
      score += 5; // Bonus for comprehensive clause index
    }
    
    if (lease.repair_matrix && lease.repair_matrix.length > 5) {
      score += 5; // Bonus for detailed repair matrix
    }
    
    if (lease.use_restrictions && lease.use_restrictions.length > 3) {
      score += 5; // Bonus for comprehensive use restrictions
    }
    
    if (lease.unknowns && lease.unknowns.length === 0) {
      score += 10; // Bonus for no unknown fields
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

// Validation for specific document types
export function validateLeaseDocument(data: unknown): ValidationResult {
  return validateLeaseSummary(data, DEFAULT_LEASE_QUALITY_GATES);
}

export function validateScopeDocument(data: unknown): ValidationResult {
  const scopeGates: QualityGates = {
    requireClauseIndex: false,
    requireParties: false,
    requireTermStart: false,
    requireDemisedParts: false,
    requireServiceChargeApportionment: false,
    maxUnknownFields: 5,
    requireSourcePages: true
  };
  
  return validateLeaseSummary(data, scopeGates);
}

export function validateAssessmentDocument(data: unknown): ValidationResult {
  const assessmentGates: QualityGates = {
    requireClauseIndex: false,
    requireParties: false,
    requireTermStart: false,
    requireDemisedParts: false,
    requireServiceChargeApportionment: false,
    maxUnknownFields: 3,
    requireSourcePages: true
  };
  
  return validateLeaseSummary(data, assessmentGates);
}

// Utility function to get validation summary
export function getValidationSummary(result: ValidationResult): string {
  const { isValid, errors, warnings, qualityScore } = result;
  
  let summary = `Validation ${isValid ? 'PASSED' : 'FAILED'} (Quality Score: ${qualityScore}/100)\n`;
  
  if (errors.length > 0) {
    summary += `\nErrors (${errors.length}):\n`;
    errors.forEach(error => {
      summary += `  - ${error.field}: ${error.message}\n`;
    });
  }
  
  if (warnings.length > 0) {
    summary += `\nWarnings (${warnings.length}):\n`;
    warnings.forEach(warning => {
      summary += `  - ${warning.field}: ${warning.message}\n`;
      if (warning.suggestion) {
        summary += `    Suggestion: ${warning.suggestion}\n`;
      }
    });
  }
  
  return summary;
}

// Export types for external use
export type { ValidationResult, ValidationError, ValidationWarning, QualityGates };
