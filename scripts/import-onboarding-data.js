const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get agency ID (hardcoded for your agency)
const AGENCY_ID = '00000000-0000-0000-0000-000000000001';

// Helper to convert Yes/No to boolean
function parseBoolean(value) {
  if (!value) return false;
  const str = String(value).toLowerCase().trim();
  return str === 'yes' || str === 'true' || str === '1';
}

// Helper to parse date
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

// Helper to parse number
function parseNumber(value) {
  if (!value || value === '') return null;
  return parseFloat(value);
}

async function importOnboardingData(filename) {
  console.log('📂 Reading Excel file...\n');

  const filepath = path.resolve(filename);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);

  const stats = {
    buildings: 0,
    units: 0,
    leaseholders: 0,
    leases: 0,
    apportionments: 0,
    compliance: 0
  };

  const buildingMap = new Map(); // name -> id
  const unitMap = new Map(); // building_name:unit_number -> id

  try {
    // ============================================
    // 1. IMPORT BUILDINGS
    // ============================================
    console.log('🏢 Importing buildings...');
    const buildingsSheet = workbook.getWorksheet('1. Buildings');

    if (buildingsSheet) {
      const buildings = [];
      buildingsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber <= 5) return; // Skip instruction rows

        const name = row.getCell(1).value;
        if (!name || name === 'Example Court') return; // Skip empty or example

        buildings.push({
          agency_id: AGENCY_ID,
          name: String(name),
          address: row.getCell(2).value,
          postcode: row.getCell(3).value,
          building_type: row.getCell(4).value || 'residential',
          is_hrb: parseBoolean(row.getCell(5).value),
          year_built: parseNumber(row.getCell(6).value),
          storeys: parseNumber(row.getCell(7).value),
          total_units: parseNumber(row.getCell(8).value),
          management_start_date: parseDate(row.getCell(9).value),
          freeholder_name: row.getCell(10).value,
          freeholder_address: row.getCell(11).value,
          service_charge_budget: parseNumber(row.getCell(12).value),
          reserve_fund_balance: parseNumber(row.getCell(13).value),
          insurance_renewal_date: parseDate(row.getCell(14).value),
          onboarding_notes: row.getCell(15).value
        });
      });

      for (const building of buildings) {
        const { data, error } = await supabase
          .from('buildings')
          .insert(building)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error importing building "${building.name}":`, error.message);
        } else {
          buildingMap.set(building.name, data.id);
          stats.buildings++;
          console.log(`  ✅ ${building.name}`);
        }
      }
    }
    console.log(`\n📊 Imported ${stats.buildings} buildings\n`);

    // ============================================
    // 2. IMPORT UNITS
    // ============================================
    console.log('🏘️  Importing units...');
    const unitsSheet = workbook.getWorksheet('2. Units');

    if (unitsSheet) {
      const units = [];
      unitsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber <= 5) return; // Skip instruction rows

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || buildingName === 'Example Court') return;

        const buildingId = buildingMap.get(String(buildingName));
        if (!buildingId) {
          console.error(`  ⚠️  Building "${buildingName}" not found for unit ${unitNumber}`);
          return;
        }

        units.push({
          building_name: String(buildingName),
          unit_number: String(unitNumber),
          data: {
            agency_id: AGENCY_ID,
            building_id: buildingId,
            unit_number: String(unitNumber),
            floor: row.getCell(3).value,
            unit_type: row.getCell(4).value || 'flat',
            bedrooms: parseNumber(row.getCell(5).value),
            bathrooms: parseNumber(row.getCell(6).value),
            sqft: parseNumber(row.getCell(7).value),
            balcony: parseBoolean(row.getCell(8).value),
            parking_spaces: parseNumber(row.getCell(9).value) || 0,
            lease_start_date: parseDate(row.getCell(10).value),
            lease_end_date: parseDate(row.getCell(11).value),
            ground_rent_pa: parseNumber(row.getCell(12).value),
            service_charge_pa: parseNumber(row.getCell(13).value),
            is_let: parseBoolean(row.getCell(14).value),
            tenant_name: row.getCell(15).value,
            tenant_email: row.getCell(16).value
          }
        });
      });

      for (const unit of units) {
        const { data, error } = await supabase
          .from('units')
          .insert(unit.data)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error importing unit "${unit.unit_number}":`, error.message);
        } else {
          unitMap.set(`${unit.building_name}:${unit.unit_number}`, data.id);
          stats.units++;
          console.log(`  ✅ ${unit.building_name} - ${unit.unit_number}`);
        }
      }
    }
    console.log(`\n📊 Imported ${stats.units} units\n`);

    // ============================================
    // 3. IMPORT LEASEHOLDERS
    // ============================================
    console.log('👥 Importing leaseholders...');
    const leaseholdersSheet = workbook.getWorksheet('3. Leaseholders');

    if (leaseholdersSheet) {
      const leaseholders = [];
      leaseholdersSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber <= 5) return; // Skip instruction rows

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || buildingName === 'Example Court') return;

        const unitId = unitMap.get(`${buildingName}:${unitNumber}`);
        if (!unitId) {
          console.error(`  ⚠️  Unit "${buildingName}:${unitNumber}" not found`);
          return;
        }

        const firstName = row.getCell(4).value;
        const lastName = row.getCell(5).value;
        const name = `${firstName || ''} ${lastName || ''}`.trim();

        leaseholders.push({
          name_display: name,
          data: {
            agency_id: AGENCY_ID,
            unit_id: unitId,
            name: name,
            title: row.getCell(3).value,
            first_name: firstName,
            last_name: lastName,
            company_name: row.getCell(6).value,
            email: row.getCell(7).value,
            home_phone: row.getCell(8).value,
            mobile_phone: row.getCell(9).value,
            work_phone: row.getCell(10).value,
            correspondence_address: row.getCell(11).value,
            correspondence_postcode: row.getCell(12).value,
            preferred_contact_method: row.getCell(13).value || 'email',
            is_company: parseBoolean(row.getCell(14).value),
            is_director: parseBoolean(row.getCell(15).value),
            director_position: row.getCell(16).value,
            director_since: parseDate(row.getCell(17).value),
            emergency_contact_name: row.getCell(18).value,
            emergency_contact_phone: row.getCell(19).value,
            notes: row.getCell(20).value
          }
        });
      });

      for (const leaseholder of leaseholders) {
        const { data, error } = await supabase
          .from('leaseholders')
          .insert(leaseholder.data)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error importing leaseholder "${leaseholder.name_display}":`, error.message);
        } else {
          stats.leaseholders++;
          console.log(`  ✅ ${leaseholder.name_display}`);
        }
      }
    }
    console.log(`\n📊 Imported ${stats.leaseholders} leaseholders\n`);

    // ============================================
    // 4. IMPORT LEASES
    // ============================================
    console.log('📄 Importing leases...');
    const leasesSheet = workbook.getWorksheet('4. Leases');

    if (leasesSheet) {
      const leases = [];
      leasesSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber <= 5) return; // Skip instruction rows

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || buildingName === 'Example Court') return;

        const buildingId = buildingMap.get(String(buildingName));
        const unitId = unitMap.get(`${buildingName}:${unitNumber}`);

        if (!buildingId || !unitId) {
          console.error(`  ⚠️  Building or unit not found for lease "${buildingName}:${unitNumber}"`);
          return;
        }

        leases.push({
          display: `${buildingName} - ${unitNumber}`,
          data: {
            agency_id: AGENCY_ID,
            building_id: buildingId,
            unit_id: unitId,
            lease_type: row.getCell(3).value || 'residential',
            start_date: parseDate(row.getCell(4).value),
            expiry_date: parseDate(row.getCell(5).value),
            original_term_years: parseNumber(row.getCell(6).value),
            unexpired_term_years: parseNumber(row.getCell(7).value),
            annual_ground_rent: parseNumber(row.getCell(8).value),
            ground_rent_review_date: parseDate(row.getCell(9).value),
            ground_rent_doubling_period: parseNumber(row.getCell(10).value),
            service_charge_percentage: parseNumber(row.getCell(11).value),
            lease_premium: parseNumber(row.getCell(12).value),
            deed_of_variation: row.getCell(13).value,
            permitted_use: row.getCell(14).value,
            subletting_permitted: parseBoolean(row.getCell(15).value),
            pets_permitted: parseBoolean(row.getCell(16).value),
            lease_plan_attached: parseBoolean(row.getCell(17).value),
            restrictions: row.getCell(18).value
          }
        });
      });

      for (const lease of leases) {
        const { data, error } = await supabase
          .from('leases')
          .insert(lease.data)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error importing lease "${lease.display}":`, error.message);
        } else {
          stats.leases++;
          console.log(`  ✅ ${lease.display}`);
        }
      }
    }
    console.log(`\n📊 Imported ${stats.leases} leases\n`);

    // ============================================
    // 5. IMPORT APPORTIONMENTS
    // ============================================
    console.log('💰 Importing apportionments...');
    const apportionmentsSheet = workbook.getWorksheet('5. Apportionments');

    if (apportionmentsSheet) {
      const apportionments = [];
      apportionmentsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber <= 9) return; // Skip instruction rows

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || buildingName === 'Example Court') return;

        const buildingId = buildingMap.get(String(buildingName));
        const unitId = unitMap.get(`${buildingName}:${unitNumber}`);

        if (!buildingId || !unitId) {
          console.error(`  ⚠️  Building or unit not found for apportionment "${buildingName}:${unitNumber}"`);
          return;
        }

        apportionments.push({
          display: `${buildingName} - ${unitNumber} (${row.getCell(3).value})`,
          data: {
            agency_id: AGENCY_ID,
            building_id: buildingId,
            unit_id: unitId,
            apportionment_type: row.getCell(3).value,
            percentage: parseNumber(row.getCell(4).value),
            fixed_amount: parseNumber(row.getCell(5).value),
            effective_from: parseDate(row.getCell(6).value) || new Date().toISOString().split('T')[0],
            effective_until: parseDate(row.getCell(7).value),
            calculation_method: row.getCell(8).value || 'percentage',
            notes: row.getCell(9).value
          }
        });
      });

      for (const apportionment of apportionments) {
        const { data, error } = await supabase
          .from('unit_apportionments')
          .insert(apportionment.data)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error importing apportionment "${apportionment.display}":`, error.message);
        } else {
          stats.apportionments++;
          console.log(`  ✅ ${apportionment.display}`);
        }
      }
    }
    console.log(`\n📊 Imported ${stats.apportionments} apportionments\n`);

    // ============================================
    // 6. IMPORT COMPLIANCE (OPTIONAL)
    // ============================================
    console.log('✅ Importing compliance status (optional)...');
    const complianceSheet = workbook.getWorksheet('6. Compliance (Optional)');

    if (complianceSheet) {
      const complianceRecords = [];
      complianceSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber <= 7) return; // Skip instruction rows

        const buildingName = row.getCell(1).value;
        const assetCode = row.getCell(2).value;
        if (!buildingName || !assetCode || buildingName === 'Example Court') return;

        const buildingId = buildingMap.get(String(buildingName));
        if (!buildingId) {
          console.error(`  ⚠️  Building "${buildingName}" not found for compliance`);
          return;
        }

        complianceRecords.push({
          display: `${buildingName} - ${assetCode}`,
          building_id: buildingId,
          asset_code: assetCode,
          data: {
            agency_id: AGENCY_ID,
            building_id: buildingId,
            asset_id: assetCode,
            status: row.getCell(3).value || 'pending',
            last_renewed_date: parseDate(row.getCell(4).value),
            next_due_date: parseDate(row.getCell(5).value),
            contractor_name: row.getCell(6).value,
            contractor_email: row.getCell(7).value,
            contractor_phone: row.getCell(8).value,
            certificate_reference: row.getCell(9).value,
            cost: parseNumber(row.getCell(10).value),
            compliance_notes: row.getCell(11).value
          }
        });
      });

      for (const compliance of complianceRecords) {
        // First, get the compliance_master_asset_id
        const { data: masterAsset } = await supabase
          .from('compliance_master_assets')
          .select('id')
          .eq('asset_code', compliance.asset_code)
          .single();

        if (!masterAsset) {
          console.error(`  ⚠️  Compliance asset code "${compliance.asset_code}" not found in master list`);
          continue;
        }

        compliance.data.compliance_master_asset_id = masterAsset.id;

        const { data, error } = await supabase
          .from('building_compliance_assets')
          .insert(compliance.data)
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Error importing compliance "${compliance.display}":`, error.message);
        } else {
          stats.compliance++;
          console.log(`  ✅ ${compliance.display}`);
        }
      }
    }
    console.log(`\n📊 Imported ${stats.compliance} compliance records\n`);

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✨ IMPORT COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log(`🏢 Buildings:      ${stats.buildings}`);
    console.log(`🏘️  Units:          ${stats.units}`);
    console.log(`👥 Leaseholders:   ${stats.leaseholders}`);
    console.log(`📄 Leases:         ${stats.leases}`);
    console.log(`💰 Apportionments: ${stats.apportionments}`);
    console.log(`✅ Compliance:     ${stats.compliance}`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('🎉 Your data is now ready in BlocIQ!');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
const filename = process.argv[2];

if (!filename) {
  console.error('❌ Please provide the Excel filename');
  console.error('Usage: node scripts/import-onboarding-data.js BlocIQ_Onboarding_Template.xlsx');
  process.exit(1);
}

importOnboardingData(filename);