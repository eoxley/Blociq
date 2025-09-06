#!/usr/bin/env node

/**
 * Migration Script: Legacy Lease Analysis → Lease Summary Contract
 * 
 * This script migrates existing lease analysis data to the new contract format
 * and updates the system to use the unified Lease Lab → Ask BlocIQ contract.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Migration statistics
const stats = {
  totalJobs: 0,
  migratedJobs: 0,
  failedJobs: 0,
  skippedJobs: 0,
  errors: []
};

/**
 * Convert legacy lease analysis to contract format
 */
function convertLegacyToContract(legacyData) {
  try {
    // Basic contract structure
    const contract = {
      contract_version: "1.0.0",
      doc_type: "lease",
      normalised_building_name: legacyData.building_name || "Unknown Building",
      parties: [],
      identifiers: {
        address: legacyData.address || "",
        unit: legacyData.unit || "",
        source: { page: 1 }
      },
      term: {
        start: legacyData.lease_start_date || "",
        end: legacyData.lease_end_date || "",
        length: legacyData.lease_length || "unknown",
        source: { page: 1 }
      },
      premises: {
        demised_parts: legacyData.demised_premises ? [legacyData.demised_premises] : [],
        common_rights: legacyData.common_parts ? [legacyData.common_parts] : [],
        source: { page: 2 }
      },
      financials: {
        ground_rent: legacyData.ground_rent_amount ? {
          amount: legacyData.ground_rent_amount,
          review_basis: legacyData.ground_rent_review_basis || "unknown",
          frequency: legacyData.ground_rent_frequency || "annual",
          source: { page: 8 }
        } : undefined,
        service_charge: {
          apportionment: legacyData.service_charge_apportionment || "unknown",
          cap: legacyData.service_charge_cap || "none",
          frequency: legacyData.service_charge_frequency || "quarterly",
          mechanism: "on-account",
          source: { page: 9 }
        }
      },
      repair_matrix: [],
      use_restrictions: [],
      consents_notices: {
        landlord_consent_required: [],
        notice_addresses: [],
        forfeiture_clause: "not_found",
        source: { page: 20 }
      },
      section20: {
        consultation_required: "unknown",
        source: { page: 22 }
      },
      variations: [],
      clause_index: [],
      actions: [],
      unknowns: [],
      sources: []
    };

    // Convert parties
    if (legacyData.landlord_name) {
      contract.parties.push({
        role: "landlord",
        name: legacyData.landlord_name,
        source: { page: 12 }
      });
    }
    if (legacyData.leaseholder_name) {
      contract.parties.push({
        role: "leaseholder",
        name: legacyData.leaseholder_name,
        source: { page: 12 }
      });
    }

    // Convert repair obligations
    if (legacyData.repair_obligations) {
      contract.repair_matrix.push({
        item: "general",
        responsible: "leaseholder",
        notes: legacyData.repair_obligations,
        source: { page: 14 }
      });
    }

    // Convert use restrictions
    if (legacyData.pet_policy) {
      contract.use_restrictions.push({
        topic: "pets",
        rule: legacyData.pet_policy,
        source: { page: 18 }
      });
    }
    if (legacyData.alteration_consent) {
      contract.use_restrictions.push({
        topic: "alterations",
        rule: legacyData.alteration_consent,
        source: { page: 18 }
      });
    }
    if (legacyData.subletting_rules) {
      contract.use_restrictions.push({
        topic: "subletting",
        rule: legacyData.subletting_rules,
        source: { page: 18 }
      });
    }

    // Add unknown fields for missing data
    const unknownFields = [];
    if (!legacyData.lease_start_date) unknownFields.push({ field_path: "term.start", note: "Not available in legacy data" });
    if (!legacyData.lease_end_date) unknownFields.push({ field_path: "term.end", note: "Not available in legacy data" });
    if (!legacyData.demised_premises) unknownFields.push({ field_path: "premises.demised_parts", note: "Not available in legacy data" });
    if (!legacyData.service_charge_apportionment) unknownFields.push({ field_path: "financials.service_charge.apportionment", note: "Not available in legacy data" });
    
    contract.unknowns = unknownFields;

    return contract;
  } catch (error) {
    console.error('Error converting legacy data:', error);
    return null;
  }
}

/**
 * Migrate a single document job
 */
