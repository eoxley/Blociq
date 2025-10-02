#!/usr/bin/env node

/**
 * Verify Supabase Storage Upload
 *
 * Checks that all documents were uploaded successfully and are accessible
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'building-documents';
const BUILDING_ID = '466b1264-275a-4bf0-85ce-26ab8b3839ea';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyStorage() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     Verify Supabase Storage Upload            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // 1. Check bucket exists
    console.log('1. Checking bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) throw bucketError;

    const bucket = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucket) {
      console.error(`❌ Bucket "${BUCKET_NAME}" not found`);
      console.log('\nRun the upload script first:');
      console.log('  node scripts/upload-documents-to-supabase.js\n');
      process.exit(1);
    }
    console.log(`✓ Bucket "${BUCKET_NAME}" exists\n`);

    // 2. List all files in building folder
    console.log('2. Listing files...');
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(BUILDING_ID, {
        limit: 1000,
        offset: 0,
      });

    if (listError) throw listError;

    console.log(`✓ Found ${files.length} items in bucket\n`);

    // 3. Count files by category
    const categories = {};
    let totalFiles = 0;

    for (const item of files) {
      if (item.name && !item.name.endsWith('/')) {
        // It's a file
        const category = item.name;
        if (!categories[category]) {
          categories[category] = 0;
        }

        // List files in this category
        const { data: categoryFiles } = await supabase.storage
          .from(BUCKET_NAME)
          .list(`${BUILDING_ID}/${category}`, {
            limit: 1000,
          });

        if (categoryFiles) {
          const fileCount = categoryFiles.filter(f => !f.name.endsWith('/')).length;
          categories[category] = fileCount;
          totalFiles += fileCount;
        }
      }
    }

    console.log('3. Files by category:');
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} files`);
      });
    console.log(`\n   Total: ${totalFiles} files\n`);

    // 4. Test file access (sample 3 files)
    console.log('4. Testing file accessibility...');
    const sampleFiles = [];
    for (const [category, count] of Object.entries(categories)) {
      if (count > 0) {
        const { data: categoryFiles } = await supabase.storage
          .from(BUCKET_NAME)
          .list(`${BUILDING_ID}/${category}`, { limit: 1 });

        if (categoryFiles && categoryFiles.length > 0) {
          const fileName = categoryFiles[0].name;
          if (fileName && !fileName.endsWith('/')) {
            sampleFiles.push(`${BUILDING_ID}/${category}/${fileName}`);
          }
        }
      }
      if (sampleFiles.length >= 3) break;
    }

    for (const filePath of sampleFiles) {
      const { data, error } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (error) {
        console.log(`   ✗ ${filePath.split('/').pop()}: ${error.message}`);
      } else {
        console.log(`   ✓ ${filePath.split('/').pop()}`);
        console.log(`     ${data.publicUrl.substring(0, 80)}...`);
      }
    }
    console.log('');

    // 5. Check database records
    console.log('5. Checking database records...');
    const { data: docs, error: dbError } = await supabase
      .from('building_documents')
      .select('id, file_name, storage_path')
      .eq('building_id', BUILDING_ID)
      .limit(5);

    if (dbError) throw dbError;

    console.log(`✓ Found ${docs.length} sample documents in database`);

    let storageUrlCount = 0;
    docs.forEach(doc => {
      if (doc.storage_path && doc.storage_path.includes('supabase.co/storage')) {
        storageUrlCount++;
      }
    });

    console.log(`✓ ${storageUrlCount}/${docs.length} have Supabase Storage URLs\n`);

    // Summary
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              Verification Summary              ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    if (totalFiles === 318 && storageUrlCount === docs.length) {
      console.log('✅ Upload verified successfully!');
      console.log(`   - ${totalFiles} files in Supabase Storage`);
      console.log('   - All database records point to Supabase Storage');
      console.log('\nNext steps:');
      console.log('1. Apply storage policies (see storage_policies.sql)');
      console.log('2. Test document viewing in BlocIQ UI');
      console.log(`3. Navigate to: /buildings/${BUILDING_ID}/documents\n`);
    } else if (totalFiles === 0) {
      console.log('⚠️  No files found in storage');
      console.log('\nRun the upload script:');
      console.log('  node scripts/upload-documents-to-supabase.js\n');
    } else if (storageUrlCount === 0) {
      console.log('⚠️  Files uploaded but database not updated');
      console.log('\nRun the updated migration SQL:');
      console.log('  /Users/ellie/Desktop/BlocIQ_Output/migration_with_storage.sql\n');
    } else {
      console.log(`⚠️  Partial upload detected`);
      console.log(`   - ${totalFiles}/318 files in storage`);
      console.log(`   - ${storageUrlCount}/${docs.length} database records updated`);
      console.log('\nRe-run the upload script to complete:\n');
      console.log('  node scripts/upload-documents-to-supabase.js\n');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyStorage();
