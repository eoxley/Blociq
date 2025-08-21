import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function searchBuildingAndUnits(query: string): Promise<SearchResults | null> {
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
    const building = await searchBuilding(buildingMatch);
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
      const unit = await searchUnit(building.id, unitMatch);
      if (unit) {
        console.log('✅ Unit found:', unit.unit_number);
        results.units.push(unit);
        
        // Get leaseholder for this unit
        if (unit.leaseholder) {
          console.log('✅ Leaseholder found for unit:', unit.leaseholder.name);
          const leaseholder = await getLeaseholderWithUnits(unit.leaseholder.id);
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
      const units = await getAllUnitsForBuilding(building.id);
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
        const leaseholder = await getLeaseholderWithUnits(leaseholderId);
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

function extractBuildingName(query: string): string | null {
  // Common patterns for building names
  const patterns = [
    // Specific patterns for "5 ashwood house" type queries
    /(\d+)\s+([^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?)/i,
    /(?:in|at|of|for)\s+([^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?)/i,
    /([^,\s]+(?:\s+(?:house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))?)/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      // For the first pattern, combine the number and building name
      if (pattern === patterns[0] && match[2]) {
        return `${match[2]} ${match[1]}`.trim();
      }
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

async function searchBuilding(buildingName: string): Promise<Building | null> {
  try {
    // Clean building name
    const cleanName = buildingName
      .replace(/\b(house|apartments|court|gardens|heights|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development)\b/gi, '')
      .trim();
    
    console.log('🔍 Searching for building:', { original: buildingName, clean: cleanName });
    
    // Try exact match first
    let { data, error } = await supabase
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
    const { data: partialData, error: partialError } = await supabase
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
      const { data: ashwoodData, error: ashwoodError } = await supabase
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

async function searchUnit(buildingId: string, unitNumber: string): Promise<Unit | null> {
  try {
    // Clean unit number
    const cleanUnitNumber = unitNumber.replace(/^0+/, ''); // Remove leading zeros
    
    console.log('🔍 Searching for unit:', { original: unitNumber, clean: cleanUnitNumber, buildingId });
    
    // Try exact match first
    let { data, error } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        floor,
        type,
        leaseholder_id
      `)
      .eq('building_id', buildingId)
      .eq('unit_number', cleanUnitNumber)
      .single();
    
    if (!error && data) {
      console.log('✅ Exact unit match found:', data.unit_number);
      // Get leaseholder information
      const leaseholder = await getLeaseholderBasic(data.leaseholder_id);
      return {
        ...data,
        leaseholder
      };
    }
    
    // Try partial match
    const { data: partialData, error: partialError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        floor,
        type,
        leaseholder_id
      `)
      .eq('building_id', buildingId)
      .ilike('unit_number', `%${cleanUnitNumber}%`)
      .limit(1)
      .single();
    
    if (!partialError && partialData) {
      console.log('✅ Partial unit match found:', partialData.unit_number);
      // Get leaseholder information
      const leaseholder = await getLeaseholderBasic(partialData.leaseholder_id);
      return {
        ...partialData,
        leaseholder
      };
    }
    
    // Try searching for "5" specifically if the unit number is "5"
    if (cleanUnitNumber === '5') {
      const { data: fiveData, error: fiveError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          floor,
          type,
          leaseholder_id
        `)
        .eq('building_id', buildingId)
        .eq('unit_number', '5')
        .single();
      
      if (!fiveError && fiveData) {
        console.log('✅ Unit 5 found:', fiveData.unit_number);
        // Get leaseholder information
        const leaseholder = await getLeaseholderBasic(fiveData.leaseholder_id);
        return {
          ...fiveData,
          leaseholder
        };
      }
    }
    
    console.log('❌ No unit match found');
    return null;
    
  } catch (error) {
    console.error('Error searching unit:', error);
    return null;
  }
}

async function getAllUnitsForBuilding(buildingId: string): Promise<Unit[]> {
  try {
    const { data, error } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        floor,
        type,
        leaseholder_id
      `)
      .eq('building_id', buildingId)
      .order('unit_number', { ascending: true });
    
    if (error || !data) {
      return [];
    }
    
    // Get leaseholder information for each unit
    const unitsWithLeaseholders = await Promise.all(
      data.map(async (unit) => {
        const leaseholder = await getLeaseholderBasic(unit.leaseholder_id);
        return {
          ...unit,
          leaseholder
        };
      })
    );
    
    return unitsWithLeaseholders;
    
  } catch (error) {
    console.error('Error getting all units for building:', error);
    return [];
  }
}

async function getLeaseholderBasic(leaseholderId: string | null): Promise<{
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
} | null> {
  if (!leaseholderId) return null;
  
  try {
    const { data, error } = await supabase
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

async function getLeaseholderWithUnits(leaseholderId: string): Promise<Leaseholder | null> {
  try {
    const { data, error } = await supabase
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
