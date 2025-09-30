const ExcelJS = require('exceljs');
const path = require('path');

async function createOnboardingTemplate() {
  const workbook = new ExcelJS.Workbook();

  // ============================================
  // SHEET 1: BUILDINGS
  // ============================================
  const buildingsSheet = workbook.addWorksheet('1. Buildings');

  buildingsSheet.columns = [
    { header: 'Building Name*', key: 'name', width: 30 },
    { header: 'Address*', key: 'address', width: 40 },
    { header: 'Postcode*', key: 'postcode', width: 12 },
    { header: 'Building Type', key: 'building_type', width: 15 },
    { header: 'Is High Risk Building', key: 'is_hrb', width: 20 },
    { header: 'Year Built', key: 'year_built', width: 12 },
    { header: 'Number of Storeys', key: 'storeys', width: 18 },
    { header: 'Total Units', key: 'total_units', width: 12 },
    { header: 'Management Start Date', key: 'management_start_date', width: 22 },
    { header: 'Freeholder Name', key: 'freeholder_name', width: 30 },
    { header: 'Freeholder Address', key: 'freeholder_address', width: 40 },
    { header: 'Service Charge Budget (£)', key: 'service_charge_budget', width: 25 },
    { header: 'Reserve Fund Balance (£)', key: 'reserve_fund_balance', width: 25 },
    { header: 'Insurance Renewal Date', key: 'insurance_renewal_date', width: 22 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  // Style header row
  buildingsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  buildingsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };

  // Add example data
  buildingsSheet.addRow({
    name: 'Example Court',
    address: '123 Example Street, London',
    postcode: 'SW1A 1AA',
    building_type: 'residential',
    is_hrb: 'No',
    year_built: 1990,
    storeys: 5,
    total_units: 24,
    management_start_date: '2024-01-01',
    freeholder_name: 'Example Freehold Ltd',
    freeholder_address: '456 Freehold Road, London, W1A 1AA',
    service_charge_budget: 120000,
    reserve_fund_balance: 50000,
    insurance_renewal_date: '2025-12-31',
    notes: 'Example building - replace with your data'
  });

  // Add instructions
  buildingsSheet.getCell('A3').value = 'INSTRUCTIONS: Fill in one row per building. Fields marked with * are required.';
  buildingsSheet.getCell('A3').font = { italic: true, color: { argb: 'FF666666' } };
  buildingsSheet.getCell('A4').value = 'Building Type options: residential, commercial, mixed_use';
  buildingsSheet.getCell('A4').font = { italic: true, color: { argb: 'FF666666' } };
  buildingsSheet.getCell('A5').value = 'Is High Risk Building: Yes or No';
  buildingsSheet.getCell('A5').font = { italic: true, color: { argb: 'FF666666' } };

  // ============================================
  // SHEET 2: UNITS
  // ============================================
  const unitsSheet = workbook.addWorksheet('2. Units');

  unitsSheet.columns = [
    { header: 'Building Name*', key: 'building_name', width: 30 },
    { header: 'Unit Number*', key: 'unit_number', width: 15 },
    { header: 'Floor', key: 'floor', width: 10 },
    { header: 'Unit Type', key: 'unit_type', width: 15 },
    { header: 'Bedrooms', key: 'bedrooms', width: 12 },
    { header: 'Bathrooms', key: 'bathrooms', width: 12 },
    { header: 'Square Feet', key: 'sqft', width: 15 },
    { header: 'Has Balcony', key: 'balcony', width: 15 },
    { header: 'Parking Spaces', key: 'parking_spaces', width: 15 },
    { header: 'Lease Start Date', key: 'lease_start_date', width: 18 },
    { header: 'Lease End Date', key: 'lease_end_date', width: 18 },
    { header: 'Ground Rent p.a. (£)', key: 'ground_rent_pa', width: 20 },
    { header: 'Service Charge p.a. (£)', key: 'service_charge_pa', width: 22 },
    { header: 'Is Currently Let', key: 'is_let', width: 18 },
    { header: 'Tenant Name', key: 'tenant_name', width: 30 },
    { header: 'Tenant Email', key: 'tenant_email', width: 30 }
  ];

  unitsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  unitsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };

  unitsSheet.addRows([
    {
      building_name: 'Example Court',
      unit_number: 'Flat 1',
      floor: 'Ground',
      unit_type: 'flat',
      bedrooms: 2,
      bathrooms: 1,
      sqft: 750,
      balcony: 'No',
      parking_spaces: 1,
      lease_start_date: '1990-01-01',
      lease_end_date: '2115-01-01',
      ground_rent_pa: 250,
      service_charge_pa: 2400,
      is_let: 'Yes',
      tenant_name: 'John Smith',
      tenant_email: 'john.smith@example.com'
    },
    {
      building_name: 'Example Court',
      unit_number: 'Flat 2',
      floor: 'First',
      unit_type: 'flat',
      bedrooms: 1,
      bathrooms: 1,
      sqft: 550,
      balcony: 'Yes',
      parking_spaces: 0,
      lease_start_date: '1990-01-01',
      lease_end_date: '2115-01-01',
      ground_rent_pa: 250,
      service_charge_pa: 1800,
      is_let: 'No',
      tenant_name: '',
      tenant_email: ''
    }
  ]);

  unitsSheet.getCell('A4').value = 'INSTRUCTIONS: Fill in one row per unit. Unit Number must be unique within each building.';
  unitsSheet.getCell('A4').font = { italic: true, color: { argb: 'FF666666' } };
  unitsSheet.getCell('A5').value = 'Unit Type options: flat, maisonette, house, commercial, parking, storage';
  unitsSheet.getCell('A5').font = { italic: true, color: { argb: 'FF666666' } };

  // ============================================
  // SHEET 3: LEASEHOLDERS
  // ============================================
  const leaseholdersSheet = workbook.addWorksheet('3. Leaseholders');

  leaseholdersSheet.columns = [
    { header: 'Building Name*', key: 'building_name', width: 30 },
    { header: 'Unit Number*', key: 'unit_number', width: 15 },
    { header: 'Title', key: 'title', width: 8 },
    { header: 'First Name*', key: 'first_name', width: 20 },
    { header: 'Last Name*', key: 'last_name', width: 20 },
    { header: 'Company Name', key: 'company_name', width: 30 },
    { header: 'Email*', key: 'email', width: 35 },
    { header: 'Home Phone', key: 'home_phone', width: 18 },
    { header: 'Mobile Phone', key: 'mobile_phone', width: 18 },
    { header: 'Work Phone', key: 'work_phone', width: 18 },
    { header: 'Correspondence Address', key: 'correspondence_address', width: 40 },
    { header: 'Correspondence Postcode', key: 'correspondence_postcode', width: 22 },
    { header: 'Preferred Contact', key: 'preferred_contact_method', width: 18 },
    { header: 'Is Company', key: 'is_company', width: 12 },
    { header: 'Is RMC Director', key: 'is_director', width: 15 },
    { header: 'Director Position', key: 'director_position', width: 18 },
    { header: 'Director Since', key: 'director_since', width: 15 },
    { header: 'Emergency Contact Name', key: 'emergency_contact_name', width: 25 },
    { header: 'Emergency Contact Phone', key: 'emergency_contact_phone', width: 25 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  leaseholdersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  leaseholdersSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };

  leaseholdersSheet.addRows([
    {
      building_name: 'Example Court',
      unit_number: 'Flat 1',
      title: 'Mr',
      first_name: 'John',
      last_name: 'Smith',
      company_name: '',
      email: 'john.smith@example.com',
      home_phone: '020 1234 5678',
      mobile_phone: '07700 900123',
      work_phone: '',
      correspondence_address: 'Same as unit address',
      correspondence_postcode: '',
      preferred_contact_method: 'email',
      is_company: 'No',
      is_director: 'Yes',
      director_position: 'Chairman',
      director_since: '2020-01-01',
      emergency_contact_name: 'Jane Smith',
      emergency_contact_phone: '07700 900456',
      notes: ''
    },
    {
      building_name: 'Example Court',
      unit_number: 'Flat 2',
      title: 'Ms',
      first_name: 'Sarah',
      last_name: 'Johnson',
      company_name: '',
      email: 'sarah.j@example.com',
      home_phone: '',
      mobile_phone: '07700 900789',
      work_phone: '020 9876 5432',
      correspondence_address: '10 Alternative Road, Manchester, M1 1AA',
      correspondence_postcode: 'M1 1AA',
      preferred_contact_method: 'email',
      is_company: 'No',
      is_director: 'No',
      director_position: '',
      director_since: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: 'Prefers email contact only'
    }
  ]);

  leaseholdersSheet.getCell('A4').value = 'INSTRUCTIONS: Fill in one row per leaseholder. Multiple leaseholders can own the same unit.';
  leaseholdersSheet.getCell('A4').font = { italic: true, color: { argb: 'FF666666' } };
  leaseholdersSheet.getCell('A5').value = 'Preferred Contact options: email, phone, post';
  leaseholdersSheet.getCell('A5').font = { italic: true, color: { argb: 'FF666666' } };

  // ============================================
  // SHEET 4: LEASES
  // ============================================
  const leasesSheet = workbook.addWorksheet('4. Leases');

  leasesSheet.columns = [
    { header: 'Building Name*', key: 'building_name', width: 30 },
    { header: 'Unit Number*', key: 'unit_number', width: 15 },
    { header: 'Lease Type', key: 'lease_type', width: 15 },
    { header: 'Start Date*', key: 'start_date', width: 15 },
    { header: 'Expiry Date*', key: 'expiry_date', width: 15 },
    { header: 'Original Term (years)', key: 'original_term_years', width: 20 },
    { header: 'Unexpired Term (years)', key: 'unexpired_term_years', width: 22 },
    { header: 'Annual Ground Rent (£)', key: 'annual_ground_rent', width: 22 },
    { header: 'Ground Rent Review Date', key: 'ground_rent_review_date', width: 25 },
    { header: 'Ground Rent Doubling Period', key: 'ground_rent_doubling_period', width: 28 },
    { header: 'Service Charge %', key: 'service_charge_percentage', width: 18 },
    { header: 'Lease Premium (£)', key: 'lease_premium', width: 18 },
    { header: 'Deed of Variation', key: 'deed_of_variation', width: 20 },
    { header: 'Permitted Use', key: 'permitted_use', width: 30 },
    { header: 'Subletting Permitted', key: 'subletting_permitted', width: 20 },
    { header: 'Pets Permitted', key: 'pets_permitted', width: 15 },
    { header: 'Lease Plan Attached', key: 'lease_plan_attached', width: 20 },
    { header: 'Restrictions', key: 'restrictions', width: 50 }
  ];

  leasesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  leasesSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };

  leasesSheet.addRows([
    {
      building_name: 'Example Court',
      unit_number: 'Flat 1',
      lease_type: 'residential',
      start_date: '1990-01-01',
      expiry_date: '2115-01-01',
      original_term_years: 125,
      unexpired_term_years: 90,
      annual_ground_rent: 250,
      ground_rent_review_date: '2030-01-01',
      ground_rent_doubling_period: 25,
      service_charge_percentage: 4.17,
      lease_premium: 250000,
      deed_of_variation: 'No',
      permitted_use: 'Residential dwelling only',
      subletting_permitted: 'Yes',
      pets_permitted: 'No',
      lease_plan_attached: 'Yes',
      restrictions: 'No business use, no noise after 11pm'
    },
    {
      building_name: 'Example Court',
      unit_number: 'Flat 2',
      lease_type: 'residential',
      start_date: '1990-01-01',
      expiry_date: '2115-01-01',
      original_term_years: 125,
      unexpired_term_years: 90,
      annual_ground_rent: 250,
      ground_rent_review_date: '2030-01-01',
      ground_rent_doubling_period: 25,
      service_charge_percentage: 3.13,
      lease_premium: 180000,
      deed_of_variation: 'No',
      permitted_use: 'Residential dwelling only',
      subletting_permitted: 'Yes',
      pets_permitted: 'Yes',
      lease_plan_attached: 'Yes',
      restrictions: 'Small pets only (under 10kg)'
    }
  ]);

  leasesSheet.getCell('A4').value = 'INSTRUCTIONS: Fill in one row per lease. Typically one lease per unit.';
  leasesSheet.getCell('A4').font = { italic: true, color: { argb: 'FF666666' } };
  leasesSheet.getCell('A5').value = 'Lease Type options: residential, commercial, ground, head';
  leasesSheet.getCell('A5').font = { italic: true, color: { argb: 'FF666666' } };

  // ============================================
  // SHEET 5: SERVICE CHARGE APPORTIONMENTS
  // ============================================
  const apportionmentsSheet = workbook.addWorksheet('5. Apportionments');

  apportionmentsSheet.columns = [
    { header: 'Building Name*', key: 'building_name', width: 30 },
    { header: 'Unit Number*', key: 'unit_number', width: 15 },
    { header: 'Apportionment Type*', key: 'apportionment_type', width: 20 },
    { header: 'Percentage*', key: 'percentage', width: 12 },
    { header: 'Fixed Amount (£)', key: 'fixed_amount', width: 18 },
    { header: 'Effective From*', key: 'effective_from', width: 18 },
    { header: 'Effective Until', key: 'effective_until', width: 18 },
    { header: 'Calculation Method', key: 'calculation_method', width: 20 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  apportionmentsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  apportionmentsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };

  apportionmentsSheet.addRows([
    {
      building_name: 'Example Court',
      unit_number: 'Flat 1',
      apportionment_type: 'service_charge',
      percentage: 4.17,
      fixed_amount: '',
      effective_from: '2024-01-01',
      effective_until: '',
      calculation_method: 'percentage',
      notes: 'Based on floor area'
    },
    {
      building_name: 'Example Court',
      unit_number: 'Flat 1',
      apportionment_type: 'reserve_fund',
      percentage: 4.17,
      fixed_amount: '',
      effective_from: '2024-01-01',
      effective_until: '',
      calculation_method: 'percentage',
      notes: 'Same as service charge'
    },
    {
      building_name: 'Example Court',
      unit_number: 'Flat 2',
      apportionment_type: 'service_charge',
      percentage: 3.13,
      fixed_amount: '',
      effective_from: '2024-01-01',
      effective_until: '',
      calculation_method: 'percentage',
      notes: 'Based on floor area'
    },
    {
      building_name: 'Example Court',
      unit_number: 'Flat 2',
      apportionment_type: 'reserve_fund',
      percentage: 3.13,
      fixed_amount: '',
      effective_from: '2024-01-01',
      effective_until: '',
      calculation_method: 'percentage',
      notes: 'Same as service charge'
    }
  ]);

  apportionmentsSheet.getCell('A6').value = 'INSTRUCTIONS: Each unit typically has 2 rows - one for service_charge and one for reserve_fund.';
  apportionmentsSheet.getCell('A6').font = { italic: true, color: { argb: 'FF666666' } };
  apportionmentsSheet.getCell('A7').value = 'Apportionment Type options: service_charge, reserve_fund, ground_rent, insurance';
  apportionmentsSheet.getCell('A7').font = { italic: true, color: { argb: 'FF666666' } };
  apportionmentsSheet.getCell('A8').value = 'Calculation Method options: percentage, fixed_amount, per_unit, by_floor_area';
  apportionmentsSheet.getCell('A8').font = { italic: true, color: { argb: 'FF666666' } };
  apportionmentsSheet.getCell('A9').value = 'All percentages across units should add up to 100% for each building and type.';
  apportionmentsSheet.getCell('A9').font = { italic: true, color: { argb: 'FF666666' } };

  // ============================================
  // SHEET 6: COMPLIANCE STATUS (OPTIONAL)
  // ============================================
  const complianceSheet = workbook.addWorksheet('6. Compliance (Optional)');

  complianceSheet.columns = [
    { header: 'Building Name*', key: 'building_name', width: 30 },
    { header: 'Asset Code*', key: 'asset_code', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Last Inspection Date', key: 'last_inspection_date', width: 20 },
    { header: 'Next Due Date', key: 'next_inspection_due', width: 20 },
    { header: 'Contractor Name', key: 'contractor_name', width: 30 },
    { header: 'Contractor Email', key: 'contractor_email', width: 30 },
    { header: 'Contractor Phone', key: 'contractor_phone', width: 18 },
    { header: 'Certificate Reference', key: 'certificate_reference', width: 25 },
    { header: 'Cost (£)', key: 'cost', width: 12 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  complianceSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  complianceSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };

  complianceSheet.addRows([
    {
      building_name: 'Example Court',
      asset_code: 'FRA',
      status: 'compliant',
      last_inspection_date: '2024-01-15',
      next_inspection_due: '2025-01-15',
      contractor_name: 'ABC Fire Safety Ltd',
      contractor_email: 'info@abcfire.co.uk',
      contractor_phone: '020 1234 5678',
      certificate_reference: 'FRA-2024-001',
      cost: 850,
      notes: 'Annual review completed, no major issues'
    },
    {
      building_name: 'Example Court',
      asset_code: 'EICR',
      status: 'compliant',
      last_inspection_date: '2023-06-10',
      next_inspection_due: '2028-06-10',
      contractor_name: 'XYZ Electrical Services',
      contractor_email: 'contact@xyzelectrical.co.uk',
      contractor_phone: '020 9876 5432',
      certificate_reference: 'EICR-2023-042',
      cost: 1200,
      notes: '5-year certificate issued'
    },
    {
      building_name: 'Example Court',
      asset_code: 'GAS_SAFETY',
      status: 'compliant',
      last_inspection_date: '2024-03-20',
      next_inspection_due: '2025-03-20',
      contractor_name: 'Safe Gas Engineers Ltd',
      contractor_email: 'bookings@safegas.co.uk',
      contractor_phone: '020 5555 6666',
      certificate_reference: 'GAS-2024-156',
      cost: 450,
      notes: 'All communal boilers serviced'
    }
  ]);

  complianceSheet.getCell('A5').value = 'INSTRUCTIONS: Optional sheet. Fill in current compliance status if available.';
  complianceSheet.getCell('A5').font = { italic: true, color: { argb: 'FF666666' } };
  complianceSheet.getCell('A6').value = 'Asset Codes: FRA, EICR, GAS_SAFETY, FIRE_DOORS, FIRE_ALARM, LIFT_MAINTENANCE, etc.';
  complianceSheet.getCell('A6').font = { italic: true, color: { argb: 'FF666666' } };
  complianceSheet.getCell('A7').value = 'Status options: compliant, due_soon, overdue, pending, non_compliant';
  complianceSheet.getCell('A7').font = { italic: true, color: { argb: 'FF666666' } };

  // ============================================
  // SHEET 7: INSTRUCTIONS & REFERENCE
  // ============================================
  const instructionsSheet = workbook.addWorksheet('READ ME FIRST');
  instructionsSheet.getColumn(1).width = 120;

  const instructions = [
    { text: '🏢 BLOCIQ ONBOARDING DATA TEMPLATE', style: { bold: true, size: 18, color: { argb: 'FF4F46E5' } } },
    { text: '', style: {} },
    { text: '📋 OVERVIEW', style: { bold: true, size: 14 } },
    { text: 'This Excel template allows you to prepare all your property data for import into BlocIQ.', style: {} },
    { text: 'Complete the sheets in order, starting with Buildings, then Units, then Leaseholders, etc.', style: {} },
    { text: '', style: {} },
    { text: '✅ REQUIRED SHEETS (Must complete)', style: { bold: true, size: 12, color: { argb: 'FFD97706' } } },
    { text: '1. Buildings - Your property portfolio', style: {} },
    { text: '2. Units - Individual flats/properties within each building', style: {} },
    { text: '3. Leaseholders - Property owners linked to units', style: {} },
    { text: '4. Leases - Lease agreements for each unit', style: {} },
    { text: '5. Apportionments - Service charge and reserve fund splits', style: {} },
    { text: '', style: {} },
    { text: '📝 OPTIONAL SHEETS', style: { bold: true, size: 12, color: { argb: 'FF059669' } } },
    { text: '6. Compliance - Current compliance status (can be added later)', style: {} },
    { text: '', style: {} },
    { text: '⚠️ IMPORTANT NOTES', style: { bold: true, size: 12, color: { argb: 'FFDC2626' } } },
    { text: '• Fields marked with * are REQUIRED', style: { italic: true } },
    { text: '• Building Name must match exactly across all sheets', style: { italic: true } },
    { text: '• Unit Number must match exactly across all sheets', style: { italic: true } },
    { text: '• Dates should be in format: YYYY-MM-DD (e.g., 2024-01-31)', style: { italic: true } },
    { text: '• Yes/No fields: Use "Yes" or "No" (case-insensitive)', style: { italic: true } },
    { text: '• Percentages: Enter as decimal (e.g., 4.17 for 4.17%)', style: { italic: true } },
    { text: '• Currency: Enter numbers only, no £ symbol (e.g., 1500.50)', style: { italic: true } },
    { text: '', style: {} },
    { text: '🔄 IMPORT PROCESS', style: { bold: true, size: 12 } },
    { text: '1. Fill in all required sheets with your property data', style: {} },
    { text: '2. Delete the example rows (keep the headers)', style: {} },
    { text: '3. Save the file', style: {} },
    { text: '4. Run the import script: node scripts/import-onboarding-data.js your-file.xlsx', style: {} },
    { text: '5. Review the import summary', style: {} },
    { text: '', style: {} },
    { text: '💡 TIPS FOR SUCCESS', style: { bold: true, size: 12, color: { argb: 'FF4F46E5' } } },
    { text: '• Start with just one building to test the process', style: {} },
    { text: '• Ensure all service charge percentages add up to 100% per building', style: {} },
    { text: '• Double-check email addresses - they are used for leaseholder login', style: {} },
    { text: '• Keep building and unit names consistent across all sheets', style: {} },
    { text: '• Use the example data as a reference for formatting', style: {} },
    { text: '', style: {} },
    { text: '📚 REFERENCE DATA', style: { bold: true, size: 12 } },
    { text: '', style: {} },
    { text: 'Building Types: residential, commercial, mixed_use', style: { italic: true, color: { argb: 'FF666666' } } },
    { text: 'Unit Types: flat, maisonette, house, commercial, parking, storage', style: { italic: true, color: { argb: 'FF666666' } } },
    { text: 'Lease Types: residential, commercial, ground, head', style: { italic: true, color: { argb: 'FF666666' } } },
    { text: 'Apportionment Types: service_charge, reserve_fund, ground_rent, insurance', style: { italic: true, color: { argb: 'FF666666' } } },
    { text: 'Compliance Status: compliant, due_soon, overdue, pending, non_compliant', style: { italic: true, color: { argb: 'FF666666' } } },
    { text: 'Preferred Contact: email, phone, post', style: { italic: true, color: { argb: 'FF666666' } } },
    { text: '', style: {} },
    { text: '❓ NEED HELP?', style: { bold: true, size: 12 } },
    { text: 'Contact: support@blociq.co.uk', style: {} },
    { text: 'Documentation: docs/systems/ONBOARDING_SCHEMA.md', style: {} },
  ];

  instructions.forEach((instruction, index) => {
    const cell = instructionsSheet.getCell(`A${index + 1}`);
    cell.value = instruction.text;
    cell.font = instruction.style;
    cell.alignment = { wrapText: true, vertical: 'top' };
  });

  // Move instructions sheet to first position
  workbook.worksheets.unshift(workbook.worksheets.pop());

  // ============================================
  // SAVE FILE
  // ============================================
  const filename = 'BlocIQ_Onboarding_Template.xlsx';
  const filepath = path.join(__dirname, '..', filename);

  await workbook.xlsx.writeFile(filepath);

  console.log('✅ Excel template created successfully!');
  console.log(`📁 File location: ${filepath}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Open the Excel file');
  console.log('2. Read the "READ ME FIRST" sheet');
  console.log('3. Fill in your property data');
  console.log('4. Run: node scripts/import-onboarding-data.js BlocIQ_Onboarding_Template.xlsx');
}

// Check if exceljs is installed
try {
  require.resolve('exceljs');
  createOnboardingTemplate();
} catch (e) {
  console.error('❌ ExcelJS is not installed. Installing now...');
  console.log('Run: npm install exceljs');
  console.log('Then run this script again.');
  process.exit(1);
}