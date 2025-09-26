const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDocuments() {
  console.log('🔍 Checking building_documents table for industry knowledge...\n');

  try {
    // Check total documents
    const { count: totalCount } = await supabase
      .from('building_documents')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total documents: ${totalCount}`);

    // Check documents with OCR content
    const { data: docsWithOCR, count: ocrCount } = await supabase
      .from('building_documents')
      .select('name, category, type, ocr_text', { count: 'exact' })
      .not('ocr_text', 'is', null);

    console.log(`📄 Documents with OCR content: ${ocrCount}`);

    if (docsWithOCR && docsWithOCR.length > 0) {
      console.log('\nSample documents with OCR:');
      docsWithOCR.slice(0, 5).forEach((doc, i) => {
        const ocrPreview = doc.ocr_text ? doc.ocr_text.substring(0, 100) + '...' : 'No OCR';
        console.log(`${i+1}. ${doc.name} (${doc.category || doc.type})`);
        console.log(`   OCR Preview: ${ocrPreview}\n`);
      });

      // Test search for common terms
      console.log('🔍 Testing search for common terms...\n');

      const testTerms = ['leasehold', 'section', 'reform', 'act', '2024', 'building', 'safety'];

      for (const term of testTerms) {
        const { data: results } = await supabase
          .from('building_documents')
          .select('name, category, type')
          .ilike('ocr_text', `%${term}%`)
          .limit(3);

        console.log(`"${term}": ${results ? results.length : 0} matches`);
        if (results && results.length > 0) {
          results.forEach(doc => {
            console.log(`  - ${doc.name} (${doc.category || doc.type})`);
          });
        }
        console.log('');
      }
    } else {
      console.log('\n❌ No documents found with OCR content');
    }

  } catch (error) {
    console.error('Error checking documents:', error);
  }
}

checkDocuments();