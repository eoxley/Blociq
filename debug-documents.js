const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDocuments() {
  console.log('🔍 Debugging building_documents table...\n');

  try {
    const { data: docs, error } = await supabase
      .from('building_documents')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (!docs || docs.length === 0) {
      console.log('❌ No documents found');
      return;
    }

    console.log(`📄 Found ${docs.length} documents:`);
    docs.forEach((doc, i) => {
      console.log(`\n${i + 1}. Document ID: ${doc.id}`);
      console.log(`   Name: ${doc.name}`);
      console.log(`   File Path: ${doc.file_path}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Category: ${doc.category}`);
      console.log(`   Has OCR Text: ${doc.ocr_text ? 'Yes (' + doc.ocr_text.length + ' chars)' : 'No'}`);
      console.log(`   Uploaded At: ${doc.uploaded_at}`);
      if (doc.metadata) {
        console.log(`   Metadata: ${JSON.stringify(doc.metadata, null, 2)}`);
      }
    });

    // Check storage buckets
    console.log('\n🗂️ Checking storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('Bucket error:', bucketError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name));
    }

  } catch (error) {
    console.error('Error debugging documents:', error);
  }
}

debugDocuments();