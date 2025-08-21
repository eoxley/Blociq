// File: scripts/seedComplianceAssets.ts
// Run this to create compliance assets for document linking

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function seedComplianceAssets() {
  const complianceAssets = [
    {
      title: 'Fire Safety',
      description: 'Fire risk assessments, fire alarm systems, emergency lighting, fire extinguishers',
      category: 'Safety'
    },
    {
      title: 'Electrical Safety',
      description: 'Electrical Installation Condition Reports (EICR), portable appliance testing',
      category: 'Safety'
    },
    {
      title: 'Gas Safety',
      description: 'Gas safety certificates, gas appliance servicing',
      category: 'Safety'
    },
    {
      title: 'Asbestos Management',
      description: 'Asbestos surveys, asbestos management plans',
      category: 'Safety'
    },
    {
      title: 'Legionella Control',
      description: 'Legionella risk assessments, water system monitoring',
      category: 'Safety'
    },
    {
      title: 'Lift Safety',
      description: 'Lift maintenance certificates, LOLER inspections',
      category: 'Safety'
    },
    {
      title: 'Building Insurance',
      description: 'Building insurance certificates, policy documents',
      category: 'Insurance'
    },
    {
      title: 'Public Liability Insurance',
      description: 'Public liability insurance certificates',
      category: 'Insurance'
    },
    {
      title: 'Employers Liability Insurance',
      description: 'Employers liability insurance certificates',
      category: 'Insurance'
    },
    {
      title: 'Planning & Building Control',
      description: 'Planning permissions, building control certificates',
      category: 'Regulatory'
    },
    {
      title: 'Health & Safety',
      description: 'Health and safety policies, risk assessments',
      category: 'Safety'
    }
  ];

  const { data: insertedAssets, error } = await supabase
    .from('compliance_assets')
    .insert(complianceAssets)
    .select();

  if (error) {
    console.error('❌ Failed to insert compliance assets:', error.message);
    return;
  }

  console.log(`✅ Inserted ${insertedAssets.length} compliance assets`);
  
  // Log the created assets
  insertedAssets.forEach(asset => {
    console.log(`  - ${asset.title} (${asset.category})`);
  });
}

// Also run directly if this file is executed
if (require.main === module) {
  seedComplianceAssets();
} 