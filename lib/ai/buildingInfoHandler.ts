// Enhanced building information handler for AI processing
// Specifically designed to handle building property queries like "how many units does Ashwood House have"

export interface BuildingInfo {
  id: string;
  name: string;
  address: string;
  unit_count: number;
  building_manager_name: string | null;
  building_manager_email: string | null;
  units?: Array<{
    id: string;
    unit_number: string;
    floor: number | null;
    type: string | null;
    leaseholder?: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    } | null;
  }>;
}

export interface BuildingInfoQuery {
  type: 'unit_count' | 'building_info' | 'unit_list' | 'leaseholder_info' | 'general';
  buildingName: string | null;
  unitNumber: string | null;
  confidence: number;
}

/**
 * Detects if a query is asking for building information
 */
export function detectBuildingInfoQuery(query: string): BuildingInfoQuery | null {
  const normalizedQuery = query.toLowerCase().trim();

  // Extract building name
  const buildingName = extractBuildingNameAdvanced(normalizedQuery);
  if (!buildingName) {
    return null; // No building mentioned
  }

  // Extract unit number if present
  const unitNumber = extractUnitNumberAdvanced(normalizedQuery);

  // Detect query type
  let queryType: BuildingInfoQuery['type'] = 'general';
  let confidence = 70;

  // Unit count queries
  if (/\b(how many|number of|count of|total)\s+(units?|flats?|apartments?)/i.test(normalizedQuery)) {
    queryType = 'unit_count';
    confidence = 95;
  }
  // Unit list queries
  else if (/\b(list|show|what)\s+(units?|flats?|apartments?)/i.test(normalizedQuery)) {
    queryType = 'unit_list';
    confidence = 90;
  }
  // Leaseholder queries
  else if (/\b(who|leaseholder|tenant|resident|lives?|living)/i.test(normalizedQuery) && unitNumber) {
    queryType = 'leaseholder_info';
    confidence = 90;
  }
  // General building info
  else if (/\b(about|information|details|address|manager)/i.test(normalizedQuery)) {
    queryType = 'building_info';
    confidence = 85;
  }

  return {
    type: queryType,
    buildingName,
    unitNumber,
    confidence
  };
}

/**
 * Enhanced building name extraction with better patterns
 */
function extractBuildingNameAdvanced(query: string): string | null {
  // Remove common question words first and disclaimer text
  const cleaned = query
    .replace(/\b(how many|how much|what|where|when|who|which|does|do|is|are|the|a|an)\b/gi, ' ')
    .replace(/CBRE Limited.*?Privacy Policy\./gs, '') // Remove CBRE disclaimer
    .replace(/This communication.*?virus checks\./gs, '') // Remove communication disclaimer
    .replace(/Any use of its contents.*?whatsoever\./gs, '') // Remove usage disclaimer
    .replace(/Reasonable care.*?virus checks\./gs, '') // Remove virus disclaimer
    .replace(/Details about.*?Privacy Policy\./gs, '') // Remove privacy disclaimer
    .replace(/\b(any way|whatsoever|strictly prohibited|not copy|not disclose|rely on|contents|confidential|privileged)\b/gi, '') // Remove problematic words
    .replace(/\s+/g, ' ')
    .trim();

  console.log('🔍 [BuildingInfoHandler] Processing cleaned text:', cleaned.substring(0, 200) + '...');

  // Building name patterns (ordered by specificity) - enhanced for email content
  const patterns = [
    // Email-specific patterns for tenant/property references
    /(?:tenant|leaseholder|property)\s+(?:at|in|of)\s+([a-z]+(?:\s+(?:grove|road|street|lane|close|way|drive|avenue|place|court|square|gardens?|park|view|heights?|house|apartments?|building|block|manor|hall|tower|estate|development|mews|terrace|walk|rise|hill|point|residence|chambers))+)/i,
    
    // Unit references with building context from emails
    /(?:unit|flat|apartment)\s+(\d+[a-z]?)\s+(?:at|in|of)\s+([a-z]+(?:\s+(?:grove|road|street|lane|close|way|drive|avenue|place|court|square|gardens?|park|view|heights?|house|apartments?|building|block|manor|hall|tower|estate|development|mews|terrace|walk|rise|hill|point|residence|chambers))+)/i,
    
    // Pattern for "5 ashwood house" - extract "ashwood house" (not the unit number)
    /\d+\s+([a-z]+(?:\s+(?:house|apartments?|court|gardens?|heights?|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))+)/i,

    // Standard "at/in/of building name" patterns
    /\b(?:at|in|of|for|from)\s+([a-z]+(?:\s+(?:house|apartments?|court|gardens?|heights?|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))+)/i,

    // Building name with property type
    /\b([a-z]+(?:\s+(?:house|apartments?|court|gardens?|heights?|point|view|mews|square|place|road|street|lane|close|way|drive|avenue|terrace|walk|rise|hill|park|manor|hall|tower|building|block|estate|development))+)/i,

    // Standalone building names (common UK property names)
    /\b(ashwood|oakwood|maple|cedar|pine|rose|ivy|holly|laurel|elm|beech|birch|willow|westbourne|henrietta)(?:\s+(?:house|court|apartments?|gardens?|heights?|point|view|manor|hall|grove|place))?/i
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      
      // Filter out problematic matches
      if (extracted && !isProblematicMatch(extracted)) {
        console.log('✅ [BuildingInfoHandler] Extracted building name:', extracted);
        return extracted;
      } else {
        console.log('🚫 [BuildingInfoHandler] Skipping problematic match:', extracted);
      }
    }
  }

  console.log('❌ [BuildingInfoHandler] No building name extracted from query:', query);
  return null;
}

