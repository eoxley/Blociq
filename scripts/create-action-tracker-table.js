#!/usr/bin/env node

/**
 * CREATE ACTION TRACKER TABLE
 * 
 * Creates just the building_action_tracker table via API calls
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createActionTrackerTable() {
  log('🔧 CREATING ACTION TRACKER TABLE', 'bright');
  log('============================================', 'bright');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing environment variables', 'red');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    log('ℹ️ Checking if table exists...', 'blue');
    
    // Try to query the table
    const { error: checkError } = await supabase
      .from('building_action_tracker')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      log('⚠️ Table building_action_tracker already exists', 'yellow');
      return;
    }
    
    if (checkError.code !== 'PGRST116') {
      log(`❌ Unexpected error: ${checkError.message}`, 'red');
      return;
    }
    
    log('ℹ️ Table does not exist, creating...', 'blue');
    
    // The table doesn't exist, so we need to tell the user to run the SQL
    log('', 'reset');
    log('📋 ACTION REQUIRED:', 'yellow');
    log('The building_action_tracker table needs to be created manually.', 'yellow');
    log('', 'reset');
    log('Please follow these steps:', 'cyan');
    log('1. Go to your Supabase Dashboard', 'cyan');
    log('2. Navigate to SQL Editor', 'cyan');
    log('3. Copy and paste the content from:', 'cyan');
    log('   sql/action-tracker-schema.sql', 'cyan');
    log('4. Run the SQL script', 'cyan');
    log('', 'reset');
    log('This will create the table with proper RLS policies.', 'reset');
    log('', 'reset');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

if (require.main === module) {
  createActionTrackerTable()
    .then(() => {
      log('✅ Script completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      log(`❌ Script failed: ${error.message}`, 'red');
      process.exit(1);
    });
}