# Lease Summary Contract Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Lease Lab → Ask BlocIQ Summary Contract system. The contract ensures consistent, source-verified responses across both AI systems.

## Implementation Checklist

### Phase 1: Core Contract System ✅
- [x] Create summary contract documentation (`docs/summary_contract.md`)
- [x] Implement Zod schemas (`ai/contracts/leaseSummary.ts`)
- [x] Create database view (`supabase/migrations/20250117000005_create_lease_summaries_view.sql`)
- [x] Build validation system (`ai/contracts/validateLeaseSummary.ts`)
- [x] Create Ask BlocIQ adapter (`ai/adapters/leaseSummaryToAnswer.ts`)

### Phase 2: API Integration ✅
- [x] Update Lease Lab job endpoint with validation
- [x] Integrate lease summary adapter in Ask BlocIQ API
- [x] Add contract validation to job responses

### Phase 3: Testing & Validation
- [ ] Run database migration
- [ ] Execute migration script
- [ ] Run acceptance tests
- [ ] Test end-to-end workflow

### Phase 4: Legacy Cleanup
- [ ] Remove deprecated UI components
- [ ] Update navigation links
- [ ] Clean up legacy API endpoints
- [ ] Remove deprecated database fields

## Quick Start

### 1. Run Database Migration

```bash
# Apply the lease summaries view migration
npx supabase db push
```

### 2. Test Contract Validation

```bash
# Run the acceptance tests
npm run test:acceptance:lease-contract
```

### 3. Migrate Existing Data

```bash
# Run the migration script
node scripts/migrate-to-lease-summary-contract.js
```

### 4. Test Lease Lab Integration

1. Upload a lease document to Lease Lab
2. Wait for processing to complete
3. Verify `summary_json` follows contract format
4. Check validation results in job details

### 5. Test Ask BlocIQ Integration

1. Link a lease analysis to a building
2. Ask questions about the lease (e.g., "Who is responsible for windows?")
3. Verify responses include source page references
4. Check that answers are contract-based

## Contract Schema Reference

### Required Fields for Leases

```typescript
{
  contract_version: "1.0.0",
  doc_type: "lease",
  normalised_building_name: "Ashwood House",
  parties: [/* at least one party */],
  identifiers: { address, unit, source },
  term: { start, end, length, source },
  premises: { demised_parts, source },
  financials: { service_charge: { apportionment, source } },
  clause_index: [/* at least one clause */]
}
```

### Quality Gates

- **Parties**: Must have at least one party
- **Term**: Must have start date
- **Premises**: Must have demised parts
- **Service Charge**: Must have apportionment method
- **Clause Index**: Must have at least one clause

### Source Verification

Every fact must include:
- `page`: Page number reference
- `span`: Optional text span (start/end positions)

## API Usage

### Lease Lab (Producer)

```typescript
// Job details include validation results
GET /api/lease-lab/jobs/:id
{
  "job": {
    "summary_json": { /* contract data */ },
    "validation": {
      "isValid": true,
      "qualityScore": 95,
      "errors": [],
      "warnings": []
    }
  }
}
```

### Ask BlocIQ (Consumer)

```typescript
// Questions about linked buildings automatically use lease analysis
POST /api/ask-ai
{
  "prompt": "Who is responsible for windows?",
  "building_id": "building-uuid"
}

// Response includes source verification
{
  "result": "Windows are the responsibility of the leaseholder",
  "metadata": {
    "source": "lease_analysis",
    "contract_based": true,
    "quality_score": 95
  }
}
```

## Database Queries

### Find Lease Analysis for Building

```sql
SELECT * FROM lease_summaries_v 
WHERE linked_building_id = 'building-uuid' 
  AND doc_type = 'lease' 
  AND status = 'READY'
ORDER BY created_at DESC 
LIMIT 1;
```

### Search Clauses by Topic

```sql
SELECT * FROM search_clauses_by_topic('Ashwood House', 'repairs');
```

### Get Repair Responsibilities

```sql
SELECT * FROM get_repair_responsibilities('Ashwood House', 'windows');
```

## Testing

### Unit Tests

```bash
# Test contract validation
npm run test:unit:lease-contract

# Test adapter functionality
npm run test:unit:lease-adapter
```

### Integration Tests

```bash
# Test end-to-end workflow
npm run test:integration:lease-workflow
```

### Acceptance Tests

```bash
# Test contract compliance
npm run test:acceptance:lease-contract
```

## Troubleshooting

### Common Issues

1. **Contract Validation Fails**
   - Check required fields are present
   - Verify source page references
   - Review quality gate requirements

2. **Ask BlocIQ Not Using Lease Analysis**
   - Ensure building is linked to lease job
   - Check job status is 'READY'
   - Verify contract validation passed

3. **Missing Source References**
   - Add page numbers to all facts
   - Include span positions for precise references
   - Update extraction logic to capture sources

### Debug Mode

Enable debug logging:

```bash
DEBUG=lease-contract:* npm run dev
```

### Validation Debugging

```typescript
import { validateLeaseDocument } from '@/ai/contracts/validateLeaseSummary';

const result = validateLeaseDocument(summaryData);
console.log('Validation result:', result);
console.log('Quality score:', result.qualityScore);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

## Performance Considerations

### Database Indexing

The migration creates optimized indexes:
- Building name (GIN)
- Document type
- Linked building/unit IDs
- Clause index (GIN)
- Repair matrix (GIN)
- Use restrictions (GIN)

### Query Optimization

- Use the `lease_summaries_v` view for fast queries
- Leverage database functions for common searches
- Cache frequently accessed contract data

### Response Time Targets

- Contract validation: < 100ms
- Ask BlocIQ response: < 2s
- Lease Lab processing: < 5min
- Database queries: < 500ms

## Security Considerations

### Data Validation

- All contract data is validated with Zod schemas
- Source references are required for all facts
- Unknown fields are explicitly tracked

### Access Control

- RLS policies protect lease summaries
- Agency-scoped access controls
- User authentication required

### Audit Trail

- All contract changes are logged
- Source verification provides traceability
- Quality scores track data completeness

## Monitoring

### Key Metrics

- Contract validation pass rate
- Ask BlocIQ response accuracy
- Source verification coverage
- User satisfaction scores

### Alerts

- Contract validation failures
- Missing source references
- Low quality scores
- API response timeouts

## Rollback Plan

### Emergency Rollback

1. Disable contract validation
2. Revert to legacy processing
3. Restore confidence-based responses
4. Notify users of temporary limitations

### Data Recovery

1. Restore from database backups
2. Re-run legacy extraction
3. Re-generate confidence scores
4. Restore legacy UI components

## Support

### Documentation

- Contract specification: `docs/summary_contract.md`
- API reference: `docs/api-reference.md`
- Troubleshooting guide: `docs/troubleshooting.md`

### Contact

- Technical issues: Create GitHub issue
- Business questions: Contact product team
- Emergency support: Use rollback procedures

## Future Enhancements

### Planned Features

- Advanced clause search with embeddings
- Automated action item generation
- Multi-language contract support
- Real-time contract updates

### Extension Points

- Custom validation rules
- Additional document types
- Enhanced source tracking
- Advanced analytics

---

**Last Updated**: January 17, 2025
**Version**: 1.0.0
**Status**: Implementation Complete
