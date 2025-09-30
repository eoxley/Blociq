const ExcelJS = require('exceljs');
const path = require('path');

async function createTemplate() {
  const workbook = new ExcelJS.Workbook();

  // ========================================
  // BUILDINGS SHEET - matches buildings table
  // ========================================
  const buildingsSheet = workbook.addWorksheet('Buildings');

  buildingsSheet.columns = [
    { header: 'name', key: 'name', width: 30 },
    { header: 'address', key: 'address', width: 40 },
    { header: 'unit_count', key: 'unit_count', width: 12 },
    { header: 'structure_type', key: 'structure_type', width: 20 },
    { header: 'client_type', key: 'client_type', width: 25 },
    { header: 'client_name', key: 'client_name', width: 40 },
    { header: 'client_contact', key: 'client_contact', width: 25 },
    { header: 'client_email', key: 'client_email', width: 30 },
    { header: 'operational_notes', key: 'operational_notes', width: 40 },
    { header: 'access_notes', key: 'access_notes', width: 30 },
    { header: 'sites_staff', key: 'sites_staff', width: 30 },
    { header: 'parking_info', key: 'parking_info', width: 30 },
    { header: 'council_borough', key: 'council_borough', width: 20 },
    { header: 'building_manager_name', key: 'building_manager_name', width: 25 },
    { header: 'building_manager_email', key: 'building_manager_email', width: 30 },
    { header: 'building_manager_phone', key: 'building_manager_phone', width: 20 },
    { header: 'emergency_contact_name', key: 'emergency_contact_name', width: 25 },
    { header: 'emergency_contact_phone', key: 'emergency_contact_phone', width: 20 },
    { header: 'building_age', key: 'building_age', width: 15 },
    { header: 'construction_type', key: 'construction_type', width: 20 },
    { header: 'total_floors', key: 'total_floors', width: 12 },
    { header: 'lift_available', key: 'lift_available', width: 15 },
    { header: 'heating_type', key: 'heating_type', width: 20 },
    { header: 'hot_water_type', key: 'hot_water_type', width: 20 },
    { header: 'waste_collection_day', key: 'waste_collection_day', width: 20 },
    { header: 'recycling_info', key: 'recycling_info', width: 30 },
    { header: 'building_insurance_provider', key: 'building_insurance_provider', width: 30 },
    { header: 'building_insurance_expiry', key: 'building_insurance_expiry', width: 25 },
    { header: 'fire_safety_status', key: 'fire_safety_status', width: 20 },
    { header: 'asbestos_status', key: 'asbestos_status', width: 20 },
    { header: 'energy_rating', key: 'energy_rating', width: 15 },
    { header: 'service_charge_frequency', key: 'service_charge_frequency', width: 25 },
    { header: 'ground_rent_amount', key: 'ground_rent_amount', width: 20 },
    { header: 'ground_rent_frequency', key: 'ground_rent_frequency', width: 25 },
    { header: 'notes', key: 'notes', width: 40 },
    { header: 'key_access_notes', key: 'key_access_notes', width: 30 },
    { header: 'entry_code', key: 'entry_code', width: 15 },
    { header: 'fire_panel_location', key: 'fire_panel_location', width: 25 },
  ];

  // Style header row
  const buildingsHeaderRow = buildingsSheet.getRow(1);
  buildingsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  buildingsHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4f46e5' }
  };
  buildingsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
  buildingsHeaderRow.height = 25;

  // Add example row
  buildingsSheet.addRow({
    name: 'Pimlico Place',
    address: '123 Main Street, London',
    unit_count: 24,
    structure_type: 'RMC',
    client_type: 'Board of Directors',
    client_name: 'Pimlico Place Management Company Limited',
    client_contact: 'Board Secretary',
    client_email: 'board@pimlicoplace.com',
    operational_notes: 'Regular board meetings quarterly',
    access_notes: 'Key code entry',
    council_borough: 'Westminster',
    building_manager_name: 'John Smith',
    building_manager_email: 'john@example.com',
    building_manager_phone: '020 1234 5678',
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '020 9876 5432',
    building_age: '1985',
    construction_type: 'Brick',
    total_floors: '5',
    lift_available: 'Yes',
    heating_type: 'Gas Central Heating',
    hot_water_type: 'Individual Boilers',
    waste_collection_day: 'Tuesday',
    fire_safety_status: 'Compliant',
    asbestos_status: 'None Found',
    energy_rating: 'C',
    service_charge_frequency: 'Quarterly',
    ground_rent_amount: 350,
    ground_rent_frequency: 'Annual',
    notes: 'Delete this example row before importing'
  });

  // Add notes about valid values
  buildingsSheet.getCell('D3').value = 'NOTE: structure_type must be: Freehold, RMC, Tripartite, RTM, or Leasehold';
  buildingsSheet.getCell('D3').font = { italic: true, color: { argb: 'FFFF6600' } };

  buildingsSheet.getCell('E3').value = 'NOTE: client_type must be: Freeholder Company, Board of Directors, or Management Company';
  buildingsSheet.getCell('E3').font = { italic: true, color: { argb: 'FFFF6600' } };

  // ========================================
  // UNITS SHEET - matches units table
  // ========================================
  const unitsSheet = workbook.addWorksheet('Units');

  unitsSheet.columns = [
    { header: 'building_name', key: 'building_name', width: 30 },
    { header: 'unit_number', key: 'unit_number', width: 15 },
    { header: 'type', key: 'type', width: 20 },
    { header: 'floor', key: 'floor', width: 10 },
  ];

  const unitsHeaderRow = unitsSheet.getRow(1);
  unitsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  unitsHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10b981' }
  };
  unitsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
  unitsHeaderRow.height = 25;

  unitsSheet.addRow({
    building_name: 'Pimlico Place',
    unit_number: 'Flat 1',
    type: 'Residential',
    floor: 'Ground'
  });

  unitsSheet.addRow({
    building_name: 'Pimlico Place',
    unit_number: 'Flat 2',
    type: 'Residential',
    floor: '1'
  });

  // ========================================
  // LEASEHOLDERS SHEET - matches leaseholders table
  // ========================================
  const leaseholdersSheet = workbook.addWorksheet('Leaseholders');

  leaseholdersSheet.columns = [
    { header: 'building_name', key: 'building_name', width: 30 },
    { header: 'unit_number', key: 'unit_number', width: 15 },
    { header: 'name', key: 'name', width: 30 },
    { header: 'email', key: 'email', width: 35 },
    { header: 'phone', key: 'phone', width: 20 },
  ];

  const leaseholdersHeaderRow = leaseholdersSheet.getRow(1);
  leaseholdersHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  leaseholdersHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFf59e0b' }
  };
  leaseholdersHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
  leaseholdersHeaderRow.height = 25;

  leaseholdersSheet.addRow({
    building_name: 'Pimlico Place',
    unit_number: 'Flat 1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '07700 900123'
  });

  leaseholdersSheet.addRow({
    building_name: 'Pimlico Place',
    unit_number: 'Flat 2',
    name: 'Bob Williams',
    email: 'bob@example.com',
    phone: '07700 900456'
  });

  // ========================================
  // LEASES SHEET - matches leases table
  // ========================================
  const leasesSheet = workbook.addWorksheet('Leases');

  leasesSheet.columns = [
    { header: 'building_name', key: 'building_name', width: 30 },
    { header: 'unit_number', key: 'unit_number', width: 15 },
    { header: 'doc_type', key: 'doc_type', width: 20 },
    { header: 'doc_url', key: 'doc_url', width: 50 },
    { header: 'start_date', key: 'start_date', width: 15 },
    { header: 'expiry_date', key: 'expiry_date', width: 15 },
    { header: 'is_headlease', key: 'is_headlease', width: 15 },
  ];

  const leasesHeaderRow = leasesSheet.getRow(1);
  leasesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  leasesHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFef4444' }
  };
  leasesHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
  leasesHeaderRow.height = 25;

  leasesSheet.addRow({
    building_name: 'Pimlico Place',
    unit_number: 'Flat 1',
    doc_type: 'Lease Agreement',
    doc_url: 'https://example.com/lease1.pdf',
    start_date: '2020-01-01',
    expiry_date: '2099-12-31',
    is_headlease: false
  });

  leasesSheet.getCell('G3').value = 'NOTE: is_headlease must be: true or false';
  leasesSheet.getCell('G3').font = { italic: true, color: { argb: 'FFFF0000' } };

  // ========================================
  // INSTRUCTIONS SHEET
  // ========================================
  const instructionsSheet = workbook.addWorksheet('Instructions');

  instructionsSheet.columns = [
    { header: 'Step', key: 'step', width: 10 },
    { header: 'Instructions', key: 'instructions', width: 100 },
  ];

  const instructionsHeaderRow = instructionsSheet.getRow(1);
  instructionsHeaderRow.font = { bold: true, size: 14 };
  instructionsHeaderRow.height = 30;

  instructionsSheet.addRow({
    step: '1',
    instructions: 'Fill in the Buildings sheet with your building information including structure type and client details. Use exact database column names as headers.'
  });

  instructionsSheet.addRow({
    step: '2',
    instructions: 'Fill in the Units sheet with unit information. Make sure building_name matches exactly from Buildings sheet.'
  });

  instructionsSheet.addRow({
    step: '3',
    instructions: 'Fill in the Leaseholders sheet. Make sure building_name and unit_number match exactly from previous sheets.'
  });

  instructionsSheet.addRow({
    step: '4',
    instructions: 'Fill in the Leases sheet (optional) with lease documents. Match building_name and unit_number exactly.'
  });

  instructionsSheet.addRow({
    step: '',
    instructions: ''
  });

  instructionsSheet.addRow({
    step: 'IMPORTANT',
    instructions: 'DELETE ALL EXAMPLE ROWS BEFORE IMPORTING! Only keep the header row with column names.'
  });

  instructionsSheet.getCell('B6').font = { bold: true, color: { argb: 'FFFF0000' }, size: 12 };

  instructionsSheet.addRow({
    step: '',
    instructions: ''
  });

  instructionsSheet.addRow({
    step: 'Upload',
    instructions: 'To upload: Open each sheet, save as CSV, then upload to Supabase Table Editor at https://supabase.com/dashboard/project/xqxaatvykmaaynqeoemy/editor'
  });

  instructionsSheet.addRow({
    step: '',
    instructions: 'Order matters: 1) Buildings first, 2) Units, 3) Leaseholders, 4) Leases'
  });

  // Save the workbook
  const fileName = 'BlocIQ_Onboarding_Template_Simple.xlsx';
  const filePath = path.join(__dirname, '..', 'public', fileName);

  await workbook.xlsx.writeFile(filePath);

  console.log(`✅ Template created successfully: ${fileName}`);
  console.log(`📁 Location: ${filePath}`);
  console.log('\nThis template matches your ACTUAL Supabase schema.');
  console.log('You can now:');
  console.log('1. Fill in your data');
  console.log('2. Save each sheet as CSV');
  console.log('3. Upload directly to Supabase Table Editor');
  console.log('\nNo scripts or migrations needed!');
}

createTemplate().catch(console.error);