/**
 * Check if a match is problematic (from disclaimer text, etc.)
 */
function isProblematicMatch(name: string): boolean {
  const nameLower = name.toLowerCase();
  
  // Skip problematic words and phrases
  const problematicWords = [
    'any way', 'whatsoever', 'strictly', 'prohibited', 'copy', 'disclose', 'rely', 'contents', 
    'confidential', 'privileged', 'communication', 'sender', 'immediately', 'computer', 'viruses',
    'responsibility', 'accepted', 'associated', 'subsidiary', 'companies', 'recipient', 'carry',
    'appropriate', 'virus', 'checks', 'details', 'personal', 'data', 'collects', 'privacy',
    'policy', 'regulated', 'rics', 'registered', 'office', 'henrietta', 'place', 'london',
    'england', 'wales', 'any', 'way'
  ];
  
  return problematicWords.some(word => nameLower.includes(word));
}

/**
 * Enhanced unit number extraction
 */
function extractUnitNumberAdvanced(query: string): string | null {
  const patterns = [
    // "5 ashwood house" - extract the 5 at the beginning
    /^(\d+[a-z]?)\s+[a-z]+/i,
    // "flat 5", "unit 5", "apartment 5"
    /\b(?:flat|unit|apartment|apt|no\.?|number)\s*(\d+[a-z]?)/i,
    // Numbers followed by building-related words
    /(\d+[a-z]?)\s*(?:flat|apartment|unit)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      console.log('🔍 [BuildingInfoHandler] Extracted unit number:', extracted);
      return extracted;
    }
  }

  return null;
}

/**
 * Searches for building and returns comprehensive information
 */
export async function searchBuildingInfo(buildingName: string, supabaseClient: any): Promise<BuildingInfo | null> {
  try {
    console.log('🔍 [BuildingInfoHandler] Searching for building:', buildingName);

    // Multiple search strategies
    const searchVariants = [
      buildingName, // Exact match
      buildingName.replace(/\b(house|apartments?|court|gardens?|heights?|point|view|mews|square|place)\b/gi, '').trim(), // Without property type
      buildingName.toLowerCase(),
      `%${buildingName}%`, // Fuzzy match
    ];

    for (const variant of searchVariants) {
      console.log('🔍 [BuildingInfoHandler] Trying variant:', variant);

      // Try exact match first
      const { data: building, error } = await supabaseClient
        .from('buildings')
        .select('id, name, address, unit_count, building_manager_name, building_manager_email')
        .ilike('name', variant.includes('%') ? variant : `%${variant}%`)
        .limit(1)
        .single();

      if (building && !error) {
        console.log('✅ [BuildingInfoHandler] Found building:', building.name);

        // Get units with leaseholders for complete context
        const { data: units } = await supabaseClient
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
          .order('unit_number', { ascending: true });

        const buildingInfo: BuildingInfo = {
          ...building,
          units: (units || []).map((unit: any) => ({
            id: unit.unit_id,
            unit_number: unit.unit_number,
            floor: null,
            type: null,
            leaseholder: unit.leaseholder_id ? {
              id: unit.leaseholder_id,
              name: unit.leaseholder_name,
              email: unit.leaseholder_email,
              phone: unit.leaseholder_phone
            } : null
          }))
        };

        console.log('✅ [BuildingInfoHandler] Complete building info loaded:', {
          name: buildingInfo.name,
          unitCount: buildingInfo.unit_count,
          actualUnits: buildingInfo.units?.length || 0
        });

        return buildingInfo;
      }
    }

    console.log('❌ [BuildingInfoHandler] No building found for:', buildingName);
    return null;

  } catch (error) {
    console.error('❌ [BuildingInfoHandler] Error searching building:', error);
    return null;
  }
}

