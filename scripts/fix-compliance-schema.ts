#!/usr/bin/env tsx

/**
 * Emergency fix script for compliance_assets title column issue
 * This script can be run to immediately fix the database schema
 */

import { supabaseAdmin } from '../lib/supabaseAdmin';

async function fixComplianceSchema() {
  console.log('🔧 Starting compliance schema fix...');

  try {
    // Check if compliance_assets table exists
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'compliance_assets');

    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('❌ compliance_assets table does not exist');
      return;
    }

    console.log('✅ compliance_assets table exists');

    // Check if title column exists
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'compliance_assets')
      .in('column_name', ['title', 'name']);

    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      return;
    }

    console.log('Existing columns:', columns);

    const hasTitle = columns?.some(col => col.column_name === 'title');
    const hasName = columns?.some(col => col.column_name === 'name');

    console.log(`Has title column: ${hasTitle}`);
    console.log(`Has name column: ${hasName}`);

    if (!hasTitle) {
      console.log('🔧 Adding title column...');
      
      // Add title column
      const { error: addColumnError } = await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE compliance_assets ADD COLUMN IF NOT EXISTS title TEXT;'
      });

      if (addColumnError) {
        console.error('Error adding title column:', addColumnError);
        return;
      }

      // If name column exists, copy data
      if (hasName) {
        console.log('🔄 Copying data from name to title...');
        const { error: copyError } = await supabaseAdmin.rpc('exec_sql', {
          sql: `UPDATE compliance_assets SET title = name WHERE title IS NULL AND name IS NOT NULL;`
        });

        if (copyError) {
          console.error('Error copying data:', copyError);
        }
      }

      // Set default values for empty titles
      console.log('🔧 Setting default titles...');
      const { error: updateError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `UPDATE compliance_assets 
              SET title = CASE 
                WHEN category = 'Fire Safety' THEN 'Fire Risk Assessment'
                WHEN category = 'Gas Safety' THEN 'Gas Safety Certificate'
                WHEN category = 'Electrical' THEN 'Electrical Installation Condition Report'
                WHEN category = 'Lifts' THEN 'Lift Maintenance Certificate'
                WHEN category = 'Water' THEN 'Legionella Risk Assessment'
                WHEN category = 'Asbestos' THEN 'Asbestos Management Survey'
                WHEN category = 'Energy' THEN 'Energy Performance Certificate'
                WHEN category = 'Insurance' THEN 'Building Insurance Certificate'
                ELSE COALESCE(category, 'General') || ' Asset'
              END
              WHERE title IS NULL OR title = '';`
      });

      if (updateError) {
        console.error('Error updating titles:', updateError);
      }

      // Make title NOT NULL
      console.log('🔧 Making title column NOT NULL...');
      const { error: notNullError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `ALTER TABLE compliance_assets ALTER COLUMN title SET NOT NULL;`
      });

      if (notNullError) {
        console.error('Error setting NOT NULL:', notNullError);
      }
    }

    // Verify the fix
    console.log('🔍 Verifying fix...');
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('compliance_assets')
      .select('id, title, category, name')
      .limit(5);

    if (assetsError) {
      console.error('Error verifying assets:', assetsError);
      return;
    }

    console.log('Sample assets:', assets);

    // Test the failing query
    console.log('🧪 Testing the failing query...');
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('building_compliance_assets')
      .select(`
        id,
        status,
        due_date,
        compliance_assets (
          id,
          title,
          category
        )
      `)
      .limit(1);

    if (testError) {
      console.error('❌ Query still failing:', testError);
    } else {
      console.log('✅ Query now working:', testQuery);
    }

    console.log('🎉 Schema fix completed successfully!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the fix
fixComplianceSchema();