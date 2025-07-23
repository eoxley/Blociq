import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Compliance assets data
const complianceAssets = [
  // Legal & Safety
  { id: 'ca-001', name: 'Fire Risk Assessment (FRA)', description: 'Comprehensive fire safety assessment of the building and its systems', category: 'Legal & Safety' },
  { id: 'ca-002', name: 'Fire Safety Management Plan', description: 'Documented procedures for fire safety management and emergency response', category: 'Legal & Safety' },
  { id: 'ca-003', name: 'Fire Alarm System Maintenance', description: 'Regular testing and maintenance of fire alarm and detection systems', category: 'Legal & Safety' },
  { id: 'ca-004', name: 'Emergency Lighting Testing', description: 'Monthly testing and annual certification of emergency lighting systems', category: 'Legal & Safety' },
  { id: 'ca-005', name: 'Fire Extinguisher Servicing', description: 'Annual servicing and certification of fire extinguishers', category: 'Legal & Safety' },
  { id: 'ca-006', name: 'Fire Door Inspections', description: 'Quarterly inspections of fire doors and their self-closing mechanisms', category: 'Legal & Safety' },
  { id: 'ca-007', name: 'Fire Safety Training', description: 'Annual fire safety training for staff and residents', category: 'Legal & Safety' },
  { id: 'ca-008', name: 'Fire Safety Signage', description: 'Maintenance and compliance of fire safety signs and notices', category: 'Legal & Safety' },

  // Structural & Condition
  { id: 'ca-009', name: 'Building Condition Survey', description: 'Comprehensive assessment of building structure and condition', category: 'Structural & Condition' },
  { id: 'ca-010', name: 'Roof Inspections', description: 'Annual inspection of roof condition and waterproofing', category: 'Structural & Condition' },
  { id: 'ca-011', name: 'External Wall Inspections', description: 'Regular inspection of external walls and cladding systems', category: 'Structural & Condition' },
  { id: 'ca-012', name: 'Drainage System Maintenance', description: 'Regular cleaning and inspection of drainage systems', category: 'Structural & Condition' },
  { id: 'ca-013', name: 'Window and Door Inspections', description: 'Annual inspection of windows, doors and their security features', category: 'Structural & Condition' },
  { id: 'ca-014', name: 'Pavement and Hardstanding', description: 'Regular inspection of external paving and hardstanding areas', category: 'Structural & Condition' },
  { id: 'ca-015', name: 'Boundary Fencing', description: 'Inspection and maintenance of boundary fencing and gates', category: 'Structural & Condition' },

  // Operational & Contracts
  { id: 'ca-016', name: 'Lift Maintenance Contract', description: 'Regular maintenance and safety inspections of passenger lifts', category: 'Operational & Contracts' },
  { id: 'ca-017', name: 'Heating System Maintenance', description: 'Annual servicing and maintenance of central heating systems', category: 'Operational & Contracts' },
  { id: 'ca-018', name: 'Hot Water System Maintenance', description: 'Regular maintenance of hot water systems and temperature monitoring', category: 'Operational & Contracts' },
  { id: 'ca-019', name: 'Ventilation System Maintenance', description: 'Maintenance of mechanical ventilation and air conditioning systems', category: 'Operational & Contracts' },
  { id: 'ca-020', name: 'Cleaning Contract Management', description: 'Management of cleaning contracts and service standards', category: 'Operational & Contracts' },
  { id: 'ca-021', name: 'Waste Management Contract', description: 'Management of waste collection and recycling services', category: 'Operational & Contracts' },
  { id: 'ca-022', name: 'Security System Maintenance', description: 'Maintenance of CCTV, access control and security systems', category: 'Operational & Contracts' },
  { id: 'ca-023', name: 'Landscaping Maintenance', description: 'Regular maintenance of gardens and landscaping', category: 'Operational & Contracts' },

  // Insurance
  { id: 'ca-024', name: 'Building Insurance', description: 'Comprehensive building insurance with adequate coverage', category: 'Insurance' },
  { id: 'ca-025', name: 'Public Liability Insurance', description: 'Public liability insurance for common areas and operations', category: 'Insurance' },
  { id: 'ca-026', name: 'Employers Liability Insurance', description: 'Insurance coverage for staff and contractors', category: 'Insurance' },
  { id: 'ca-027', name: 'Directors & Officers Insurance', description: 'D&O insurance for board members and officers', category: 'Insurance' },
  { id: 'ca-028', name: 'Professional Indemnity Insurance', description: 'Professional indemnity coverage for management services', category: 'Insurance' },
  { id: 'ca-029', name: 'Cyber Insurance', description: 'Insurance coverage for cyber risks and data protection', category: 'Insurance' },

  // Lease & Documentation
  { id: 'ca-030', name: 'Lease Compliance Review', description: 'Annual review of lease compliance and obligations', category: 'Lease & Documentation' },
  { id: 'ca-031', name: 'Service Charge Budget', description: 'Annual preparation and distribution of service charge budgets', category: 'Lease & Documentation' },
  { id: 'ca-032', name: 'Service Charge Accounts', description: 'Annual preparation and certification of service charge accounts', category: 'Lease & Documentation' },
  { id: 'ca-033', name: 'Section 20 Consultation', description: 'Consultation process for major works and long-term agreements', category: 'Lease & Documentation' },
  { id: 'ca-034', name: 'Ground Rent Collection', description: 'Collection and accounting of ground rent payments', category: 'Lease & Documentation' },
  { id: 'ca-035', name: 'Leaseholder Communication', description: 'Regular communication with leaseholders on building matters', category: 'Lease & Documentation' },
  { id: 'ca-036', name: 'Dispute Resolution', description: 'Management of leaseholder disputes and complaints', category: 'Lease & Documentation' },

  // Admin
  { id: 'ca-037', name: 'Annual General Meeting', description: 'Annual general meeting of leaseholders', category: 'Admin' },
  { id: 'ca-038', name: 'Board Meeting Minutes', description: 'Regular board meetings and minute keeping', category: 'Admin' },
  { id: 'ca-039', name: 'Financial Reporting', description: 'Monthly financial reporting and budget monitoring', category: 'Admin' },
  { id: 'ca-040', name: 'Contractor Management', description: 'Management of contractor relationships and performance', category: 'Admin' },
  { id: 'ca-041', name: 'Health & Safety Policy', description: 'Health and safety policy and risk assessments', category: 'Admin' },
  { id: 'ca-042', name: 'Data Protection Compliance', description: 'GDPR compliance and data protection measures', category: 'Admin' },
  { id: 'ca-043', name: 'Complaints Procedure', description: 'Formal complaints procedure and handling', category: 'Admin' },

  // Smart Records
  { id: 'ca-044', name: 'Digital Document Management', description: 'Digital storage and management of compliance documents', category: 'Smart Records' },
  { id: 'ca-045', name: 'Building Management System', description: 'Monitoring and control of building systems', category: 'Smart Records' },
  { id: 'ca-046', name: 'Energy Monitoring', description: 'Real-time energy consumption monitoring and reporting', category: 'Smart Records' },
  { id: 'ca-047', name: 'Smart Metering', description: 'Smart metering systems for utilities', category: 'Smart Records' },
  { id: 'ca-048', name: 'Digital Access Control', description: 'Digital access control and visitor management', category: 'Smart Records' },
  { id: 'ca-049', name: 'IoT Sensor Monitoring', description: 'Internet of Things sensor monitoring for building systems', category: 'Smart Records' },
  { id: 'ca-050', name: 'Predictive Maintenance', description: 'Predictive maintenance systems and analytics', category: 'Smart Records' },

  // Safety (BSA-specific)
  { id: 'ca-051', name: 'Asbestos Management Survey', description: 'Asbestos survey and management plan', category: 'Safety' },
  { id: 'ca-052', name: 'Asbestos Re-inspection', description: 'Annual re-inspection of asbestos-containing materials', category: 'Safety' },
  { id: 'ca-053', name: 'Legionella Risk Assessment', description: 'Legionella risk assessment and water system management', category: 'Safety' },
  { id: 'ca-054', name: 'Gas Safety Certificate', description: 'Annual gas safety inspection and certification', category: 'Safety' },
  { id: 'ca-055', name: 'Electrical Installation Condition Report (EICR)', description: 'Periodic inspection of electrical installations', category: 'Safety' },
  { id: 'ca-056', name: 'Portable Appliance Testing (PAT)', description: 'Annual testing of portable electrical appliances', category: 'Safety' },
  { id: 'ca-057', name: 'Working at Height Risk Assessment', description: 'Risk assessment for working at height activities', category: 'Safety' },
  { id: 'ca-058', name: 'Confined Space Risk Assessment', description: 'Risk assessment for confined space work', category: 'Safety' },
  { id: 'ca-059', name: 'Manual Handling Risk Assessment', description: 'Risk assessment for manual handling activities', category: 'Safety' },
  { id: 'ca-060', name: 'Noise Risk Assessment', description: 'Assessment of noise levels and hearing protection', category: 'Safety' },
  { id: 'ca-061', name: 'Vibration Risk Assessment', description: 'Assessment of hand-arm and whole-body vibration', category: 'Safety' },
  { id: 'ca-062', name: 'Display Screen Equipment Assessment', description: 'DSE assessment for office workstations', category: 'Safety' },
  { id: 'ca-063', name: 'First Aid Provision', description: 'First aid provision and training', category: 'Safety' },
  { id: 'ca-064', name: 'Accident Reporting', description: 'Accident reporting and investigation procedures', category: 'Safety' },
  { id: 'ca-065', name: 'Emergency Procedures', description: 'Emergency procedures and evacuation plans', category: 'Safety' },
  { id: 'ca-066', name: 'Security Risk Assessment', description: 'Security risk assessment and measures', category: 'Safety' },
  { id: 'ca-067', name: 'Environmental Risk Assessment', description: 'Environmental risk assessment and management', category: 'Safety' },
  { id: 'ca-068', name: 'Sustainability Reporting', description: 'Environmental sustainability reporting and targets', category: 'Safety' },
  { id: 'ca-069', name: 'Energy Performance Certificate (EPC)', description: 'Energy performance assessment and certification', category: 'Safety' },
  { id: 'ca-070', name: 'Carbon Reduction Plan', description: 'Carbon reduction strategy and implementation', category: 'Safety' }
];

async function seedComplianceAssets() {
  try {
    console.log('🌱 Starting compliance assets seeding...');
    
    // Insert all compliance assets
    const { data, error } = await supabase
      .from('compliance_assets')
      .upsert(complianceAssets, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error seeding compliance assets:', error.message);
      return;
    }
    
    console.log('✅ Compliance assets seeded successfully!');
    
    // Verify the seeding
    const { data: assets, error: verifyError } = await supabase
      .from('compliance_assets')
      .select('category')
      .order('category');
    
    if (verifyError) {
      console.error('❌ Error verifying seeding:', verifyError.message);
    } else {
      const categoryCounts = assets.reduce((acc: Record<string, number>, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Category breakdown:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} assets`);
      });
      console.log(`Total: ${assets.length} compliance assets`);
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run the seeding
seedComplianceAssets(); 