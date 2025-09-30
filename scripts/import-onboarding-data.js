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
    leases: 0
  };

  const buildingMap = new Map(); // name -> id
  const unitMap = new Map(); // building_name:unit_number -> id

  try {
    // ============================================
    // 1. IMPORT BUILDINGS
    // ============================================
    console.log('🏢 Importing buildings...');
    const buildingsSheet = workbook.getWorksheet('Buildings');

    if (buildingsSheet) {
      const buildings = [];
      buildingsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber === 3) return; // Skip note rows

        const name = row.getCell(1).value;
        if (!name || String(name).toLowerCase().includes('example') || String(name).toLowerCase().includes('instruction') || String(name).toLowerCase().includes('note:')) return; // Skip empty or example

        const buildingData = {
          agency_id: AGENCY_ID,
          name: String(name).trim(),
          address: row.getCell(2).value,
          unit_count: parseNumber(row.getCell(3).value),
          structure_type: row.getCell(4).value,
          client_type: row.getCell(5).value,
          client_name: row.getCell(6).value,
          client_contact: row.getCell(7).value,
          client_email: row.getCell(8).value,
          operational_notes: row.getCell(9).value,
          access_notes: row.getCell(10).value,
          sites_staff: row.getCell(11).value,
          parking_info: row.getCell(12).value,
          council_borough: row.getCell(13).value,
          building_manager_name: row.getCell(14).value,
          building_manager_email: row.getCell(15).value,
          building_manager_phone: row.getCell(16).value,
          emergency_contact_name: row.getCell(17).value,
          emergency_contact_phone: row.getCell(18).value,
          building_age: row.getCell(19).value,
          construction_type: row.getCell(20).value,
          total_floors: row.getCell(21).value,
          lift_available: row.getCell(22).value,
          heating_type: row.getCell(23).value,
          hot_water_type: row.getCell(24).value,
          waste_collection_day: row.getCell(25).value,
          recycling_info: row.getCell(26).value,
          building_insurance_provider: row.getCell(27).value,
          building_insurance_expiry: parseDate(row.getCell(28).value),
          fire_safety_status: row.getCell(29).value,
          asbestos_status: row.getCell(30).value,
          energy_rating: row.getCell(31).value,
          service_charge_frequency: row.getCell(32).value,
          ground_rent_amount: parseNumber(row.getCell(33).value),
          ground_rent_frequency: row.getCell(34).value,
          notes: row.getCell(35).value,
          key_access_notes: row.getCell(36).value,
          entry_code: row.getCell(37).value,
          fire_panel_location: row.getCell(38).value,
        };

        // Only include fields that have values
        const cleanedData = {};
        for (const [key, value] of Object.entries(buildingData)) {
          if (value !== null && value !== undefined && value !== '') {
            cleanedData[key] = value;
          }
        }

        buildings.push(cleanedData);
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
    const unitsSheet = workbook.getWorksheet('Units');

    if (unitsSheet) {
      const units = [];
      unitsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || String(buildingName).toLowerCase().includes('example') || String(buildingName).toLowerCase().includes('instruction')) return;

        const buildingId = buildingMap.get(String(buildingName).trim());
        if (!buildingId) {
          console.error(`  ⚠️  Building "${buildingName}" not found for unit ${unitNumber}`);
          return;
        }

        units.push({
          building_name: String(buildingName).trim(),
          unit_number: String(unitNumber).trim(),
          data: {
            building_id: buildingId,
            unit_number: String(unitNumber).trim(),
            type: row.getCell(3).value,
            floor: row.getCell(4).value
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
    const leaseholdersSheet = workbook.getWorksheet('Leaseholders');

    if (leaseholdersSheet) {
      const leaseholders = [];
      leaseholdersSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || String(buildingName).toLowerCase().includes('example') || String(buildingName).toLowerCase().includes('instruction')) return;

        const unitId = unitMap.get(`${String(buildingName).trim()}:${String(unitNumber).trim()}`);
        if (!unitId) {
          console.error(`  ⚠️  Unit "${buildingName}:${unitNumber}" not found`);
          return;
        }

        const name = row.getCell(3).value;

        leaseholders.push({
          name_display: name,
          data: {
            unit_id: unitId,
            name: name ? String(name).trim() : null,
            email: row.getCell(4).value,
            phone: row.getCell(5).value
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
    const leasesSheet = workbook.getWorksheet('Leases');

    if (leasesSheet) {
      const leases = [];
      leasesSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (rowNumber === 3) return; // Skip note row

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || String(buildingName).toLowerCase().includes('example') || String(buildingName).toLowerCase().includes('instruction') || String(buildingName).toLowerCase().includes('note:')) return;

        const buildingId = buildingMap.get(String(buildingName).trim());
        const unitId = unitMap.get(`${String(buildingName).trim()}:${String(unitNumber).trim()}`);

        if (!buildingId || !unitId) {
          console.error(`  ⚠️  Building or unit not found for lease "${buildingName}:${unitNumber}"`);
          return;
        }

        leases.push({
          display: `${buildingName} - ${unitNumber}`,
          data: {
            building_id: buildingId,
            unit_id: unitId,
            doc_type: row.getCell(3).value,
            doc_url: row.getCell(4).value,
            start_date: parseDate(row.getCell(5).value),
            expiry_date: parseDate(row.getCell(6).value),
            is_headlease: parseBoolean(row.getCell(7).value)
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
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('🎉 Your data is now ready in BlocIQ!');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  }
}

const filename = process.argv[2];

if (!filename) {
  console.error('❌ Please provide an Excel file path');
  console.error('Usage: node import-onboarding-data.js YOUR_FILE.xlsx');
  process.exit(1);
}

importOnboardingData(filename);
/* REMOVED SECTIONS - apportionments and compliance are not in simplified template
    if (apportionmentsSheet) {
      const apportionments = [];
      apportionmentsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const buildingName = row.getCell(1).value;
        const unitNumber = row.getCell(2).value;
        if (!buildingName || !unitNumber || String(buildingName).toLowerCase().includes('example') || String(buildingName).toLowerCase().includes('instruction')) return;

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

        const buildingName = row.getCell(1).value;
        const assetCode = row.getCell(2).value;
        if (!buildingName || !assetCode || String(buildingName).toLowerCase().includes('example') || String(buildingName).toLowerCase().includes('instruction')) return;

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