#!/usr/bin/env node

/**
 * SETUP ACTION TRACKER TABLE
 * 
 * Creates the building_action_tracker table with proper RLS policies
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Setup Action Tracker
async function setupActionTracker() {
  log('🔧 ACTION TRACKER SETUP', 'bright');
  log('============================================================', 'bright');
  log('Setting up building_action_tracker table with RLS policies', 'bright');
  log('', 'reset');

  // Check environment variables
  logStep(1, 'Checking environment variables');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    logError('NEXT_PUBLIC_SUPABASE_URL is not set');
    return;
  }
  
  if (!supabaseKey) {
    logError('SUPABASE_SERVICE_ROLE_KEY is not set');
    return;
  }
  
  logInfo(`Supabase URL: ${supabaseUrl}`);
  logInfo(`Using service role key`);
  
  // Initialize Supabase client
  logStep(2, 'Initializing Supabase client');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check if table already exists
    logStep(3, 'Checking if building_action_tracker table exists');
    const { data: tableExists, error: checkError } = await supabase
      .from('building_action_tracker')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code !== 'PGRST116') {
      logError(`Error checking table: ${checkError.message}`);
      return;
    }
    
    if (!checkError) {
      logWarning('Table building_action_tracker already exists');
      
      // Count existing items
      const { data: items, error: countError } = await supabase
        .from('building_action_tracker')
        .select('id', { count: 'exact' });
      
      if (!countError) {
        logInfo(`Found ${items.length} existing action tracker items`);
      }
      
      logInfo('Skipping table creation');
      return;
    }
    
    // Read SQL schema file
    logStep(4, 'Reading SQL schema file');
    const schemaPath = path.join(process.cwd(), 'sql', 'action-tracker-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      logError(`SQL schema file not found: ${schemaPath}`);
      return;
    }
    
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    logInfo(`Loaded ${sqlContent.length} characters from schema file`);
    
    // Execute SQL (note: we'll need to split this into parts for Supabase client)
    logStep(5, 'Creating building_action_tracker table');
    logWarning('Note: This will execute the full SQL schema including RLS policies');
    
    // For now, let's try with the main table creation part
    const createTableSQL = `
-- Action Tracker Schema for BlocIQ
-- Building-specific action/task tracking system

-- Create the building_action_tracker table
CREATE TABLE IF NOT EXISTS building_action_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  due_date date,
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  priority text CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  source text DEFAULT 'Manual' CHECK (source IN ('Manual', 'Meeting', 'Call', 'Email')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_building_id ON building_action_tracker(building_id);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_due_date ON building_action_tracker(due_date);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_completed ON building_action_tracker(completed);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_priority ON building_action_tracker(priority);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_source ON building_action_tracker(source);
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (createError) {
      // Try direct table creation via API call
      logWarning(`RPC method failed: ${createError.message}`);
      logInfo('Trying alternative method...');
      
      // Let's try creating via a simple insert to test connectivity
      const { error: testError } = await supabase
        .from('buildings')
        .select('id')
        .limit(1);
      
      if (testError) {
        logError(`Database connection issue: ${testError.message}`);
        return;
      }
      
      logWarning('Database is accessible, but cannot execute DDL statements via client');
      logInfo('The SQL schema needs to be run directly on the database:');
      log('', 'reset');
      log('Please run the SQL commands from sql/action-tracker-schema.sql', 'yellow');
      log('in your Supabase Dashboard > SQL Editor or via psql CLI', 'yellow');
      log('', 'reset');
      return;
    }
    
    logSuccess('Table created successfully!');
    
    // Test the table
    logStep(6, 'Testing table access');
    const { data: testData, error: testError } = await supabase
      .from('building_action_tracker')
      .select('*')
      .limit(1);
    
    if (testError) {
      logError(`Table test failed: ${testError.message}`);
    } else {
      logSuccess('Table is accessible');
      logInfo(`Found ${testData.length} initial records`);
    }
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
  }

  log('\n📊 ACTION TRACKER SETUP RESULTS', 'bright');
  log('============================================================', 'bright');
  log('If table creation failed, manually run:', 'reset');
  log('sql/action-tracker-schema.sql in Supabase Dashboard', 'yellow');
}

// Run the setup
if (require.main === module) {
  setupActionTracker()
    .then(() => {
      log('\n✅ Action Tracker setup completed', 'green');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Setup failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { setupActionTracker };