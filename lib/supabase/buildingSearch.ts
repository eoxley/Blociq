// This file is imported by API routes, so we'll create the client when needed
// The actual client will be passed from the calling API route

interface Building {
  id: string;
  name: string;
  address: string;
  unit_count: number;
  building_manager_name: string | null;
  building_manager_email: string | null;
}

interface Unit {
  id: string;
  unit_number: string;
  floor: number | null;
  type: string | null;
  leaseholder: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface Leaseholder {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  units: {
    id: string;
    unit_number: string;
    floor: number | null;
    type: string | null;
  }[];
}

interface SearchResults {
  building: Building | null;
  units: Unit[];
  leaseholders: Leaseholder[];
}

export async function searchBuildingAndUnits(query: string, supabaseClient: any): Promise<SearchResults | null> {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    console.log('🔍 Starting building search for query:', normalizedQuery);
    
    // Extract building name and unit number from query
    const buildingMatch = extractBuildingName(normalizedQuery);
    const unitMatch = extractUnitNumber(normalizedQuery);
    
    console.log('🔍 Extracted:', { buildingMatch, unitMatch });
    
    if (!buildingMatch) {
      console.log('❌ No building mentioned in query');
      return null; // No building mentioned in query
    }
    
    // Search for building
    const building = await searchBuilding(buildingMatch, supabaseClient);
    if (!building) {
      console.log('❌ Building not found:', buildingMatch);
      return null; // Building not found
    }
    
    console.log('✅ Building found:', building.name);
    
    const results: SearchResults = {
      building,
      units: [],
      leaseholders: []
    };
    
    // If unit number is mentioned, search for specific unit
    if (unitMatch) {
      console.log('🔍 Searching for specific unit:', unitMatch);
      const unit = await searchUnit(building.id, unitMatch, supabaseClient);
      if (unit) {
        console.log('✅ Unit found:', unit.unit_number);
        results.units.push(unit);
        
        // Get leaseholder for this unit
        if (unit.leaseholder) {
          console.log('✅ Leaseholder found for unit:', unit.leaseholder.name);
          const leaseholder = await getLeaseholderWithUnits(unit.leaseholder.id, supabaseClient);
          if (leaseholder) {
            results.leaseholders.push(leaseholder);
          }
        }
      } else {
        console.log('❌ Unit not found:', unitMatch);
      }
    } else {
      console.log('🔍 No specific unit mentioned, getting all units');
      // No specific unit mentioned, get all units for the building
      const units = await getAllUnitsForBuilding(building.id, supabaseClient);
      results.units = units;
      
      // Get unique leaseholders
      const leaseholderIds = new Set<string>();
      units.forEach(unit => {
        if (unit.leaseholder) {
          leaseholderIds.add(unit.leaseholder.id);
        }
      });
      
      // Fetch leaseholder details
      for (const leaseholderId of leaseholderIds) {
        const leaseholder = await getLeaseholderWithUnits(leaseholderId, supabaseClient);
        if (leaseholder) {
          results.leaseholders.push(leaseholder);
        }
      }
    }
    
    console.log('✅ Search results:', {
      building: results.building?.name,
      units: results.units.length,
      leaseholders: results.leaseholders.length
    });
    
    return results;
    
  } catch (error) {
    console.error('Error in searchBuildingAndUnits:', error);
    return null;
  }
}

