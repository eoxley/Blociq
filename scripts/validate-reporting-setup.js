#!/usr/bin/env node

/**
 * Validation script for Ask BlocIQ Reporting System
 * Checks that all required files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${filePath} (MISSING)`);
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`✅ ${description}: ${dirPath}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${dirPath} (MISSING)`);
    return false;
  }
}

function validateReportingSetup() {
  console.log('🔍 Validating Ask BlocIQ Reporting System Setup\n');
  console.log('=' .repeat(60));
  console.log('');
  
  let allValid = true;
  
  // Check core intent detection
  console.log('📊 Intent Detection:');
  allValid &= checkFileExists('ai/intent/report.ts', 'Report intent detection');
  console.log('');
  
  // Check report registry
  console.log('📋 Report Registry:');
  allValid &= checkFileExists('ai/reports/registry.ts', 'Report registry');
  allValid &= checkFileExists('ai/reports/engine.ts', 'Report engine');
  allValid &= checkFileExists('ai/reports/handlers.ts', 'Report handlers');
  allValid &= checkFileExists('ai/reports/format.ts', 'Report formatters');
  console.log('');
  
  // Check SQL views
  console.log('🗄️ Database Views:');
  allValid &= checkFileExists('migrations/20241207_create_reporting_views.sql', 'Reporting views migration');
  console.log('');
  
  // Check period parsing
  console.log('📅 Period Parsing:');
  allValid &= checkFileExists('lib/dates/period.ts', 'Period parsing utility');
  console.log('');
  
  // Check Ask-AI integration
  console.log('🤖 Ask-AI Integration:');
  const askAiContent = fs.readFileSync('app/api/ask-ai/route.ts', 'utf8');
  const hasReportIntegration = askAiContent.includes('detectReportIntent') && 
                              askAiContent.includes('executeReport');
  if (hasReportIntegration) {
    console.log('✅ Report integration in Ask-AI endpoint');
  } else {
    console.log('❌ Report integration in Ask-AI endpoint (MISSING)');
    allValid = false;
  }
  console.log('');
  
  // Check test files
  console.log('🧪 Test Files:');
  allValid &= checkFileExists('scripts/test-reporting-system.js', 'Reporting system tests');
  allValid &= checkFileExists('scripts/validate-reporting-setup.js', 'Validation script');
  console.log('');
  
  // Check package.json scripts
  console.log('📦 Package Scripts:');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    if (scripts['test:reporting']) {
      console.log('✅ test:reporting script found');
    } else {
      console.log('⚠️ test:reporting script not found (optional)');
    }
    
    if (scripts['validate:reporting']) {
      console.log('✅ validate:reporting script found');
    } else {
      console.log('⚠️ validate:reporting script not found (optional)');
    }
  } catch (error) {
    console.log('❌ Could not read package.json');
    allValid = false;
  }
  console.log('');
  
  // Summary
  console.log('=' .repeat(60));
  console.log('');
  
  if (allValid) {
    console.log('🎉 All validation checks passed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Run the database migration: migrations/20241207_create_reporting_views.sql');
    console.log('2. Test the reporting system: node scripts/test-reporting-system.js');
    console.log('3. Deploy and test with real data');
    console.log('');
    console.log('🚀 The reporting system is ready to use!');
  } else {
    console.log('❌ Some validation checks failed!');
    console.log('');
    console.log('🔧 Please fix the missing components before proceeding.');
    console.log('');
    console.log('📚 For help, check the implementation in:');
    console.log('- ai/intent/report.ts');
    console.log('- ai/reports/');
    console.log('- lib/dates/period.ts');
  }
  
  return allValid;
}

function checkDatabaseMigration() {
  console.log('🗄️ Checking Database Migration...\n');
  
  const migrationFile = 'migrations/20241207_create_reporting_views.sql';
  
  if (!fs.existsSync(migrationFile)) {
    console.log('❌ Migration file not found');
    return false;
  }
  
  const migrationContent = fs.readFileSync(migrationFile, 'utf8');
  
  const requiredViews = [
    'building_compliance_status_v',
    'compliance_overdue_v',
    'compliance_upcoming_v',
    'buildings_min_v',
    'units_min_v',
    'document_types_summary_v',
    'compliance_by_type_v'
  ];
  
  let allViewsPresent = true;
  
  requiredViews.forEach(view => {
    if (migrationContent.includes(view)) {
      console.log(`✅ View ${view} found in migration`);
    } else {
      console.log(`❌ View ${view} missing from migration`);
      allViewsPresent = false;
    }
  });
  
  if (allViewsPresent) {
    console.log('\n✅ All required views are present in the migration');
  } else {
    console.log('\n❌ Some views are missing from the migration');
  }
  
  return allViewsPresent;
}

function runValidation() {
  console.log('🚀 Ask BlocIQ Reporting System Validation\n');
  console.log('=' .repeat(60));
  console.log('');
  
  const setupValid = validateReportingSetup();
  console.log('');
  
  const migrationValid = checkDatabaseMigration();
  console.log('');
  
  if (setupValid && migrationValid) {
    console.log('🎉 Complete validation passed!');
    console.log('');
    console.log('📋 The reporting system is fully configured and ready to use.');
    console.log('');
    console.log('🧪 To test the system:');
    console.log('node scripts/test-reporting-system.js');
    console.log('');
    console.log('🚀 To deploy:');
    console.log('1. Run the database migration');
    console.log('2. Deploy the application');
    console.log('3. Test with real data');
  } else {
    console.log('❌ Validation failed!');
    console.log('');
    console.log('🔧 Please fix the issues above before proceeding.');
  }
  
  return setupValid && migrationValid;
}

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation();
}

module.exports = {
  validateReportingSetup,
  checkDatabaseMigration,
  runValidation
};
