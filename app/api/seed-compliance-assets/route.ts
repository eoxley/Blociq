import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    console.log('🌱 Starting compliance assets seeding...');
    
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
      },
      {
        title: 'Fire Risk Assessment (FRA)',
        description: 'Comprehensive fire safety assessment of the building and its systems',
        category: 'Fire Safety'
      },
      {
        title: 'Fire Alarm System Maintenance',
        description: 'Regular testing and maintenance of fire alarm and detection systems',
        category: 'Fire Safety'
      },
      {
        title: 'Emergency Lighting Testing',
        description: 'Monthly testing and annual certification of emergency lighting systems',
        category: 'Fire Safety'
      },
      {
        title: 'Building Condition Survey',
        description: 'Comprehensive assessment of building structure and condition',
        category: 'Structural'
      },
      {
        title: 'Lift Maintenance Contract',
        description: 'Regular maintenance and safety inspections of passenger lifts',
        category: 'Operational'
      },
      {
        title: 'Heating System Maintenance',
        description: 'Annual servicing and maintenance of central heating systems',
        category: 'Operational'
      }
    ];

    // Use upsert to avoid duplicates
    const { data: insertedAssets, error } = await supabaseAdmin
      .from('compliance_assets')
      .upsert(complianceAssets, { 
        onConflict: 'title',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('❌ Failed to insert compliance assets:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Inserted ${insertedAssets.length} compliance assets`);
    
    // Group by category for summary
    const categoryCounts = insertedAssets.reduce((acc: Record<string, number>, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ 
      success: true,
      message: `Inserted ${insertedAssets.length} compliance assets`,
      categoryCounts,
      assets: insertedAssets
    });

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
