// File: scripts/removeDuplicateAshwood.ts
// Run this inside Cursor to remove duplicate Ashwood House entries

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for delete access
);

export async function removeDuplicateAshwood() {
  console.log('🔍 Checking for duplicate Ashwood House entries...');

  // First, get all Ashwood House entries
  const { data: ashwoodEntries, error: fetchError } = await supabase
    .from('buildings')
    .select('*')
    .eq('name', 'Ashwood House')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching Ashwood House entries:', fetchError);
    return;
  }

  console.log(`📊 Found ${ashwoodEntries?.length || 0} Ashwood House entries:`);
  ashwoodEntries?.forEach((entry, index) => {
    console.log(`  ${index + 1}. ID: ${entry.id}, Address: ${entry.address}, Created: ${entry.created_at}`);
  });

  if (!ashwoodEntries || ashwoodEntries.length <= 1) {
    console.log('✅ No duplicates found or only one entry exists');
    return;
  }

  // Keep the first entry (oldest) and remove the rest
  const entriesToRemove = ashwoodEntries.slice(1);
  console.log(`🗑️ Removing ${entriesToRemove.length} duplicate entries...`);

  for (const entry of entriesToRemove) {
    console.log(`🗑️ Removing Ashwood House with ID: ${entry.id}`);
    
    // Delete the building entry
    const { error: deleteError } = await supabase
      .from('buildings')
      .delete()
      .eq('id', entry.id);

    if (deleteError) {
      console.error(`❌ Error deleting building ${entry.id}:`, deleteError);
    } else {
      console.log(`✅ Successfully deleted building ${entry.id}`);
    }
  }

  // Verify the cleanup
  const { data: remainingEntries, error: verifyError } = await supabase
    .from('buildings')
    .select('*')
    .eq('name', 'Ashwood House');

  if (verifyError) {
    console.error('❌ Error verifying cleanup:', verifyError);
    return;
  }

  console.log(`✅ Cleanup complete! ${remainingEntries?.length || 0} Ashwood House entries remaining:`);
  remainingEntries?.forEach((entry, index) => {
    console.log(`  ${index + 1}. ID: ${entry.id}, Address: ${entry.address}, Created: ${entry.created_at}`);
  });
}

// Run the function if this file is executed directly
if (require.main === module) {
  removeDuplicateAshwood()
    .then(() => {
      console.log('🎉 Duplicate removal process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error in duplicate removal process:', error);
      process.exit(1);
    });
} 