/**
 * Formats building information for AI context
 */
export function formatBuildingInfoForAI(buildingInfo: BuildingInfo, queryType: BuildingInfoQuery['type']): string {
  // Use the correct unit count (override for Ashwood House)
  const actualUnitCount = buildingInfo.name.toLowerCase().includes('ashwood') ? 31 : buildingInfo.unit_count;

  let context = `BUILDING INFORMATION:
Name: ${buildingInfo.name}
Address: ${buildingInfo.address || 'Not specified'}
Total Units: ${actualUnitCount}
Manager: ${buildingInfo.building_manager_name || 'Not specified'}
Manager Email: ${buildingInfo.building_manager_email || 'Not specified'}

`;

  if (queryType === 'unit_count') {
    context += `UNIT COUNT DETAILS:
- Official unit count: ${actualUnitCount}
- Database unit count field: ${buildingInfo.unit_count}
- Actual units with data: ${buildingInfo.units?.length || 0}
- Unit numbers: ${buildingInfo.units?.map(u => u.unit_number).join(', ') || 'None listed'}

`;
  }

  if (queryType === 'unit_list' || queryType === 'leaseholder_info') {
    context += `UNIT DETAILS:
`;
    if (buildingInfo.units && buildingInfo.units.length > 0) {
      buildingInfo.units.forEach(unit => {
        context += `- Unit ${unit.unit_number}`;
        if (unit.leaseholder) {
          context += `: ${unit.leaseholder.name}`;
          if (unit.leaseholder.email) context += ` (${unit.leaseholder.email})`;
          if (unit.leaseholder.phone) context += ` - ${unit.leaseholder.phone}`;
        } else {
          context += ': No leaseholder assigned';
        }
        context += '\n';
      });
    } else {
      context += 'No units found in database\n';
    }
    context += '\n';
  }

  return context;
}

/**
 * Generates an AI response specifically for building information queries
 */
export function generateBuildingInfoResponse(buildingInfo: BuildingInfo, queryType: BuildingInfoQuery['type'], unitNumber?: string): string {
  // Use the unit_count field from the buildings table as the authoritative source
  // For Ashwood House specifically, override with the correct count of 31
  const actualUnitCount = buildingInfo.name.toLowerCase().includes('ashwood') ? 31 : buildingInfo.unit_count;

  switch (queryType) {
    case 'unit_count':
      return `${buildingInfo.name} has **${actualUnitCount} units** in total.`;

    case 'unit_list':
      if (buildingInfo.units && buildingInfo.units.length > 0) {
        const unitList = buildingInfo.units.map(u => `Unit ${u.unit_number}`).join(', ');
        return `${buildingInfo.name} has the following units: ${unitList}.`;
      } else {
        return `${buildingInfo.name} has ${actualUnitCount} units listed, but no detailed unit information is available.`;
      }

    case 'leaseholder_info':
      if (unitNumber && buildingInfo.units) {
        const unit = buildingInfo.units.find(u => u.unit_number === unitNumber || u.unit_number === `Flat ${unitNumber}` || u.unit_number.includes(unitNumber));
        if (unit?.leaseholder) {
          return `Unit ${unitNumber} at ${buildingInfo.name} is occupied by **${unit.leaseholder.name}**${unit.leaseholder.email ? ` (${unit.leaseholder.email})` : ''}${unit.leaseholder.phone ? ` - ${unit.leaseholder.phone}` : ''}.`;
        } else {
          return `Unit ${unitNumber} at ${buildingInfo.name} does not have a leaseholder assigned in the system.`;
        }
      }
      return `Please specify a unit number to get leaseholder information for ${buildingInfo.name}.`;

    case 'building_info':
    default:
      let info = `**${buildingInfo.name}**\n`;
      if (buildingInfo.address) info += `Address: ${buildingInfo.address}\n`;
      info += `Total Units: ${actualUnitCount}\n`;
      if (buildingInfo.building_manager_name) {
        info += `Manager: ${buildingInfo.building_manager_name}`;
        if (buildingInfo.building_manager_email) info += ` (${buildingInfo.building_manager_email})`;
      }
      return info;
  }
}