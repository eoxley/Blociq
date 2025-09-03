const vision = require('@google-cloud/vision');
const fs = require('fs');

/**
 * Quick Google Vision API test to verify setup and basic functionality
 */

async function quickVisionTest(imagePath) {
  console.log('🔍 Running quick Google Vision API test...\n');
  
  try {
    // Initialize client
    const client = new vision.ImageAnnotatorClient();
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }
    
    console.log(`📄 Testing document: ${imagePath}`);
    console.log(`📊 File size: ${(fs.statSync(imagePath).size / 1024).toFixed(2)} KB\n`);
    
    // Perform text detection
    console.log('⏳ Calling Google Vision API...');
    const startTime = Date.now();
    
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    if (!detections || detections.length === 0) {
      console.log('⚠️ No text detected in document');
      return;
    }
    
    // Extract full text
    const extractedText = detections[0].description;
    const wordCount = extractedText.split(/\s+/).length;
    const charCount = extractedText.length;
    
    console.log('✅ Text extraction completed!');
    console.log(`⏱️ Processing time: ${processingTime}ms`);
    console.log(`📝 Characters extracted: ${charCount.toLocaleString()}`);
    console.log(`📄 Words extracted: ${wordCount.toLocaleString()}\n`);
    
    // Show first 500 characters as preview
    console.log('📖 Text preview (first 500 characters):');
    console.log('─'.repeat(50));
    console.log(extractedText.substring(0, 500) + '...');
    console.log('─'.repeat(50));
    
    // Quick accuracy test - look for common lease terms
    const commonLeaseTerms = [
      'lease', 'lessor', 'lessee', 'premises', 'rent',
      'term', 'covenant', 'clause', 'schedule', 'property'
    ];
    
    console.log('\n🔍 Common lease terms found:');
    const foundTerms = commonLeaseTerms.filter(term => 
      extractedText.toLowerCase().includes(term)
    );
    
    foundTerms.forEach(term => {
      const count = (extractedText.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      console.log(`  ✅ "${term}": ${count} occurrences`);
    });
    
    const termAccuracy = (foundTerms.length / commonLeaseTerms.length) * 100;
    console.log(`\n📊 Lease term recognition: ${termAccuracy}% (${foundTerms.length}/${commonLeaseTerms.length})`);
    
    // Look for specific values mentioned in your lease
    console.log('\n🎯 Looking for specific known values:');
    const knownValues = {
      'LAING HOMES': extractedText.includes('LAING HOMES'),
      'Wimbledon Parkside': extractedText.toLowerCase().includes('wimbledon parkside'),
      '£76,995': extractedText.includes('76,995') || extractedText.includes('76995'),
      '1.48%': extractedText.includes('1.48'),
      'TGL 57178': extractedText.includes('TGL 57178')
    };
    
    Object.entries(knownValues).forEach(([value, found]) => {
      console.log(`  ${found ? '✅' : '❌'} ${value}: ${found ? 'Found' : 'Not found'}`);
    });
    
    const knownValueAccuracy = Object.values(knownValues).filter(Boolean).length;
    console.log(`\n📊 Known value accuracy: ${(knownValueAccuracy/5*100)}% (${knownValueAccuracy}/5)`);
    
    // Performance summary
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log('━'.repeat(40));
    console.log(`Processing speed: ${(charCount/processingTime*1000).toFixed(0)} chars/second`);
    console.log(`Extraction rate: ${((charCount/(fs.statSync(imagePath).size))*100).toFixed(2)}%`);
    console.log(`Text density: ${(charCount/wordCount).toFixed(1)} chars/word`);
    
    // Compare to Blociq baseline
    console.log('\n🔴 Blociq baseline (from your data):');
    console.log('  Extraction rate: 0.04% (1,190 chars from 2.98MB file)');
    console.log('  Field accuracy: ~10% (major errors in all critical fields)');
    
    const extractionRate = ((charCount/(fs.statSync(imagePath).size))*100);
    console.log(`\n🟢 Google Vision results:`);
    console.log(`  Extraction rate: ${extractionRate.toFixed(2)}%`);
    console.log(`  Improvement: ${(extractionRate/0.04).toFixed(0)}x better than Blociq`);
    
    return {
      success: true,
      extractedText,
      metrics: {
        processingTime,
        charCount,
        wordCount,
        termAccuracy,
        knownValueAccuracy,
        extractionRate
      }
    };
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    
    if (error.message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      console.error('\n🔧 Setup Google Cloud credentials:');
      console.error('1. Go to Google Cloud Console');
      console.error('2. Create service account with Vision API access');
      console.error('3. Download service account key JSON');
      console.error('4. Set environment variable:');
      console.error('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"');
    }
    
    throw error;
  }
}

// Export for use in other modules
module.exports = quickVisionTest;

// Allow direct execution
if (require.main === module) {
  const imagePath = process.argv[2];
  
  if (!imagePath) {
    console.error('Usage: node quick-vision-test.js /path/to/document.pdf');
    process.exit(1);
  }
  
  quickVisionTest(imagePath)
    .then(result => {
      if (result.success) {
        console.log('\n✅ Quick test completed successfully!');
        console.log('💡 Ready to run full test suite with: node run-lease-analysis-test.js');
      }
    })
    .catch(error => {
      console.error('\n❌ Quick test failed');
      process.exit(1);
    });
}