// Add new function for direct leaseholder searches
export async function searchLeaseholderDirect(query: string, supabaseClient: any): Promise<SearchResults | null> {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    console.log('🔍 Starting direct leaseholder search for query:', normalizedQuery);
    
    // Extract building name and unit number from query
    const buildingMatch = extractBuildingName(normalizedQuery);
    const unitMatch = extractUnitNumber(normalizedQuery);
    
    if (!buildingMatch || !unitMatch) {
      console.log('❌ Need both building and unit for leaseholder search');
      return null;
    }
    
    // Search for building first
    const building = await searchBuilding(buildingMatch, supabaseClient);
    if (!building) {
      console.log('❌ Building not found:', buildingMatch);
      return null;
    }
    
    console.log('✅ Building found:', building.name);
    
    // Search for unit and leaseholder directly using the view
    const { data, error } = await supabaseClient
      .from('vw_units_leaseholders')
      .select(`
        unit_id,
        unit_number,
        building_id,
        leaseholder_id,
        leaseholder_name,
        leaseholder_email,
        leaseholder_phone
      `)
      .eq('building_id', building.id)
      .eq('unit_number', unitMatch)
      .single();
    
    if (error || !data) {
      console.log('❌ Unit not found:', unitMatch);
      return null;
    }
    
    console.log('✅ Unit and leaseholder found:', data.unit_number, data.leaseholder_name);
    
    const results: SearchResults = {
      building,
      units: [{
        id: data.unit_id,
        unit_number: data.unit_number,
        floor: null,
        type: null,
        leaseholder: data.leaseholder_id ? {
          id: data.leaseholder_id,
          name: data.leaseholder_name,
          email: data.leaseholder_email,
          phone: data.leaseholder_phone
        } : null
      }],
      leaseholders: data.leaseholder_id ? [{
        id: data.leaseholder_id,
        name: data.leaseholder_name,
        email: data.leaseholder_email,
        phone: data.leaseholder_phone,
        units: [{
          id: data.unit_id,
          unit_number: data.unit_number,
          floor: null,
          type: null
        }]
      }] : []
    };
    
    return results;
    
  } catch (error) {
    console.error('Error in searchLeaseholderDirect:', error);
    return null;
  }
}

