const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing Migration Conflict...')

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

// Find the duplicate migration
const duplicateMigration = '20250726_create_incoming_emails.sql'
const duplicatePath = path.join(migrationsDir, duplicateMigration)

try {
  if (fs.existsSync(duplicatePath)) {
    // Backup the file first
    const backupPath = duplicatePath + '.backup'
    fs.copyFileSync(duplicatePath, backupPath)
    console.log(`📝 Backed up ${duplicateMigration} to ${duplicateMigration}.backup`)
    
    // Remove the duplicate migration
    fs.unlinkSync(duplicatePath)
    console.log(`✅ Removed duplicate migration: ${duplicateMigration}`)
    
    console.log('\n🎉 Migration conflict resolved!')
    console.log('\n📝 Next steps:')
    console.log('1. Run: supabase db reset (if using local)')
    console.log('2. Or run: supabase db push (if using remote)')
    console.log('3. Test the inbox page again')
    
  } else {
    console.log(`⚠️ Duplicate migration not found: ${duplicateMigration}`)
  }
} catch (error) {
  console.error('❌ Error fixing migration conflict:', error.message)
  console.log('\n💡 Manual fix:')
  console.log(`1. Delete the file: supabase/migrations/${duplicateMigration}`)
  console.log('2. Run: supabase db reset')
} 