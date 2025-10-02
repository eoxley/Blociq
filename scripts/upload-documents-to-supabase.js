#!/usr/bin/env node

/**
 * BlocIQ Document Uploader to Supabase Storage
 *
 * This script:
 * 1. Creates a Supabase Storage bucket (if it doesn't exist)
 * 2. Uploads all documents from local folder to Supabase Storage
 * 3. Generates updated SQL with Supabase Storage URLs
 * 4. Creates storage policies for secure access
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'building-documents';
const BUILDING_ID = '466b1264-275a-4bf0-85ce-26ab8b3839ea';
const SOURCE_DIR = '/Users/ellie/Downloads/219.01 CONNAUGHT SQUARE';
const SQL_FILE = '/Users/ellie/Desktop/BlocIQ_Output/migration.sql';
const OUTPUT_SQL = '/Users/ellie/Desktop/BlocIQ_Output/migration_with_storage.sql';

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Category mapping based on folder structure
const CATEGORY_MAPPING = {
  'CLIENT INFORMATION': 'general',
  'FINANCE': 'financial',
  'GENERAL CORRESPONDENCE': 'general',
  'HEALTH & SAFETY': 'compliance',
  'INSURANCE': 'insurance',
  'MAJOR WORKS': 'major_works',
  'CONTRACTS': 'contracts',
  'FLAT CORRESPONDENCE': 'units',
  'HANDOVER': 'general',
};

// Progress tracking
let uploadedCount = 0;
let failedCount = 0;
let totalFiles = 0;

/**
 * Step 1: Create storage bucket
 */
async function createBucket() {
  console.log('\n📦 Step 1: Creating storage bucket...\n');

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    const bucketExists = buckets.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✓ Bucket "${BUCKET_NAME}" already exists`);
      return true;
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false, // Require authentication to access
      fileSizeLimit: 52428800, // 50MB max file size
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.ms-excel',
      ],
    });

    if (error) {
      throw error;
    }

    console.log(`✓ Created bucket "${BUCKET_NAME}"`);
    return true;
  } catch (error) {
    console.error('❌ Error creating bucket:', error.message);
    return false;
  }
}

/**
 * Step 2: Get category from file path
 */
function getCategoryFromPath(filePath) {
  const relativePath = filePath.replace(SOURCE_DIR, '');
  const parts = relativePath.split(path.sep).filter(p => p);

  // Check first folder for category
  if (parts.length > 0) {
    const firstFolder = parts[0];
    for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
      if (firstFolder.includes(key)) {
        return value;
      }
    }
  }

  return 'other';
}

/**
 * Step 3: Recursively find all files
 */
function getAllFiles(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (stat.isFile()) {
      // Skip system files
      if (!file.startsWith('.') && !file.startsWith('~$')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Step 4: Upload a single file
 */
async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const category = getCategoryFromPath(filePath);
  const storagePath = `${BUILDING_ID}/${category}/${fileName}`;

  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.doc': 'application/msword',
      '.xls': 'application/vnd.ms-excel',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw error;
    }

    uploadedCount++;
    return {
      success: true,
      localPath: filePath,
      storagePath: storagePath,
      publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`,
    };
  } catch (error) {
    failedCount++;
    return {
      success: false,
      localPath: filePath,
      error: error.message,
    };
  }
}

/**
 * Step 5: Upload all files with progress
 */
async function uploadAllFiles() {
  console.log('\n📤 Step 2: Uploading files to Supabase Storage...\n');

  // Get all files
  const allFiles = getAllFiles(SOURCE_DIR);
  totalFiles = allFiles.length;

  console.log(`Found ${totalFiles} files to upload\n`);

  const results = [];
  const batchSize = 5; // Upload 5 files at a time

  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(uploadFile));
    results.push(...batchResults);

    // Progress update
    const progress = Math.round(((i + batch.length) / totalFiles) * 100);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(
      `Progress: ${progress}% (${uploadedCount} uploaded, ${failedCount} failed)`
    );
  }

  console.log('\n');
  return results;
}

/**
 * Step 6: Generate updated SQL
 */
async function generateUpdatedSQL(uploadResults) {
  console.log('\n📝 Step 3: Generating updated SQL with Supabase URLs...\n');

  try {
    // Read original SQL
    let sqlContent = fs.readFileSync(SQL_FILE, 'utf-8');

    // Create a mapping of local paths to storage URLs
    const pathMap = {};
    uploadResults.forEach(result => {
      if (result.success) {
        pathMap[result.localPath] = result.publicUrl;
      }
    });

    // Replace all local paths with Supabase URLs
    Object.entries(pathMap).forEach(([localPath, storageUrl]) => {
      // Escape special regex characters in path
      const escapedPath = localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPath, 'g');
      sqlContent = sqlContent.replace(regex, storageUrl);
    });

    // Write updated SQL
    fs.writeFileSync(OUTPUT_SQL, sqlContent);

    console.log(`✓ Updated SQL saved to: ${OUTPUT_SQL}`);
    console.log(`  Original: ${SQL_FILE}`);
    console.log(`  Updated: ${OUTPUT_SQL}`);

    return true;
  } catch (error) {
    console.error('❌ Error generating SQL:', error.message);
    return false;
  }
}

/**
 * Step 7: Create storage policies
 */
async function createStoragePolicies() {
  console.log('\n🔒 Step 4: Storage Policy Configuration\n');

  console.log('To enable secure access, run these SQL commands in Supabase SQL Editor:\n');

  const policies = `
-- Allow authenticated users to read building documents
CREATE POLICY "Authenticated users can view building documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = '${BUCKET_NAME}');

-- Allow authenticated users to upload building documents
CREATE POLICY "Authenticated users can upload building documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = '${BUCKET_NAME}');

-- Allow authenticated users to update building documents
CREATE POLICY "Authenticated users can update building documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = '${BUCKET_NAME}');

-- Allow authenticated users to delete building documents
CREATE POLICY "Authenticated users can delete building documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = '${BUCKET_NAME}');
`;

  console.log(policies);

  // Save policies to file
  const policyFile = '/Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql';
  fs.writeFileSync(policyFile, policies);
  console.log(`\n✓ Policies saved to: ${policyFile}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  BlocIQ Document Uploader to Supabase Storage ║');
  console.log('╚════════════════════════════════════════════════╝');

  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Step 1: Create bucket
  const bucketCreated = await createBucket();
  if (!bucketCreated) {
    console.error('❌ Failed to create bucket. Exiting.');
    process.exit(1);
  }

  // Step 2: Upload files
  const uploadResults = await uploadAllFiles();

  // Step 3: Generate updated SQL
  await generateUpdatedSQL(uploadResults);

  // Step 4: Create storage policies
  await createStoragePolicies();

  // Summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              Upload Summary                    ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log(`Total files:    ${totalFiles}`);
  console.log(`✓ Uploaded:     ${uploadedCount}`);
  console.log(`✗ Failed:       ${failedCount}`);
  console.log(`Success rate:   ${Math.round((uploadedCount / totalFiles) * 100)}%\n`);

  // Show failed uploads
  if (failedCount > 0) {
    console.log('❌ Failed uploads:');
    uploadResults
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${path.basename(r.localPath)}: ${r.error}`);
      });
    console.log('');
  }

  console.log('Next steps:');
  console.log('1. Run the storage policies SQL in Supabase dashboard');
  console.log('2. Execute the updated migration SQL:');
  console.log(`   ${OUTPUT_SQL}`);
  console.log('3. Verify documents are visible in BlocIQ UI\n');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