function extractBuildingName(query: string): string | null {
  // Common patterns for building names
  const patterns = [
    // Specific patterns for "5 ashwood house" type queries - extract "ashwood house"
    /\d+\s+([^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?)/i,
    // Standard patterns
    /(?:in|at|of|for)\s+([^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?)/i,
    /([^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?)/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractUnitNumber(query: string): string | null {
  // Common patterns for unit numbers
  const patterns = [
    // Specific pattern for "5 ashwood house" - extract the 5
    /^(\d+)\s+[^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?/i,
    /(?:unit|flat|apartment|apart|no\.?|number)\s*(\d+[a-z]?)/i,
    /(\d+[a-z]?)\s*(?:ashwood|house|flat|apartment|unit)/i,
    /(\d+[a-z]?)/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

async function searchBuilding(buildingName: string, supabaseClient: any): Promise<Building | null> {
  try {
    // Clean building name
    const cleanName = buildingName
      .replace(/\b(house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development)\b/gi, '')
      .trim();
    
    console.log('🔍 Searching for building:', { original: buildingName, clean: cleanName });
    
    // Try exact match first
    let { data, error } = await supabaseClient
      .from('buildings')
      .select(`
        id,
        name,
        address,
        unit_count,
        building_manager_name,
        building_manager_email
      `)
      .eq('name', buildingName)
      .single();
    
    if (!error && data) {
      console.log('✅ Exact match found:', data.name);
      return data;
    }
    
    // Try partial match with the clean name
    const { data: partialData, error: partialError } = await supabaseClient
      .from('buildings')
      .select(`
        id,
        name,
        address,
        unit_count,
        building_manager_name,
        building_manager_email
      `)
      .ilike('name', `%${cleanName}%`)
      .limit(1)
      .single();
    
    if (!partialError && partialData) {
      console.log('✅ Partial match found:', partialData.name);
      return partialData;
    }
    
    // Try searching for "ashwood" specifically
    if (buildingName.toLowerCase().includes('ashwood')) {
      const { data: ashwoodData, error: ashwoodError } = await supabaseClient
        .from('buildings')
        .select(`
          id,
          name,
          address,
          unit_count,
          building_manager_name,
          building_manager_email
        `)
        .ilike('name', '%ashwood%')
        .limit(1)
        .single();
      
      if (!ashwoodError && ashwoodData) {
        console.log('✅ Ashwood match found:', ashwoodData.name);
        return ashwoodData;
      }
    }
    
    console.log('❌ No building match found');
    return null;
    
  } catch (error) {
    console.error('Error searching building:', error);
    return null;
  }
}

async function searchUnit(buildingId: string, unitNumber: string, supabaseClient: any): Promise<Unit | null> {
  try {
    // Clean unit number
    const cleanUnitNumber = unitNumber.replace(/^0+/, ''); // Remove leading zeros
    
    console.log('🔍 Searching for unit:', { original: unitNumber, clean: cleanUnitNumber, buildingId });
    
    // Try various unit number formats
    const searchVariants = [
      cleanUnitNumber,
      `Flat ${cleanUnitNumber}`,
      `Unit ${cleanUnitNumber}`,
      `Apartment ${cleanUnitNumber}`,
      `${cleanUnitNumber}`
    ];
    
    for (const variant of searchVariants) {
      console.log(`🔍 Trying unit variant: "${variant}"`);
      
      // Use the view instead of manual joins
      const { data, error } = await supabaseClient
        .from('vw_units_leaseholders')
        .select(`
          unit_id,
          unit_number,
          building_id,
          leaseholder_id,
          leaseholder_name,
          leaseholder_email,
          leaseholder_phone
        `)
        .eq('building_id', buildingId)
        .eq('unit_number', variant)
        .single();
      
      if (!error && data) {
        console.log('✅ Unit found via view:', data.unit_number);
        return {
          id: data.unit_id,
          unit_number: data.unit_number,
          floor: null, // Not in view
          type: null,   // Not in view
          leaseholder: data.leaseholder_id ? {
            id: data.leaseholder_id,
            name: data.leaseholder_name,
            email: data.leaseholder_email,
            phone: data.leaseholder_phone
          } : null
        };
      }
      
      // Try case-insensitive partial match
      const { data: partialData, error: partialError } = await supabaseClient
        .from('vw_units_leaseholders')
        .select(`
          unit_id,
          unit_number,
          building_id,
          leaseholder_id,
          leaseholder_name,
          leaseholder_email,
          leaseholder_phone
        `)
        .eq('building_id', buildingId)
        .ilike('unit_number', `%${variant}%`)
        .limit(1)
        .single();
      
      if (!partialError && partialData) {
        console.log('✅ Partial unit match found via view:', partialData.unit_number);
        return {
          id: partialData.unit_id,
          unit_number: partialData.unit_number,
          floor: null, // Not in view
          type: null,   // Not in view
          leaseholder: partialData.leaseholder_id ? {
            id: partialData.leaseholder_id,
            name: partialData.leaseholder_name,
            email: partialData.leaseholder_email,
            phone: partialData.leaseholder_phone
          } : null
        };
      }
    }
    
    console.log('❌ No unit match found for any variant');
    return null;
    
  } catch (error) {
    console.error('Error searching unit:', error);
    return null;
  }
}

async function getAllUnitsForBuilding(buildingId: string, supabaseClient: any): Promise<Unit[]> {
  try {
    // Use the view instead of manual joins
    const { data, error } = await supabaseClient
      .from('vw_units_leaseholders')
      .select(`
        unit_id,
        unit_number,
        building_id,
        leaseholder_id,
        leaseholder_name,
        leaseholder_email,
        leaseholder_phone
      `)
      .eq('building_id', buildingId)
      .order('unit_number', { ascending: true });
    
    if (error || !data) {
      return [];
    }
    
    // Transform view data to Unit format
    const unitsWithLeaseholders = data.map((item: any) => ({
      id: item.unit_id,
      unit_number: item.unit_number,
      floor: null, // Not in view
      type: null,   // Not in view
      leaseholder: item.leaseholder_id ? {
        id: item.leaseholder_id,
        name: item.leaseholder_name,
        email: item.leaseholder_email,
        phone: item.leaseholder_phone
      } : null
    }));
    
    return unitsWithLeaseholders;
    
  } catch (error) {
    console.error('Error getting all units for building:', error);
    return [];
  }
}

async function getLeaseholderBasic(leaseholderId: string | null, supabaseClient: any): Promise<{
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
} | null> {
  if (!leaseholderId) return null;
  
  try {
    const { data, error } = await supabaseClient
      .from('leaseholders')
      .select('id, name, email, phone')
      .eq('id', leaseholderId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error getting leaseholder basic info:', error);
    return null;
  }
}

async function getLeaseholderWithUnits(leaseholderId: string, supabaseClient: any): Promise<Leaseholder | null> {
  try {
    const { data, error } = await supabaseClient
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        phone,
        units (
          id,
          unit_number,
          floor,
          type
        )
      `)
      .eq('id', leaseholderId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error getting leaseholder with units:', error);
    return null;
  }
}
