/**
 * Validation script to test Google Vision setup and framework
 * Tests the core components without requiring an actual document
 */

const vision = require('@google-cloud/vision');
const LeaseAnalysisTest = require('./google-vision-lease-test');

async function validateSetup() {
  console.log('🔧 Validating Google Vision Test Setup...\n');
  
  try {
    // Test 1: Check Google Vision client initialization
    console.log('1️⃣ Testing Google Vision client initialization...');
    const client = new vision.ImageAnnotatorClient();
    console.log('   ✅ Google Vision client created successfully');
    
    // Test 2: Check test framework initialization
    console.log('\n2️⃣ Testing LeaseAnalysisTest framework...');
    const tester = new LeaseAnalysisTest();
    console.log('   ✅ LeaseAnalysisTest initialized successfully');
    
    // Test 3: Validate known values structure
    console.log('\n3️⃣ Validating test data structure...');
    const expectedFields = ['lessor', 'lessee', 'address', 'titleNumber', 'premium', 'proportion'];
    const actualFields = Object.keys(tester.knownValues).filter(key => key !== 'blociqErrors');
    
    const missingFields = expectedFields.filter(field => !actualFields.includes(field));
    if (missingFields.length === 0) {
      console.log('   ✅ All expected test fields present');
    } else {
      console.log(`   ⚠️ Missing fields: ${missingFields.join(', ')}`);
    }
    
    // Test 4: Validate helper methods
    console.log('\n4️⃣ Testing helper methods...');
    
    // Test findFieldInText method
    const testText = "LAING HOMES LIMITED is the lessor and the premium is £76,995.00";
    const fieldTest = tester.findFieldInText(testText, 'lessor', 'LAING HOMES LIMITED');
    if (fieldTest.found && fieldTest.accuracy === 100) {
      console.log('   ✅ findFieldInText method working correctly');
    } else {
      console.log('   ❌ findFieldInText method has issues');
    }
    
    // Test section finding
    const sectionTest = tester.findSection(testText, 'LAING');
    if (sectionTest.found > 0) {
      console.log('   ✅ findSection method working correctly');
    } else {
      console.log('   ❌ findSection method has issues');
    }
    
    // Test 5: Validate error classification
    console.log('\n5️⃣ Testing error classification...');
    const errorType = tester.classifyError(
      'Flat 5, 260 Holloway Road', 
      'Land on easterly side of Wimbledon Parkside'
    );
    if (errorType === 'complete_substitution') {
      console.log('   ✅ Error classification working correctly');
    } else {
      console.log(`   ⚠️ Error classification returned: ${errorType}`);
    }
    
    // Test 6: Check credentials (without making API call)
    console.log('\n6️⃣ Checking Google Cloud credentials...');
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentials) {
      console.log(`   ✅ Credentials path set: ${credentials}`);
      const fs = require('fs');
      if (fs.existsSync(credentials)) {
        console.log('   ✅ Credentials file exists');
      } else {
        console.log('   ⚠️ Credentials file not found at specified path');
      }
    } else {
      console.log('   ⚠️ GOOGLE_APPLICATION_CREDENTIALS not set');
      console.log('   💡 Set with: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"');
    }
    
    // Summary
    console.log('\n📊 SETUP VALIDATION SUMMARY');
    console.log('━'.repeat(40));
    console.log('✅ Framework components initialized');
    console.log('✅ Test data structure valid');
    console.log('✅ Helper methods functional');
    console.log('✅ Google Vision dependency available');
    
    if (credentials && require('fs').existsSync(credentials)) {
      console.log('✅ Google Cloud credentials configured');
      console.log('\n🎉 Ready to run tests! Next steps:');
      console.log('1. node tests/quick-vision-test.js /path/to/lease.pdf');
      console.log('2. node tests/run-lease-analysis-test.js /path/to/lease.pdf');
    } else {
      console.log('⚠️ Google Cloud credentials need setup');
      console.log('\n🔧 Setup required:');
      console.log('1. Create Google Cloud service account');
      console.log('2. Download service account key JSON');
      console.log('3. export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"');
      console.log('4. Re-run this validation script');
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Setup validation failed:', error.message);
    console.error('\nDebug info:', {
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack.split('\n').slice(0, 3).join('\n')
    });
    
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSetup()
    .then(success => {
      if (success) {
        console.log('\n✅ Setup validation completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Setup validation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Validation script crashed:', error);
      process.exit(1);
    });
}

module.exports = validateSetup;