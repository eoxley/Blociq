# Lease Analysis Deprecations

This document lists all fields, components, and functionality that are being removed or deprecated as part of the Lease Lab → Ask BlocIQ Summary Contract implementation.

## Deprecated UI Components

### Components to Remove
- `components/LeaseAnalysisResults.tsx` - Replace with contract-based display
- `components/LeaseProcessingStatus.tsx` - Integrate into Lease Lab
- `components/LeaseUploadWidget.tsx` - Replace with Lease Lab upload
- `components/CompactLeaseProcessingWidget.tsx` - Update to use Lease Lab
- `components/AsyncLeaseUpload.tsx` - Replace with Lease Lab upload
- `components/SimpleLeaseUpload.tsx` - Replace with Lease Lab upload

### Navigation Items to Remove
- "Lease Processing" from main navigation
- "Lease Status Dashboard" page
- "Lease Processing History" page
- "Lease Analysis" results page

### Routes to Remove
- `/lease-status-dashboard` - Redirect to `/lease-lab`
- `/lease-processing-history` - Redirect to `/lease-lab`
- `/lease-analysis/[jobId]` - Redirect to `/lease-lab`

## Deprecated API Endpoints

### Endpoints to Remove
- `POST /api/lease-processing/upload` - Replace with `POST /api/lease-lab/upload`
- `GET /api/lease-processing/results/[jobId]` - Replace with `GET /api/lease-lab/jobs/[id]`
- `GET /api/lease-processing/status/[jobId]` - Replace with job status in Lease Lab
- `POST /api/lease-processing/processor` - Replace with background processing

### Legacy Query Endpoints
- `GET /api/ask-ai/lease-query` - Replace with contract-based queries
- `POST /api/ask-ai/upload` - Replace with Lease Lab upload
- `GET /api/ask-ai/document/[id]` - Replace with Lease Lab job details

## Deprecated Database Tables

### Tables to Remove
- `lease_analysis` - Replace with `document_jobs.summary_json`
- `lease_processing_jobs` - Replace with `document_jobs`
- `lease_analysis_results` - Replace with `document_jobs.summary_json`

### Columns to Remove
- `confidence_percentage` - Replace with source verification
- `extraction_confidence` - Replace with source verification
- `ai_confidence_score` - Replace with source verification
- `processing_status` - Replace with `document_jobs.status`

## Deprecated Data Fields

### Legacy Analysis Fields
- `landlord_name` → `parties[].name` where `role="landlord"`
- `leaseholder_name` → `parties[].name` where `role="leaseholder"`
- `lease_start_date` → `term.start`
- `lease_end_date` → `term.end`
- `lease_length` → `term.length`
- `ground_rent_amount` → `financials.ground_rent.amount`
- `service_charge_apportionment` → `financials.service_charge.apportionment`
- `repair_obligations` → `repair_matrix[]`
- `pet_policy` → `use_restrictions[]` where `topic="pets"`
- `alteration_consent` → `use_restrictions[]` where `topic="alterations"`
- `subletting_rules` → `use_restrictions[]` where `topic="subletting"`

### Legacy UI Fields
- `confidence_score` - Remove confidence percentage displays
- `extraction_status` - Replace with job status
- `processing_time` - Replace with job timestamps
- `ai_model_used` - Replace with source verification
- `extraction_method` - Replace with source verification

## Deprecated Processing Logic

### Hybrid Processing Paths
- Inline OCR processing - Move to background processing
- Confidence scoring algorithms - Replace with source verification
- Ad-hoc response generation - Replace with contract-based responses
- Legacy extraction methods - Replace with contract-compliant extraction

### Legacy Analysis Functions
- `calculateConfidenceScore()` - Remove
- `generateAdHocResponse()` - Replace with contract adapter
- `extractLegacyFields()` - Replace with contract mapping
- `validateLegacyData()` - Replace with contract validation

## Deprecated UI Patterns

### Confidence Displays
- Remove all confidence percentage displays
- Remove confidence bars and progress indicators
- Remove "AI confidence" labels
- Replace with source verification indicators

### Legacy Status Indicators
- Remove "Processing..." status displays
- Remove "Extracting..." status displays
- Remove "Analyzing..." status displays
- Replace with contract-based status

