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
    
    // Extract building name and unit number from query
    const buildingMatch = extractBuildingName(normalizedQuery);
    const unitMatch = extractUnitNumber(normalizedQuery);
    
    if (!buildingMatch) {
      return null; // No building mentioned in query
    }
    
    // Search for building
    const building = await searchBuilding(buildingMatch);
    if (!building) {
      return null; // Building not found
    }
    
    const results: SearchResults = {
      building,
      units: [],
      leaseholders: []
    };
    
    // If unit number is mentioned, search for specific unit
    if (unitMatch) {
      const unit = await searchUnit(building.id, unitMatch);
      if (unit) {
        results.units.push(unit);
        
        // Get leaseholder for this unit
        if (unit.leaseholder) {
          const leaseholder = await getLeaseholderWithUnits(unit.leaseholder.id);
          if (leaseholder) {
            results.leaseholders.push(leaseholder);
          }
        }
      }
    } else {
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
    
    return results;
    
  } catch (error) {
    console.error('Error in searchBuildingAndUnits:', error);
    return null;
  }
}

function extractBuildingName(query: string): string | null {
  // Common patterns for building names
  const patterns = [
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
      return data;
    }
    
    // Try partial match
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
      return partialData;
    }
    
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
      // Get leaseholder information
      const leaseholder = await getLeaseholderBasic(partialData.leaseholder_id);
      return {
        ...partialData,
        leaseholder
      };
    }
    
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
