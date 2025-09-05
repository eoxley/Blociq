# Background Lease Processing System - Setup Guide

## 🎯 Overview

This system transforms synchronous lease document processing into an asynchronous, reliable background service that handles large documents without timeout constraints.

## 📋 Architecture Components

### 1. Database Layer
- `lease_processing_jobs` - Main job queue table
- `lease_processing_job_history` - Audit trail
- Integration with existing `documents` and `lease_extractions` tables

### 2. API Endpoints
- `/api/lease-processing/upload` - Immediate file upload with job creation
- `/api/lease-processing/processor` - Background job processor
- `/api/lease-processing/status/[jobId]` - Job status checking
- `/api/lease-processing/results/[jobId]` - Results retrieval
- `/api/lease-processing/results/[jobId]/download` - File downloads
- `/api/cron/process-lease-jobs` - Cron job coordinator

### 3. Frontend Components
- `AsyncLeaseUpload.tsx` - Upload interface with real-time status
- `LeaseAnalysisResults.tsx` - Results display with download options

### 4. Services
- Email notification system with Resend integration
- Background job processing with retry logic
- File storage via Supabase Storage

## 🛠 Setup Instructions

### Step 1: Environment Variables

Add these to your `.env.local`:

```bash
# Background Processing
BACKGROUND_PROCESSOR_API_KEY=your-secure-api-key-here
CRON_SECRET=your-cron-secret-here
MAX_CONCURRENT_JOBS=3
JOB_RETENTION_DAYS=30

# Email Notifications (Resend)
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=noreply@blociq.co.uk

# Existing variables should already be configured:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# OPENAI_API_KEY
# GOOGLE_APPLICATION_CREDENTIALS_JSON
```

### Step 2: Database Migration

Run the migration to create the job queue tables:

```bash
# Apply the migration
supabase db push

# Or manually run the migration file:
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20250905000000_background_lease_processing.sql
```

### Step 3: Cron Job Setup

#### Option A: Vercel Cron (Recommended)
Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-lease-jobs",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

#### Option B: External Cron Service
Set up a cron job to call your endpoint every 2 minutes:

```bash
# Example crontab entry
*/2 * * * * curl -H "Authorization: Bearer your-cron-secret" https://your-domain.com/api/cron/process-lease-jobs
```

### Step 4: Frontend Integration

Replace your existing lease upload component with the async version:

```tsx
import AsyncLeaseUpload from '@/components/AsyncLeaseUpload';

// In your page component:
export default function LeaseUploadPage() {
  return (
    <div className="container mx-auto py-8">
      <AsyncLeaseUpload />
    </div>
  );
}
```

### Step 5: Results Page

Create a results page at `/app/lease-analysis/[jobId]/page.tsx`:

```tsx
import LeaseAnalysisResults from '@/components/LeaseAnalysisResults';

export default function LeaseAnalysisPage({ params }: { params: { jobId: string } }) {
  return <LeaseAnalysisResults jobId={params.jobId} />;
}
```

## 🔄 Workflow

### 1. User Upload
1. User uploads document via `AsyncLeaseUpload` component
2. File is stored in Supabase Storage
3. Job record created in `lease_processing_jobs` table
4. Immediate response returned with job ID

### 2. Background Processing
1. Cron job runs every 2 minutes
2. Checks for pending jobs and available processing slots
3. Starts background processors via `/api/lease-processing/processor`
4. Each processor:
   - Downloads file from storage
   - Runs OCR (Render service → OpenAI fallback)
   - Analyzes lease content with GPT
   - Updates job status and results
   - Sends email notification

### 3. Results Retrieval
1. User receives email when complete
2. Can check status via job ID
3. View comprehensive results
4. Download reports in multiple formats

## 📊 Monitoring & Management

### Job Statistics
```bash
# Get queue statistics
curl -H "Authorization: Bearer token" /api/lease-processing/processor

# Get specific job status  
curl -H "Authorization: Bearer token" /api/lease-processing/status/job-id

# Health check
curl /api/cron/process-lease-jobs -X POST
```

