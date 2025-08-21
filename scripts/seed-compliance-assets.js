const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedComplianceAssets() {
  try {
    console.log('🌱 Starting compliance assets seeding...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'seed-compliance-assets.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip verification queries for now
      if (statement.includes('SELECT') && statement.includes('COUNT')) {
        continue;
      }
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Executed statement ${i + 1}`);
        }
      } catch (err) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, err.message);
      }
    }
    
    // Verify the seeding
    const { data: assets, error: verifyError } = await supabase
      .from('compliance_assets')
      .select('category')
      .order('category');
    
    if (verifyError) {
      console.error('❌ Error verifying seeding:', verifyError.message);
    } else {
      const categoryCounts = assets.reduce((acc, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Compliance assets seeded successfully!');
      console.log('Category breakdown:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} assets`);
      });
      console.log(`Total: ${assets.length} compliance assets`);
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

// Run the seeding
seedComplianceAssets(); 