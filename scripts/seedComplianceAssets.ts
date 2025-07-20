// File: scripts/seedComplianceAssets.ts
// Run this to create compliance assets for document linking

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function seedComplianceAssets() {
  const complianceAssets = [
    {
      name: 'Fire Safety',
      description: 'Fire risk assessments, fire alarm systems, emergency lighting, fire extinguishers',
      category: 'Safety'
    },
    {
      name: 'Electrical Safety',
      description: 'Electrical Installation Condition Reports (EICR), portable appliance testing',
      category: 'Safety'
    },
    {
      name: 'Gas Safety',
      description: 'Gas safety certificates, gas appliance servicing',
      category: 'Safety'
    },
    {
      name: 'Asbestos Management',
      description: 'Asbestos surveys, asbestos management plans',
      category: 'Safety'
    },
    {
      name: 'Legionella Control',
      description: 'Legionella risk assessments, water system monitoring',
      category: 'Safety'
    },
    {
      name: 'Lift Safety',
      description: 'Lift maintenance certificates, LOLER inspections',
      category: 'Safety'
    },
    {
      name: 'Building Insurance',
      description: 'Building insurance certificates, policy documents',
      category: 'Insurance'
    },
    {
      name: 'Public Liability Insurance',
      description: 'Public liability insurance certificates',
      category: 'Insurance'
    },
    {
      name: 'Employers Liability Insurance',
      description: 'Employers liability insurance certificates',
      category: 'Insurance'
    },
    {
      name: 'Energy Performance',
      description: 'Energy Performance Certificates (EPC), Display Energy Certificates',
      category: 'Environmental'
    },
    {
      name: 'Planning & Building Control',
      description: 'Planning permissions, building control certificates',
      category: 'Regulatory'
    },
    {
      name: 'Health & Safety',
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
    console.log(`  - ${asset.name} (${asset.category})`);
  });
}

// Also run directly if this file is executed
if (require.main === module) {
  seedComplianceAssets();
} 