### Database Queries
```sql
-- Check job queue status
SELECT status, COUNT(*) 
FROM lease_processing_jobs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Get processing statistics
SELECT * FROM get_lease_processing_stats(NULL, 24);

-- View recent job history
SELECT * FROM lease_processing_job_history 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## 🚨 Error Handling

### Retry Logic
- Jobs automatically retry up to 3 times
- Exponential backoff between retries
- Manual retry option in UI

### Notification Failures
- Email failures don't affect job processing
- Notifications are retried on subsequent cron runs
- Failed notifications logged but don't fail jobs

### Storage Issues
- File download failures mark job as failed
- Storage cleanup for failed uploads
- Orphaned file detection and removal

## 🔐 Security Features

### Authentication
- JWT token validation for all endpoints
- Row Level Security (RLS) on all tables
- Users can only access their own jobs

### API Security
- Background processor requires API key
- Cron endpoints protected with secret
- Rate limiting on upload endpoints

### Data Privacy
- Personal data encrypted in transit and at rest
- Email addresses only used for notifications
- Job cleanup after retention period

## 📈 Performance Considerations

### Scaling
- Configurable concurrent job limits
- Horizontal scaling via multiple processors
- Database connection pooling

### Storage
- Automatic cleanup of old completed jobs
- File compression for large documents
- CDN integration for faster downloads

### Monitoring
- Job processing time tracking
- Success rate monitoring  
- Queue depth alerts

## 🧪 Testing

### Manual Testing
```bash
# Test email notifications
curl -X POST /api/test-email -H "Content-Type: application/json" -d '{"email":"your@email.com"}'

# Test job processor
curl -X POST /api/lease-processing/processor -H "Authorization: Bearer api-key"

# Test cron job
curl -X GET /api/cron/process-lease-jobs -H "Authorization: Bearer cron-secret"
```

### Integration Testing
1. Upload a test document
2. Monitor job progression through statuses
3. Verify email notification delivery
4. Test results retrieval and downloads
5. Confirm database state consistency

## 📞 Support & Troubleshooting

### Common Issues

**Jobs stuck in processing:**
- Check background processor logs
- Verify OCR service availability
- Restart stuck jobs manually

**Email notifications not sending:**
- Verify RESEND_API_KEY configuration
- Check FROM_EMAIL domain setup
- Monitor notification queue

**High memory usage:**
- Adjust MAX_CONCURRENT_JOBS
- Optimize file handling for large documents
- Monitor database connection pool

### Monitoring Dashboard
Consider implementing:
- Real-time job queue metrics
- Processing time trends  
- Error rate monitoring
- User activity analytics

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Cron job scheduled
- [ ] Email service configured
- [ ] Frontend components integrated
- [ ] Storage buckets configured
- [ ] Security policies tested
- [ ] Performance monitoring enabled
- [ ] Backup procedures established
- [ ] Documentation updated

## 🔮 Future Enhancements

### Planned Features
- WebSocket real-time updates
- Bulk document processing
- Advanced lease comparison
- Integration with property management systems
- Mobile app support

### Performance Improvements
- GPU-accelerated OCR processing
- Document pre-processing pipeline
- Intelligent retry strategies
- Predictive processing time estimation

---

## 📝 Implementation Summary

This background lease processing system provides:

✅ **Reliability** - No timeout issues, automatic retries  
✅ **Scalability** - Handles multiple concurrent jobs  
✅ **User Experience** - Immediate feedback, email notifications  
✅ **Monitoring** - Comprehensive status tracking and analytics  
✅ **Security** - Authentication, authorization, data privacy  
✅ **Maintenance** - Automatic cleanup, error handling  

The system transforms your lease processing from a timeout-prone synchronous operation into a robust, user-friendly background service that can handle documents of any size reliably.