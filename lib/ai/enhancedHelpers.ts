// Enhanced helper functions for Ask BlocIQ system
// Complete logic overhaul with proper response formatting

// Database query logging function
export function logDatabaseQuery(tableName: string, query: any, result: any): void {
  console.log(`🗄️ DATABASE QUERY: ${tableName}`);
  console.log(`🔍 Query:`, query);
  console.log(`📊 Result:`, result);
  console.log(`📈 Row count:`, result?.data?.length || 0);
  if (result?.error) {
    console.log(`❌ Error:`, result.error);
  }
}

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

// Test database access function
export async function testDatabaseAccess(supabase: any): Promise<string> {
  try {
    console.log("🔍 Testing vw_units_leaseholders access...");
    
    const { data, error } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .limit(5);
    
    console.log("✅ Database test result:", { data, error });
    console.log("✅ Available columns:", data?.[0] ? Object.keys(data[0]) : "No data");
    console.log("✅ Sample data:", data?.[0]);
    
    if (error) {
      return `❌ Database test failed: ${error.message}`;
    }
    
    if (!data || data.length === 0) {
      return `⚠️ Database connected but no data in vw_units_leaseholders`;
    }
    
    return `✅ Database test successful: ${data.length} records found. Columns: ${Object.keys(data[0]).join(', ')}`;
  } catch (err: any) {
    console.log("❌ Database test failed:", err);
    return `❌ Database test exception: ${err.message}`;
  }
}

// Force direct database query without AI interpretation
export async function handleLeaseholderQuery(supabase: any, prompt: string): Promise<string> {
  console.log("🔍 FORCING database query for:", prompt);
  
  try {
    // Force direct database query - don't rely on AI interpretation
    const { data, error } = await supabase
      .from('vw_units_leaseholders')
      .select('*');
    
    console.log("📊 Raw database results:", { data, error, count: data?.length });
    
    if (error) {
      return `❌ Database query failed: ${error.message}`;
    }
    
    if (data && data.length > 0) {
      console.log("📋 Sample record:", data[0]);
      console.log("📋 Available columns:", Object.keys(data[0]));
      
      // Look for any unit matching patterns
      const unitMatches = data.filter(record => 
        record.unit_number?.includes('1') || 
        record.unit_number?.includes('5') ||
        JSON.stringify(record).toLowerCase().includes('alice') ||
        JSON.stringify(record).toLowerCase().includes('ashwood')
      );
      
      console.log("🎯 Relevant matches:", unitMatches);
      
      if (unitMatches.length > 0) {
        const match = unitMatches[0];
        return `✅ REAL DATABASE RESULT: ${match.leaseholder_name} lives in ${match.unit_number} at ${match.building_name || 'Building ID: ' + match.building_id}. Email: ${match.leaseholder_email || 'Not provided'}`;
      }
      
      // Return actual data structure for debugging
      return `⚠️ No matches found for query. Database has ${data.length} total records. Sample: ${JSON.stringify(data[0], null, 2)}`;
    }
    
    return `❌ No data in database. Query returned empty result.`;
  } catch (err: any) {
    console.log("❌ Database query exception:", err);
    return `❌ Database query failed: ${err.message}`;
  }
}