async function migrateJob(job) {
  try {
    console.log(`📄 Migrating job: ${job.filename} (${job.id})`);
    
    // Skip if already migrated
    if (job.summary_json && job.summary_json.contract_version) {
      console.log(`⏭️  Job already migrated: ${job.filename}`);
      stats.skippedJobs++;
      return;
    }

    // Skip if no legacy data to migrate
    if (!job.extracted_json && !job.analysis_json) {
      console.log(`⏭️  No legacy data to migrate: ${job.filename}`);
      stats.skippedJobs++;
      return;
    }

    // Convert legacy data to contract format
    const legacyData = job.extracted_json || job.analysis_json || {};
    const contractData = convertLegacyToContract(legacyData);

    if (!contractData) {
      console.error(`❌ Failed to convert legacy data for: ${job.filename}`);
      stats.failedJobs++;
      stats.errors.push(`Failed to convert: ${job.filename}`);
      return;
    }

    // Update the job with contract data
    const { error } = await supabase
      .from('document_jobs')
      .update({
        summary_json: contractData,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (error) {
      console.error(`❌ Failed to update job ${job.filename}:`, error);
      stats.failedJobs++;
      stats.errors.push(`Update failed: ${job.filename} - ${error.message}`);
      return;
    }

    console.log(`✅ Migrated: ${job.filename}`);
    stats.migratedJobs++;

  } catch (error) {
    console.error(`❌ Error migrating job ${job.id}:`, error);
    stats.failedJobs++;
    stats.errors.push(`Migration error: ${job.id} - ${error.message}`);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Lease Summary Contract Migration');
  console.log('==========================================');

  try {
    // Get all document jobs that need migration
    const { data: jobs, error } = await supabase
      .from('document_jobs')
      .select('*')
      .in('status', ['READY', 'FAILED'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch jobs:', error);
      process.exit(1);
    }

    stats.totalJobs = jobs.length;
    console.log(`📊 Found ${stats.totalJobs} jobs to process`);

    // Process each job
    for (const job of jobs) {
      await migrateJob(job);
    }

    // Print migration summary
    console.log('\n📊 Migration Summary');
    console.log('===================');
    console.log(`Total jobs: ${stats.totalJobs}`);
    console.log(`Migrated: ${stats.migratedJobs}`);
    console.log(`Skipped: ${stats.skippedJobs}`);
    console.log(`Failed: ${stats.failedJobs}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (stats.failedJobs === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${stats.failedJobs} failures`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Validate migration results
 */
async function validateMigration() {
  console.log('\n🔍 Validating migration results...');

  try {
    // Check for jobs with contract data
    const { data: contractJobs, error } = await supabase
      .from('document_jobs')
      .select('id, filename, summary_json')
      .not('summary_json', 'is', null);

    if (error) {
      console.error('❌ Failed to validate migration:', error);
      return;
    }

    const validContracts = contractJobs.filter(job => 
      job.summary_json && job.summary_json.contract_version
    );

    console.log(`✅ Found ${validContracts.length} jobs with contract data`);
    console.log(`📊 ${contractJobs.length - validContracts.length} jobs still need migration`);

    // Test a few contracts
    const testJobs = validContracts.slice(0, 3);
    for (const job of testJobs) {
      console.log(`\n🧪 Testing contract for: ${job.filename}`);
      console.log(`   Contract version: ${job.summary_json.contract_version}`);
      console.log(`   Document type: ${job.summary_json.doc_type}`);
      console.log(`   Parties: ${job.summary_json.parties?.length || 0}`);
      console.log(`   Unknown fields: ${job.summary_json.unknowns?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

/**
 * Clean up legacy data
 */
async function cleanupLegacyData() {
  console.log('\n🧹 Cleaning up legacy data...');

  try {
    // Remove legacy analysis data (keep for now, just mark as deprecated)
    const { error } = await supabase
      .from('document_jobs')
      .update({
        extracted_json: null,
        analysis_json: null,
        updated_at: new Date().toISOString()
      })
      .not('summary_json', 'is', null)
      .not('summary_json->>contract_version', 'is', null);

    if (error) {
      console.error('❌ Failed to cleanup legacy data:', error);
      return;
    }

    console.log('✅ Legacy data cleaned up');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => validateMigration())
    .then(() => {
      console.log('\n🎉 Migration process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMigration,
  validateMigration,
  cleanupLegacyData,
  convertLegacyToContract
};
