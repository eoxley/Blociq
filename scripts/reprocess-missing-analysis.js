#!/usr/bin/env node

/**
 * Script to reprocess jobs that are READY but missing analysis
 * This fixes existing completed jobs that don't have summary_json data
 */

console.log('🔄 Reprocessing jobs with missing analysis...');
console.log('');

console.log(`
🛠️  REPROCESSING INSTRUCTIONS

To reprocess jobs missing analysis on production:

1. 📋 First, identify jobs that need reprocessing:
   - Visit: https://www.blociq.co.uk/api/lease-lab/jobs
   - Look for jobs with status 'READY' but no summary_json field

2. 🔄 For each job that needs reprocessing:
   - Note the job ID and filename
   - Make a POST request to reprocess:

   curl -X POST "https://www.blociq.co.uk/api/lease-lab/analyze" \\
     -H "Content-Type: application/json" \\
     -d '{
       "jobId": "JOB_ID_HERE",
       "extractedText": "...",
       "filename": "filename.pdf",
       "mime": "application/pdf",
       "userId": "USER_ID"
     }'

3. ✅ Verify the fix:
   - Check the job again: https://www.blociq.co.uk/api/lease-lab/jobs/JOB_ID
   - Should now have summary_json field populated
   - Analysis should appear in the UI

🔍 Example job ID from your logs: 33a7d419-1ec2-45a1-adcc-fa7f98c984d7

💡 Alternative approach:
   - Upload a new test document to see if new uploads work correctly
   - If they do, the fix is working for new uploads
   - Old jobs may need manual reprocessing or can be deleted

⚠️  Note: Reprocessing requires the original extracted text to be available
    in the database. If extracted_text is missing, the job cannot be reprocessed.
`);

process.exit(0);