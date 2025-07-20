// File: scripts/checkComplianceAssets.ts
// Run this to check the current count of compliance assets

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function checkComplianceAssets() {
  console.log('🔍 Checking compliance assets in database...\n');

  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('compliance_assets')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError.message);
      return;
    }

    console.log(`📊 Total compliance assets: ${count}`);

    // Get assets by category
    const { data: assets, error } = await supabase
      .from('compliance_assets')
      .select('name, category')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching assets:', error.message);
      return;
    }

    if (assets && assets.length > 0) {
      console.log('\n📋 Assets by category:');
      
      const assetsByCategory = assets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(asset.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(assetsByCategory).forEach(([category, assetNames]) => {
        console.log(`\n  ${category} (${assetNames.length}):`);
        assetNames.forEach(name => {
          console.log(`    - ${name}`);
        });
      });
    } else {
      console.log('\n⚠️  No compliance assets found in database.');
      console.log('💡 Run the seed script to add compliance assets:');
      console.log('   npm run seed:compliance');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Also run directly if this file is executed
if (require.main === module) {
  checkComplianceAssets();
} 