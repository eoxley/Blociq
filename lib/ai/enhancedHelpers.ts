// Enhanced helper functions for Ask BlocIQ system
// Complete logic overhaul with proper response formatting

export function extractUnit(prompt: string): string | undefined {
  const unitPattern = /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)|(?:^|\s)([0-9]+[a-zA-Z]?)(?:\s+(?:at|in|of)|\s)/i;
  const match = prompt.match(unitPattern);
  return match ? (match[1] || match[2]) : undefined;
}

export function extractBuilding(prompt: string): string | undefined {
  const buildingPatterns = [
    /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge|building)\b/i,
    /at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/i,
    /building\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/i
  ];
  
  for (const pattern of buildingPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

export async function getLeaseholderInfo(supabase: any, unit: string, building: string): Promise<string> {
  try {
    console.log("Searching for:", { unit, building });
    
    const searches = [
      supabase
        .from('vw_units_leaseholders')
        .select('*')
        .or(`unit_number.eq.${unit},unit_number.eq.Flat ${unit}`)
        .ilike('building_name', `%${building}%`),
      
      supabase
        .from('vw_units_leaseholders')
        .select('*')
        .in('unit_number', [unit, `Flat ${unit}`, `Unit ${unit}`, `Apartment ${unit}`])
        .ilike('building_name', `%${building}%`)
    ];

    for (const search of searches) {
      const { data, error } = await search.limit(5);
      console.log("Database result:", { data, error });
      if (!error && data && data.length > 0) {
        const leaseholder = data[0];
        // Then return the actual data instead of generic message
        if (data && data.length > 0) {
          return `The leaseholder of ${unit} ${building} is: ${data[0].leaseholder_name}`;
        }
        let response = `The leaseholder of unit ${leaseholder.unit_number}, ${leaseholder.building_name} is: **${leaseholder.leaseholder_name}**`;
        
        if (leaseholder.leaseholder_email) {
          response += `\n📧 Email: ${leaseholder.leaseholder_email}`;
        }
        
        if (leaseholder.leaseholder_phone) {
          response += `\n📞 Phone: ${leaseholder.leaseholder_phone}`;
        }

        if (leaseholder.is_director) {
          response += `\n👔 Role: ${leaseholder.director_role || 'Director'}`;
        }

        return response;
      }
    }

    const { data: buildingMatches } = await supabase
      .from('vw_units_leaseholders')
      .select('unit_number, building_name')
      .ilike('building_name', `%${building}%`)
      .limit(10);

    if (buildingMatches && buildingMatches.length > 0) {
      const unitList = [...new Set(buildingMatches.map((s: any) => s.unit_number))];
      const buildingList = [...new Set(buildingMatches.map((s: any) => s.building_name))];
      
      return `I couldn't find unit ${unit} in ${building} in our records. This could mean:

• The unit number might be listed differently (available units: ${unitList.slice(0, 5).join(', ')})
• The building name might vary in our records (found: ${buildingList.slice(0, 3).join(', ')})
• This property isn't in our database yet

Would you like me to search for all units in buildings matching '${building}'?`;
    }
    
    return `I couldn't find unit ${unit} in ${building} in our records. This could mean:

• The unit number might be listed differently (e.g., 'Flat ${unit}')
• The building name might vary in our records  
• This property isn't in our database yet

Would you like me to search for all units in buildings matching '${building}'?`;

  } catch (error) {
    console.error('Database search error:', error);
    return `Database connection error while looking up leaseholder information for unit ${unit} at ${building}. Please try again in a moment.`;
  }
}

export async function getAccessCodes(supabase: any, building: string): Promise<string> {
  try {
    console.log(`🔐 Searching for access codes: ${building}`);
    
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        id, name, address,
        entry_code, gate_code, 
        access_notes, key_access_notes,
        building_manager_name, building_manager_phone
      `)
      .or(`name.ilike.%${building}%,address.ilike.%${building}%`)
      .limit(5);

    if (error) {
      console.error('Access codes query error:', error);
      return `Error retrieving access codes for ${building}. Please try again or contact support.`;
    }

    if (!data || data.length === 0) {
      return `No access codes found for ${building} in our records. You may need to:

• Add this building to the database first
• Check if the building name is spelled correctly  
• Update the property record with current access codes

Would you like me to search for similar building names or help you add this property?`;
    }

    const buildingData = data[0];
    let response = `🔐 **Access codes for ${buildingData.name}**\n📍 ${buildingData.address}\n`;
    
    let hasAccessInfo = false;
    
    if (buildingData.entry_code) {
      response += `\n🚪 **Main entrance:** ${buildingData.entry_code}`;
      hasAccessInfo = true;
    }
    
    if (buildingData.gate_code) {
      response += `\n🚧 **Gate:** ${buildingData.gate_code}`;
      hasAccessInfo = true;
    }
    
    if (buildingData.access_notes) {
      response += `\n📝 **Access notes:** ${buildingData.access_notes}`;
      hasAccessInfo = true;
    }
    
    if (buildingData.key_access_notes) {
      response += `\n🗝️ **Key access:** ${buildingData.key_access_notes}`;
      hasAccessInfo = true;
    }

    if (buildingData.building_manager_name || buildingData.building_manager_phone) {
      response += `\n\n👤 **Building management contact:**`;
      if (buildingData.building_manager_name) {
        response += `\n• ${buildingData.building_manager_name}`;
      }
      if (buildingData.building_manager_phone) {
        response += `\n• ${buildingData.building_manager_phone}`;
      }
    }
    
    if (!hasAccessInfo) {
      response += `\nNo access codes are currently stored for ${buildingData.name}.\n\nYou may need to:
• Add access codes to the building record
• Update the property information with current entry codes
• Contact building management for the latest codes`;
    }
    
    return response;

  } catch (error) {
    console.error('Access codes search error:', error);
    return `Error retrieving access codes for ${building}. Please try again or contact support.`;
  }
}

export async function getServiceChargeInfo(supabase: any, unit: string, building: string): Promise<string> {
  try {
    console.log(`💰 Searching for service charges: Unit ${unit} at ${building}`);
    
    const { data, error } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .or(`unit_number.eq.${unit},unit_number.eq.Flat ${unit}`)
      .ilike('building_name', `%${building}%`)
      .single();

    if (error || !data) {
      return `I couldn't find service charge information for unit ${unit} at ${building}. This might be because:

• The unit isn't in our database yet
• Service charges haven't been calculated for this property  
• The unit or building name needs to be updated

Would you like me to help you add this information or search for the building in our records?`;
    }

    return `I found unit ${data.unit_number} at ${data.building_name} in our records, but service charge information hasn't been added yet. 

Would you like me to help you add service charge details for this property?`;

  } catch (error) {
    console.error('Service charges search error:', error);
    return `Error retrieving service charge information for unit ${unit} at ${building}. Please try again.`;
  }
}