### Legacy Error Handling
- Remove generic error messages
- Remove confidence-based error handling
- Replace with contract validation errors
- Add source verification error handling

## Deprecated Configuration

### Environment Variables
- `LEASE_PROCESSING_ENABLED` - Remove
- `CONFIDENCE_THRESHOLD` - Remove
- `EXTRACTION_TIMEOUT` - Remove
- `AI_MODEL_VERSION` - Remove

### Feature Flags
- `ENABLE_LEGACY_ANALYSIS` - Remove
- `ENABLE_CONFIDENCE_SCORING` - Remove
- `ENABLE_HYBRID_PROCESSING` - Remove

## Migration Strategy

### Phase 1: Contract Implementation
1. ✅ Implement Zod schemas
2. ✅ Create database view
3. ✅ Update Lease Lab to produce contract-compliant summaries
4. ✅ Create Ask BlocIQ adapter

### Phase 2: Legacy Cleanup
1. Remove deprecated UI components
2. Remove deprecated API endpoints
3. Remove deprecated database tables
4. Update all references to use new contract

### Phase 3: Testing and Validation
1. Test contract validation
2. Test Ask BlocIQ adapter
3. Test Lease Lab integration
4. Validate source verification

### Phase 4: Documentation Update
1. Update API documentation
2. Update user guides
3. Update developer documentation
4. Update deployment guides

## Replacement Mappings

### UI Components
| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `LeaseAnalysisResults` | `AnalysisDrawer` | Use contract-based display |
| `LeaseProcessingStatus` | `JobsList` | Use job status from Lease Lab |
| `LeaseUploadWidget` | `UploadPanel` | Use Lease Lab upload |

### API Endpoints
| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `/api/lease-processing/upload` | `/api/lease-lab/upload` | Use Lease Lab upload |
| `/api/lease-processing/results/[jobId]` | `/api/lease-lab/jobs/[id]` | Use Lease Lab job details |
| `/api/ask-ai/lease-query` | Contract-based queries | Use adapter for responses |

### Database Fields
| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `confidence_percentage` | Source verification | Use page references |
| `extraction_confidence` | Source verification | Use span references |
| `ai_confidence_score` | Source verification | Use contract validation |

## Backward Compatibility

### Graceful Degradation
- Legacy data should be migrated to new format where possible
- Missing contract fields should be handled gracefully
- Unknown fields should be preserved in `unknowns` array

### Error Handling
- Validation failures should not crash the system
- Missing contract data should return safe responses
- Legacy data should be flagged for review

### User Experience
- Users should be guided to use Lease Lab for new uploads
- Legacy analysis should be clearly marked as outdated
- New contract-based responses should be clearly identified

## Testing Checklist

### Component Removal
- [ ] Remove deprecated UI components
- [ ] Update navigation to use Lease Lab
- [ ] Test redirects from old routes
- [ ] Verify no broken links

### API Cleanup
- [ ] Remove deprecated endpoints
- [ ] Update client code to use new endpoints
- [ ] Test error handling for removed endpoints
- [ ] Verify no orphaned API calls

### Database Cleanup
- [ ] Remove deprecated tables
- [ ] Migrate data to new format
- [ ] Update queries to use new schema
- [ ] Test data integrity

### Contract Integration
- [ ] Test contract validation
- [ ] Test Ask BlocIQ adapter
- [ ] Test Lease Lab integration
- [ ] Verify source verification

## Rollback Plan

### Emergency Rollback
1. Re-enable legacy processing paths
2. Restore deprecated API endpoints
3. Revert to confidence-based responses
4. Disable contract validation

### Data Recovery
1. Restore from database backups
2. Re-run legacy extraction
3. Re-generate confidence scores
4. Restore legacy UI components

### User Communication
1. Notify users of temporary rollback
2. Explain impact on functionality
3. Provide timeline for resolution
4. Offer alternative solutions

## Success Metrics

### Performance
- Contract validation time < 100ms
- Ask BlocIQ response time < 2s
- Lease Lab processing time < 5min
- Database query time < 500ms

### Quality
- Source verification coverage > 95%
- Contract validation pass rate > 90%
- User satisfaction > 4.5/5
- Error rate < 1%

### Adoption
- Lease Lab usage > 80% of uploads
- Contract-based responses > 90%
- Legacy system usage < 10%
- User migration rate > 95%