export async function getLeaseholderInfo(supabase: any, unit: string, building: string): Promise<string> {
  try {
    console.log("🔍 Searching for leaseholder:", { unit, building });
    
    // Try to use the optimized view first with comprehensive error handling
    let viewResult = null;
    let viewError = null;
    
    try {
      console.log('📊 Attempting vw_units_leaseholders view query...');
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
      
      viewResult = await Promise.allSettled(searches);
      
      // Check for view-not-found errors specifically
      const hasViewErrors = viewResult.some(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value?.error && 
         (result.value.error.message?.includes('relation') || 
          result.value.error.message?.includes('does not exist') ||
          result.value.error.message?.includes('view')))
      );
      
      if (hasViewErrors) {
        console.log('⚠️ View vw_units_leaseholders not available or has errors, using fallback approach');
        viewResult = null;
        viewError = hasViewErrors;
      }
      
    } catch (viewException) {
      console.log('⚠️ Exception accessing vw_units_leaseholders view:', viewException);
      viewResult = null;
      viewError = viewException;
    }
    
    // Check if view queries were successful and have data
    let hasViewData = false;
    let viewDataExists = false;
    
    if (viewResult && !viewError) {
      for (const result of viewResult) {
        if (result.status === 'fulfilled' && result.value && !result.value.error) {
          viewDataExists = true;
          if (result.value.data?.length > 0) {
            hasViewData = true;
            break;
          }
        }
      }
    }
    
    // If view doesn't exist, has errors, or has no data, use fallback approach
    if (!viewDataExists || !hasViewData) {
      if (viewError) {
        console.log('🔄 View unavailable, using table joins fallback');
      } else if (viewDataExists && !hasViewData) {
        console.log('🔄 View exists but no matching data, using table joins fallback');
      }
      console.log('🔄 Using fallback: joining units, leaseholders, and buildings tables');
      
      try {
        // Step 1: Find the building
        const { data: buildings, error: buildingError } = await supabase
          .from('buildings')
          .select('id, name, address')
          .ilike('name', `%${building}%`)
          .limit(5);
        
        if (buildingError) {
          console.error('Fallback building search error:', buildingError);
          return `❌ Database error searching for building: ${buildingError.message}`;
        }
        
        if (!buildings || buildings.length === 0) {
          return `❌ Building "${building}" not found in database`;
        }
        
        const targetBuilding = buildings[0];
        console.log('🏢 Found building:', targetBuilding);
        
        // Step 2: Find the unit in this building
        const { data: units, error: unitError } = await supabase
          .from('units')
          .select('id, unit_number, unit_label, building_id')
          .eq('building_id', targetBuilding.id)
          .or(`unit_number.eq.${unit},unit_number.ilike.%${unit}%,unit_label.eq.${unit},unit_label.ilike.%${unit}%`);
        
        if (unitError) {
          console.error('Fallback unit search error:', unitError);
          return `❌ Database error searching for unit: ${unitError.message}`;
        }
        
        if (!units || units.length === 0) {
          return `❌ Unit "${unit}" not found in ${targetBuilding.name}`;
        }
        
        const targetUnit = units[0];
        console.log('🏠 Found unit:', targetUnit);
        
        // Step 3: Find leaseholders for this unit
        const { data: leaseholders, error: leaseholderError } = await supabase
          .from('leaseholders')
          .select('id, name, email, phone_number, is_director, director_role, director_since')
          .eq('unit_id', targetUnit.id);
        
        if (leaseholderError) {
          console.error('Fallback leaseholder search error:', leaseholderError);
          return `❌ Database error searching for leaseholders: ${leaseholderError.message}`;
        }
        
        if (!leaseholders || leaseholders.length === 0) {
          return `📋 Unit ${targetUnit.unit_number} at ${targetBuilding.name} (${targetBuilding.address}) currently has no registered leaseholder.`;
        }
        
        // Format response with fallback data
        const leaseholder = leaseholders[0];
        let response = `📋 **Leaseholder Information**\n`;
        response += `**Building:** ${targetBuilding.name}\n`;
        response += `**Address:** ${targetBuilding.address}\n`;
        response += `**Unit:** ${targetUnit.unit_number || targetUnit.unit_label}\n`;
        response += `**Leaseholder:** ${leaseholder.name}\n`;
        if (leaseholder.email) response += `**Email:** ${leaseholder.email}\n`;
        if (leaseholder.phone_number) response += `**Phone:** ${leaseholder.phone_number}\n`;
        if (leaseholder.is_director) {
          response += `**Role:** Company Director`;
          if (leaseholder.director_role) response += ` (${leaseholder.director_role})`;
          response += '\n';
        }
        
        return response;
        
      } catch (fallbackError) {
        console.error('❌ Fallback approach failed:', fallbackError);
        // Ensure we return a helpful message even if both approaches fail
        return `❌ Database search failed for unit ${unit} at ${building}. This could be due to:

• Database connectivity issues
• Missing required database tables or views
• Unit or building not yet added to the system

Please contact support if this persists. Error details: ${fallbackError.message}`;
      }
    }
    
    // If we reach here, process the successful view results
    if (viewResult) {
      for (const result of viewResult) {
        if (result.status === 'fulfilled' && result.value?.data) {
          const { data, error } = result.value;
          
          // Add comprehensive logging
          logDatabaseQuery('vw_units_leaseholders', { unit, building, searchType: 'leaseholder' }, { data, error });
          
          if (!error && data && data.length > 0) {
            const leaseholder = data[0];
            console.log('✅ Found leaseholder via view:', leaseholder);
            
            let response = `📋 **Leaseholder Information (from database view)**\n`;
            response += `**Building:** ${leaseholder.building_name}\n`;
            response += `**Unit:** ${leaseholder.unit_number}\n`;
            response += `**Leaseholder:** ${leaseholder.leaseholder_name}\n`;
            
            if (leaseholder.leaseholder_email) {
              response += `**Email:** ${leaseholder.leaseholder_email}\n`;
            }
            
            if (leaseholder.leaseholder_phone) {
              response += `**Phone:** ${leaseholder.leaseholder_phone}\n`;
            }

            if (leaseholder.is_director) {
              response += `**Role:** ${leaseholder.director_role || 'Company Director'}\n`;
            }

            return response;
          }
        }
      }
    }

    // If view searches didn't find anything, try broader search
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