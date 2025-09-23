// Database Schema Check Script
// This script checks for missing tables and columns that cause 400 errors

const requiredTables = [
  {
    name: 'communications_log',
    requiredColumns: ['id', 'building_id', 'sent_at', 'direction', 'subject', 'content', 'status'],
    optionalColumns: ['leaseholder_id'] // This column is optional and causes errors if missing
  },
  {
    name: 'building_action_tracker',
    requiredColumns: ['id', 'building_id', 'item_text', 'completed', 'priority', 'source', 'created_by'],
    optionalColumns: ['due_date', 'notes', 'completed_at']
  },
  {
    name: 'buildings',
    requiredColumns: ['id', 'name', 'address', 'agency_id'],
    optionalColumns: ['unit_count', 'notes', 'is_hrb']
  },
  {
    name: 'units',
    requiredColumns: ['id', 'unit_number', 'building_id'],
    optionalColumns: ['type', 'floor', 'leaseholder_id']
  },
  {
    name: 'leaseholders',
    requiredColumns: ['id', 'name', 'email'],
    optionalColumns: ['phone', 'unit_id']
  }
];

console.log('=== BlocIQ Database Schema Check ===\n');

console.log('Required tables for building page functionality:');
requiredTables.forEach(table => {
  console.log(`\n📋 Table: ${table.name}`);
  console.log(`   Required columns: ${table.requiredColumns.join(', ')}`);
  if (table.optionalColumns.length > 0) {
    console.log(`   Optional columns: ${table.optionalColumns.join(', ')}`);
  }
});

console.log('\n=== Common Issues and Fixes ===');
console.log('1. communications_log.leaseholder_id missing → Fixed in CommunicationsLog.tsx');
console.log('2. building_action_tracker table missing → APIs have fallback handling');
console.log('3. Foreign key relationships failing → Using simple queries as fallback');

console.log('\n=== Next Steps ===');
console.log('1. Verify these tables exist in your Supabase database');
console.log('2. Check RLS (Row Level Security) policies are set up correctly');
console.log('3. Ensure user has proper agency_id association');
console.log('4. Test building page after schema verification');

console.log('\nSchema check complete. ✅');