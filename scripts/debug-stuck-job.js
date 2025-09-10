#!/usr/bin/env node

/**
 * Debug Stuck Job - Investigate the specific OCR job that's stalled
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STUCK_JOB_ID = '6c8ae83a-40ed-40d3-9296-ee1f7a148812';

async function debugStuckJob() {
  console.log(`🔍 Debugging stuck job: ${STUCK_JOB_ID}\n`);

  try {
    // Step 1: Get job details
    console.log('1️⃣ Getting job details...');
    const { data: job, error: jobError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('id', STUCK_JOB_ID)
      .single();

    if (jobError || !job) {
      console.log('   ❌ Job not found:', jobError?.message);
      return;
    }

    console.log('   ✅ Job found:');
    console.log(`      - ID: ${job.id}`);
    console.log(`      - Filename: ${job.filename}`);
    console.log(`      - Status: ${job.status}`);
    console.log(`      - Created: ${job.created_at}`);
    console.log(`      - Updated: ${job.updated_at}`);
    console.log(`      - Size: ${job.size_bytes} bytes`);
    console.log(`      - MIME: ${job.mime}`);
    console.log(`      - User ID: ${job.user_id}`);

    // Step 2: Check if file exists in storage
    console.log('\n2️⃣ Checking file in storage...');
    const expectedFilePath = `lease-lab/${job.id}.pdf`;
    console.log(`   Expected file path: ${expectedFilePath}`);

    const { data: fileInfo, error: fileError } = await supabase.storage
      .from('building_documents')
      .list('lease-lab', {
        limit: 100,
        search: job.id
      });

    if (fileError) {
      console.log('   ❌ Storage error:', fileError.message);
    } else if (fileInfo && fileInfo.length > 0) {
      console.log('   ✅ File found in storage:');
      fileInfo.forEach(file => {
        console.log(`      - ${file.name} (${file.metadata?.size} bytes, ${file.created_at})`);
      });
    } else {
      console.log('   ❌ File not found in storage');
    }

    // Step 3: Try to process this job manually
    console.log('\n3️⃣ Testing OCR processing manually...');
    
    const ocrPayload = {
      storageKey: expectedFilePath,
      filename: job.filename,
      mime: job.mime,
      use_google_vision: true
    };

    console.log('   📤 Sending OCR request with payload:', ocrPayload);

    try {
      const ocrResponse = await fetch('https://www.blociq.co.uk/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ocrPayload)
      });

      console.log(`   📨 OCR response status: ${ocrResponse.status}`);
      
      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json();
        console.log('   ✅ OCR succeeded:');
        console.log(`      - Success: ${ocrResult.success}`);
        console.log(`      - Text length: ${ocrResult.textLength || 'unknown'}`);
        console.log(`      - Source: ${ocrResult.source || 'unknown'}`);
        console.log(`      - Processing mode: ${ocrResult.processingMode || 'unknown'}`);
        
        if (ocrResult.text) {
          console.log(`      - Text preview: "${ocrResult.text.substring(0, 100)}..."`);
          
          // Step 4: Try AI analysis
          console.log('\n4️⃣ Testing AI analysis...');
          
          const aiPayload = {
            jobId: job.id,
            extractedText: ocrResult.text,
            filename: job.filename,
            mime: job.mime,
            userId: job.user_id
          };

          try {
            const aiResponse = await fetch('https://www.blociq.co.uk/api/lease-lab/analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(aiPayload)
            });

            console.log(`   📨 AI response status: ${aiResponse.status}`);
            
            if (aiResponse.ok) {
              const aiResult = await aiResponse.json();
              console.log('   ✅ AI analysis succeeded:');
              console.log(`      - Success: ${aiResult.success}`);
              console.log(`      - Analysis length: ${aiResult.analysisLength}`);
              console.log(`      - Summary keys: ${Object.keys(aiResult.summary || {}).join(', ')}`);
              
              // Step 5: Update the job to READY
              console.log('\n5️⃣ Updating job to READY...');
              
              const { error: updateError } = await supabase
                .from('document_jobs')
                .update({
                  status: 'READY',
                  extracted_text: ocrResult.text,
                  summary_json: aiResult.summary,
                  updated_at: new Date().toISOString()
                })
                .eq('id', job.id);
              
              if (updateError) {
                console.log('   ❌ Failed to update job:', updateError.message);
              } else {
                console.log('   ✅ Job successfully updated to READY!');
              }
              
            } else {
              const aiError = await aiResponse.text();
              console.log('   ❌ AI analysis failed:', aiError);
            }
            
          } catch (aiError) {
            console.log('   ❌ AI analysis error:', aiError.message);
          }
        }
        
      } else {
        const ocrError = await ocrResponse.text();
        console.log('   ❌ OCR failed:', ocrError);
      }
      
    } catch (ocrError) {
      console.log('   ❌ OCR error:', ocrError.message);
    }

    // Step 6: Final job status check
    console.log('\n6️⃣ Final job status check...');
    const { data: finalJob, error: finalError } = await supabase
      .from('document_jobs')
      .select('id, status, updated_at')
      .eq('id', STUCK_JOB_ID)
      .single();

    if (finalError) {
      console.log('   ❌ Could not check final status:', finalError.message);
    } else {
      console.log(`   📊 Final status: ${finalJob.status} (updated: ${finalJob.updated_at})`);
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugStuckJob();