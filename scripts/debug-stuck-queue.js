#!/usr/bin/env node

/**
 * Debug Stuck Queue - Investigate why jobs are sticking in QUEUED status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STUCK_JOB_ID = 'e72f05c0-cfb3-4a90-92ce-8eb19bee6b54';

async function debugStuckQueue() {
  console.log('🔍 Debugging stuck QUEUED job...\n');

  try {
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', STUCK_JOB_ID)
      .single();

    if (jobError || !job) {
      console.log('❌ Job not found:', jobError?.message);
      return;
    }

    console.log('📊 Job Details:');
    console.log(`   - ID: ${job.id}`);
    console.log(`   - Filename: ${job.filename}`);
    console.log(`   - Status: ${job.status}`);
    console.log(`   - Created: ${job.created_at}`);
    console.log(`   - Updated: ${job.updated_at}`);
    console.log(`   - User ID: ${job.user_id}`);
    console.log(`   - Size: ${job.size_bytes} bytes`);

    // Check how long it's been stuck
    const createdTime = new Date(job.created_at).getTime();
    const updatedTime = new Date(job.updated_at).getTime();
    const ageMinutes = Math.round((Date.now() - createdTime) / (1000 * 60));
    const staleMinutes = Math.round((Date.now() - updatedTime) / (1000 * 60));

    console.log(`   - Age: ${ageMinutes} minutes`);
    console.log(`   - Stale for: ${staleMinutes} minutes`);

    if (job.status === 'QUEUED' && staleMinutes > 2) {
      console.log('\n⚠️  ISSUE: Job stuck in QUEUED status');
      console.log('   This suggests the background processing setTimeout never triggered');
      console.log('   or there was an error in the upload endpoint');
    }

    // Try to manually trigger the processing
    console.log('\n🔄 Attempting to manually trigger processing...');
    
    // Update to OCR status first
    const { error: updateError } = await supabase
      .from('document_jobs')
      .update({
        status: 'OCR',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.log('❌ Failed to update job status:', updateError.message);
      return;
    }

    console.log('✅ Updated job status to OCR');

    // Check if file exists in storage
    console.log('\n📁 Checking file in storage...');
    const expectedPath = `lease-lab/${job.id}.pdf`;
    
    const { data: fileList, error: listError } = await supabase.storage
      .from('building_documents')
      .list('lease-lab', {
        search: job.id
      });

    if (listError) {
      console.log('❌ Storage error:', listError.message);
    } else if (fileList && fileList.length > 0) {
      console.log('✅ File found in storage:');
      fileList.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size} bytes)`);
      });

      // Try to trigger OCR processing
      console.log('\n🔍 Triggering OCR processing...');
      
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      
      const ocrResponse = await fetch('https://www.blociq.co.uk/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storageKey: expectedPath,
          filename: job.filename,
          mime: job.mime,
          use_google_vision: true
        })
      });

      console.log(`📨 OCR response: ${ocrResponse.status}`);

      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json();
        console.log('✅ OCR succeeded:');
        console.log(`   - Text length: ${ocrResult.textLength}`);
        console.log(`   - Source: ${ocrResult.source}`);

        // Update job with extracted text
        const { error: extractUpdateError } = await supabase
          .from('document_jobs')
          .update({
            status: 'EXTRACT',
            extracted_text: ocrResult.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (extractUpdateError) {
          console.log('❌ Failed to update with extracted text:', extractUpdateError.message);
        } else {
          console.log('✅ Job updated with extracted text');

          // Try AI analysis
          console.log('\n🤖 Triggering AI analysis...');
          
          const aiResponse = await fetch('https://www.blociq.co.uk/api/lease-lab/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId: job.id,
              extractedText: ocrResult.text,
              filename: job.filename,
              mime: job.mime,
              userId: job.user_id
            })
          });

          console.log(`📨 AI analysis response: ${aiResponse.status}`);

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            console.log('✅ AI analysis succeeded');

            // Final update to READY
            const { error: finalUpdateError } = await supabase
              .from('document_jobs')
              .update({
                status: 'READY',
                summary_json: aiResult.summary,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);

            if (finalUpdateError) {
              console.log('❌ Failed final update:', finalUpdateError.message);
            } else {
              console.log('🎉 Job manually completed successfully!');
            }
          } else {
            const aiError = await aiResponse.text();
            console.log('❌ AI analysis failed:', aiError);
          }
        }
      } else {
        const ocrError = await ocrResponse.text();
        console.log('❌ OCR failed:', ocrError);
      }

    } else {
      console.log('❌ File not found in storage - upload may have failed');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugStuckQueue();