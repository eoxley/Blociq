import { SupabaseClient } from '@supabase/supabase-js';
import { getActiveSearchRules, getSpecialSearch, getFallbackConfig, type SearchRule } from './searchConfig';

export interface DatabaseSearchResults {
  [tableName: string]: any[];
}

/**
 * Universal database search function that searches all relevant tables
 * based on query content. Forces database-first approach.
 */
export const searchAllRelevantTables = async (
  supabase: SupabaseClient,
  query: string
): Promise<DatabaseSearchResults> => {
  console.log("🔍 SEARCHING ALL TABLES for:", query);
  
  const searchResults: DatabaseSearchResults = {};
  const queryLower = query.toLowerCase();
  
  // Check for special search configurations
  const specialSearch = getSpecialSearch(query);
  if (specialSearch) {
    console.log(`🎯 SPECIAL SEARCH DETECTED: ${specialSearch.name}`);
    
    switch (specialSearch.searchLogic) {
      case 'buildings_list':
        try {
          const { data: buildings, error } = await supabase
            .from('buildings')
            .select('id, name, address, postcode, unit_count, building_manager_name, building_manager_email, emergency_contact_name, emergency_contact_phone')
            .order('name');
          
          if (error) {
            console.error('Buildings list query error:', error);
            return {};
          }
          
          if (buildings && buildings.length > 0) {
            return { buildings };
          }
        } catch (error) {
          console.error('Exception in buildings list query:', error);
        }
        return {};
    }
  }

  // Get search rules based on query content
  const searches = getActiveSearchRules(query);

  console.log("🔍 Active search rules for query:", queryLower);
  searches.forEach((search, index) => {
    console.log(`  ${index + 1}. ${search.table}: ${search.description || 'No description'} ✅`);
  });

  // Execute all relevant searches in parallel for better performance
  const searchPromises = searches
    .map(async (search) => {
      try {
        console.log(`🔍 Searching ${search.table}...`);
        
        let query = supabase
          .from(search.table)
          .select(search.columns)
          .limit(search.limit);

        // Special handling for leaseholder queries to search across buildings
        if (search.table === 'vw_units_leaseholders' && (queryLower.includes('ashwood') || queryLower.includes('5') || queryLower.includes('flat') || /\b(flat|unit)\b/.test(queryLower))) {
          console.log('🔍 Special leaseholder search for Ashwood House and unit queries');
          
          // Try to find the building first
          const { data: buildings } = await supabase
            .from('buildings')
            .select('id, name')
            .or('name.ilike.%ashwood%,name.ilike.%Ashwood%')
            .limit(1);
          
          if (buildings && buildings.length > 0) {
            const buildingId = buildings[0].id;
            console.log('🏢 Found building:', buildings[0].name, 'ID:', buildingId);
            
            // Search for units in this building - handle both "5" and "Flat 5" formats
            const { data: units } = await supabase
              .from('units')
              .select('id, unit_number, unit_label, building_id')
              .eq('building_id', buildingId)
              .or('unit_number.eq.5,unit_number.ilike.%5%,unit_number.ilike.%flat%5%,unit_number.ilike.%Flat%5%,unit_number.ilike.%5%')
              .limit(10);
            
            if (units && units.length > 0) {
              console.log('🏠 Found units:', units);
              
              // Search for leaseholders in these units
              const { data: leaseholders } = await supabase
                .from('leaseholders')
                .select('id, name, email, phone_number, unit_id, is_director, director_role')
                .in('unit_id', units.map(u => u.id))
                .limit(20);
              
              if (leaseholders && leaseholders.length > 0) {
                console.log('👥 Found leaseholders:', leaseholders);
                
                // Return combined data
                return { 
                  table: 'vw_units_leaseholders', 
                  data: leaseholders.map(lh => {
                    const unit = units.find(u => u.id === lh.unit_id);
                    const building = buildings[0];
                    
                    return {
                      unit_number: unit?.unit_number || 'Unknown',
                      unit_label: unit?.unit_label || 'Unknown',
                      leaseholder_name: lh.name,
                      leaseholder_email: lh.email,
                      leaseholder_phone: lh.phone_number,
                      building_name: building.name,
                      building_id: buildingId,
                      is_director: lh.is_director,
                      director_role: lh.director_role
                    };
                  }),
                  error: null 
                };
              } else {
                console.log('ℹ️ No leaseholders found for these units');
                return { table: 'vw_units_leaseholders', data: [], error: null };
              }
            } else {
              console.log('ℹ️ No units found for this building');
              return { table: 'vw_units_leaseholders', data: [], error: null };
            }
          } else {
            console.log('ℹ️ No Ashwood building found');
            return { table: 'vw_units_leaseholders', data: [], error: null };
          }
        }

        // Special handling for access codes queries
        if (search.table === 'buildings' && (queryLower.includes('access') || queryLower.includes('code')) && queryLower.includes('ashwood')) {
          console.log('🔍 Special access codes search for Ashwood House');
          
          const { data: buildings } = await supabase
            .from('buildings')
            .select('id, name, address, access_notes, key_access_notes, entry_code, parking_info, building_manager_name, building_manager_email, emergency_contact_name, emergency_contact_phone')
            .or('name.ilike.%ashwood%,name.ilike.%Ashwood%')
            .limit(1);
          
          if (buildings && buildings.length > 0) {
            console.log('🏢 Found building for access codes:', buildings[0].name);
            return { table: 'buildings', data: buildings, error: null };
          }
        }

        const { data, error } = await query;
        
        // If the view doesn't exist, try fallback searches for leaseholder data
        if (search.table === 'vw_units_leaseholders' && error && (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('view'))) {
          console.log('🔄 View vw_units_leaseholders not found, trying fallback search...');
          console.log('❌ View error details:', error.message);
          
          try {
            // Try to search units and leaseholders separately
            console.log('🔍 Fallback: Searching units table...');
            const { data: units, error: unitsError } = await supabase
              .from('units')
              .select('id, unit_number, unit_label, building_id')
              .limit(50);
            
            if (unitsError) {
              console.error('❌ Units table search failed:', unitsError);
              return { table: 'vw_units_leaseholders', data: [], error: unitsError };
            }
            
            if (units && units.length > 0) {
              console.log('✅ Found', units.length, 'units, searching for leaseholders...');
              const unitIds = units.map(u => u.id);
              
              const { data: leaseholders, error: leaseholdersError } = await supabase
                .from('leaseholders')
                .select('id, name, email, phone_number, unit_id, is_director, director_role')
                .in('unit_id', unitIds)
                .limit(50);
              
              if (leaseholdersError) {
                console.error('❌ Leaseholders table search failed:', leaseholdersError);
                return { table: 'vw_units_leaseholders', data: [], error: leaseholdersError };
              }
              
              if (leaseholders && leaseholders.length > 0) {
                console.log('✅ Found', leaseholders.length, 'leaseholders, getting building names...');
                
                // Get building names for the units
                const buildingIds = [...new Set(units.map(u => u.building_id))];
                const { data: buildings, error: buildingsError } = await supabase
                  .from('buildings')
                  .select('id, name')
                  .in('id', buildingIds);
                
                if (buildingsError) {
                  console.error('❌ Buildings table search failed:', buildingsError);
                  return { table: 'vw_units_leaseholders', data: [], error: buildingsError };
                }
                
                // Combine the data
                const combinedData = leaseholders.map(lh => {
                  const unit = units.find(u => u.id === lh.unit_id);
                  const building = buildings?.find(b => b.id === unit?.building_id);
                  
                  return {
                    unit_number: unit?.unit_number || 'Unknown',
                    unit_label: unit?.unit_label || 'Unknown',
                    leaseholder_name: lh.name,
                    leaseholder_email: lh.email,
                    leaseholder_phone: lh.phone_number,
                    building_name: building?.name || 'Unknown',
                    building_id: unit?.building_id || 'Unknown',
                    is_director: lh.is_director,
                    director_role: lh.director_role
                  };
                });
                
                console.log('✅ Fallback search successful, found', combinedData.length, 'leaseholders');
                return { table: 'vw_units_leaseholders', data: combinedData, error: null };
              } else {
                console.log('ℹ️ No leaseholders found in fallback search');
                return { table: 'vw_units_leaseholders', data: [], error: null };
              }
            } else {
              console.log('ℹ️ No units found in fallback search');
              return { table: 'vw_units_leaseholders', data: [], error: null };
            }
          } catch (fallbackError) {
            console.error('❌ Fallback search failed:', fallbackError);
            return { table: 'vw_units_leaseholders', data: [], error: fallbackError };
          }
        }
        
        // If no error but no data, try a direct search on the view
        if (search.table === 'vw_units_leaseholders' && (!data || data.length === 0)) {
          console.log('🔍 No data found in view, trying direct search...');
          
          try {
            // Try to search the view directly with broader criteria
            const { data: directData, error: directError } = await supabase
              .from('vw_units_leaseholders')
              .select('*')
              .limit(50);
            
            if (directError) {
              console.error('❌ Direct view search failed:', directError);
            } else if (directData && directData.length > 0) {
              console.log('✅ Direct view search found', directData.length, 'records');
              return { table: 'vw_units_leaseholders', data: directData, error: null };
            }
          } catch (directSearchError) {
            console.error('❌ Direct search exception:', directSearchError);
          }
        }
        
        // Additional fallback: If still no data, try searching individual tables directly
        if (search.table === 'vw_units_leaseholders' && (!data || data.length === 0)) {
          console.log('🔍 Still no data, trying individual table search...');
          
          try {
            // Search units table for Ashwood House units
            const { data: unitsData, error: unitsError } = await supabase
              .from('units')
              .select('id, unit_number, building_id')
              .ilike('unit_number', '%5%')
              .limit(10);
            
            if (!unitsError && unitsData && unitsData.length > 0) {
              console.log('🏠 Found units with "5":', unitsData);
              
              // Get building info for these units
              const buildingIds = [...new Set(unitsData.map(u => u.building_id))];
              const { data: buildingsData, error: buildingsError } = await supabase
                .from('buildings')
                .select('id, name, address')
                .in('id', buildingIds)
                .ilike('name', '%ashwood%');
              
              if (!buildingsError && buildingsData && buildingsData.length > 0) {
                console.log('🏢 Found Ashwood buildings:', buildingsData);
                
                // Get leaseholders for these units
                const unitIds = unitsData.map(u => u.id);
                const { data: leaseholdersData, error: leaseholdersError } = await supabase
                  .from('leaseholders')
                  .select('*')
                  .in('unit_id', unitIds);
                
                if (!leaseholdersError && leaseholdersData && leaseholdersData.length > 0) {
                  console.log('👥 Found leaseholders:', leaseholdersData);
                  
                  // Combine the data manually
                  const combinedData = leaseholdersData.map(lh => {
                    const unit = unitsData.find(u => u.id === lh.unit_id);
                    const building = buildingsData.find(b => b.id === unit?.building_id);
                    
                    return {
                      unit_number: unit?.unit_number || 'Unknown',
                      leaseholder_name: lh.name,
                      leaseholder_email: lh.email,
                      leaseholder_phone: lh.phone_number,
                      building_name: building?.name || 'Unknown',
                      building_id: unit?.building_id || 'Unknown'
                    };
                  });
                  
                  console.log('✅ Individual table search successful, found', combinedData.length, 'records');
                  return { table: 'vw_units_leaseholders', data: combinedData, error: null };
                }
              }
            }
          } catch (individualSearchError) {
            console.error('❌ Individual table search failed:', individualSearchError);
          }
        }
        
        console.log(`📊 ${search.table} results:`, { 
          count: data?.length || 0, 
          error: error?.message || null 
        });
        
        if (error) {
          console.error(`❌ Error searching ${search.table}:`, error);
          return { table: search.table, data: null, error };
        }

        if (data && data.length > 0) {
          return { table: search.table, data, error: null };
        }

        return { table: search.table, data: [], error: null };
        
      } catch (err) {
        console.error(`❌ Exception searching ${search.table}:`, err);
        return { table: search.table, data: null, error: err };
      }
    });

  // Wait for all searches to complete
  const results = await Promise.all(searchPromises);
  
  // Compile results
  for (const result of results) {
    if (result.data && result.data.length > 0) {
      searchResults[result.table] = result.data;
    }
  }
  
  console.log("📊 DATABASE SEARCH COMPLETE:", {
    tablesSearched: searches.length,
    tablesWithResults: Object.keys(searchResults).length,
    totalRecords: Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0),
    resultTables: Object.keys(searchResults)
  });
  
  return searchResults;
};

/**
 * Format database search results into a human-readable response
 */
export const formatDatabaseResponse = (
  query: string, 
  results: DatabaseSearchResults
): string => {
  console.log("🎯 FORMATTING DATABASE RESPONSE for query:", query);
  
  let response = "";
  let hasData = false;
  const queryLower = query.toLowerCase();
  
  // Check if this is a specific leaseholder query
  const isLeaseholderQuery = queryLower.includes('leaseholder') || queryLower.includes('who') || queryLower.includes('tenant');
  const isAccessQuery = queryLower.includes('access') || queryLower.includes('code');
  const isAshwoodQuery = queryLower.includes('ashwood');
  
  // Priority 1: Leaseholder information
  if (results.vw_units_leaseholders && results.vw_units_leaseholders.length > 0) {
    const leaseholders = results.vw_units_leaseholders;
    hasData = true;
    
    if (isLeaseholderQuery && isAshwoodQuery) {
      // Specific leaseholder query for Ashwood House
      response += `# 🏠 **Leaseholder Information - Ashwood House**\n\n`;
      
      // Find unit 5 specifically if mentioned - handle both "5" and "Flat 5" formats
      const unit5Leaseholder = leaseholders.find(lh => 
        lh.unit_number?.toString() === '5' || 
        lh.unit_number?.toString() === 'Flat 5' ||
        lh.unit_number?.toString().includes('5') ||
        lh.unit_number?.toString().toLowerCase().includes('flat 5')
      );
      
      if (unit5Leaseholder) {
        response += `## **${unit5Leaseholder.unit_number}**\n`;
        response += `**👤 Leaseholder:** ${unit5Leaseholder.leaseholder_name || 'Name not provided'}\n`;
        if (unit5Leaseholder.leaseholder_email) {
          response += `**📧 Email:** ${unit5Leaseholder.leaseholder_email}\n`;
        }
        if (unit5Leaseholder.leaseholder_phone) {
          response += `**📞 Phone:** ${unit5Leaseholder.leaseholder_phone}\n`;
        }
        if (unit5Leaseholder.is_director) {
          response += `**👨‍💼 Role:** Company Director${unit5Leaseholder.director_role ? ` (${unit5Leaseholder.director_role})` : ''}\n`;
        }
        response += '\n';
      } else {
        response += `## **Available Units**\n`;
        leaseholders.forEach((lh: any) => {
          response += `**Unit ${lh.unit_number || lh.unit_label}:** ${lh.leaseholder_name || 'Not provided'}\n`;
          if (lh.leaseholder_email) response += `  📧 ${lh.leaseholder_email}\n`;
          if (lh.leaseholder_phone) response += `  📞 ${lh.leaseholder_phone}\n`;
          response += '\n';
        });
      }
    } else {
      // General leaseholder information
      response += `## 👥 Leaseholder Information (${leaseholders.length} found)\n\n`;
      
      leaseholders.forEach((lh: any) => {
        response += `**Unit ${lh.unit_number || lh.unit_label}** (${lh.building_name || 'Building not specified'})\n`;
        response += `• **Name:** ${lh.leaseholder_name || 'Not provided'}\n`;
        response += `• **Email:** ${lh.leaseholder_email || 'Not provided'}\n`;
        response += `• **Phone:** ${lh.leaseholder_phone || 'Not provided'}\n`;
        
        if (lh.is_director) {
          response += `• **Role:** Company Director${lh.director_role ? ` (${lh.director_role})` : ''}\n`;
        }
        response += '\n';
      });
    }
  }

  // Priority 2: Building information (especially for access codes)
  if (results.buildings && results.buildings.length > 0) {
    const buildings = results.buildings;
    hasData = true;
    
    if (isAccessQuery && isAshwoodQuery) {
      // Specific access codes query for Ashwood House
      response += `# 🔐 **Access Codes - Ashwood House**\n\n`;
      
      buildings.forEach((building: any) => {
        response += `## **${building.name}**\n`;
        response += `**📍 Address:** ${building.address}${building.postcode ? ', ' + building.postcode : ''}\n\n`;
        
        // Access codes and information
        if (building.entry_code) {
          response += `**🚪 Entry Code:** ${building.entry_code}\n`;
        }
        if (building.access_notes) {
          response += `**📋 Access Notes:** ${building.access_notes}\n`;
        }
        if (building.key_access_notes) {
          response += `**🔑 Key Access:** ${building.key_access_notes}\n`;
        }
        if (building.parking_info) {
          response += `**🚗 Parking:** ${building.parking_info}\n`;
        }
        
        response += '\n';
        
        // Management contacts for access queries
        if (building.building_manager_name || building.emergency_contact_name) {
          response += `## **👤 Contacts for Access Queries**\n`;
          
          if (building.building_manager_name) {
            response += `**Building Manager:** ${building.building_manager_name}`;
            if (building.building_manager_email || building.building_manager_phone) {
              response += ' (';
              if (building.building_manager_email) response += building.building_manager_email;
              if (building.building_manager_phone) {
                if (building.building_manager_email) response += ', ';
                response += building.building_manager_phone;
              }
              response += ')';
            }
            response += '\n';
          }
          
          if (building.emergency_contact_name) {
            response += `**Emergency Contact:** ${building.emergency_contact_name}`;
            if (building.emergency_contact_phone) {
              response += ` (${building.emergency_contact_phone})`;
            }
            response += '\n';
          }
        }
      });
    } else {
      // General building information
      response += `## 🏢 Building Information (${buildings.length} found)\n\n`;
      
      buildings.forEach((building: any) => {
        response += `**${building.name}**\n`;
        response += `• **Address:** ${building.address}${building.postcode ? ', ' + building.postcode : ''}\n`;
        response += `• **Total units:** ${building.unit_count || 'Not specified'}\n`;
        
        // Access codes and information
        if (building.entry_code) {
          response += `• **Entry code:** ${building.entry_code}\n`;
        }
        if (building.access_notes) {
          response += `• **Access notes:** ${building.access_notes}\n`;
        }
        if (building.key_access_notes) {
          response += `• **Key access:** ${building.key_access_notes}\n`;
        }
        if (building.parking_info) {
          response += `• **Parking:** ${building.parking_info}\n`;
        }
        
        // Management contacts
        if (building.building_manager_name) {
          response += `• **Manager:** ${building.building_manager_name}`;
          if (building.building_manager_email || building.building_manager_phone) {
            response += ' (';
            if (building.building_manager_email) response += building.building_manager_email;
            if (building.building_manager_phone) {
              if (building.building_manager_email) response += ', ';
              response += building.building_manager_phone;
            }
            response += ')';
          }
          response += '\n';
        }
        
        if (building.emergency_contact_name) {
          response += `• **Emergency contact:** ${building.emergency_contact_name}`;
          if (building.emergency_contact_phone) {
            response += ` (${building.emergency_contact_phone})`;
          }
          response += '\n';
        }
        
        response += '\n';
      });
    }
  }

  // Priority 3: Unit information
  if (results.units && results.units.length > 0) {
    const units = results.units;
    hasData = true;
    
    response += `## 🏠 Unit Information (${units.length} found)\n\n`;
    
    units.slice(0, 10).forEach((unit: any) => {
      response += `**Unit ${unit.unit_number || unit.unit_label}**\n`;
      if (unit.floor) response += `• **Floor:** ${unit.floor}\n`;
      if (unit.unit_type) response += `• **Type:** ${unit.unit_type}\n`;
      if (unit.bedrooms) response += `• **Bedrooms:** ${unit.bedrooms}\n`;
      if (unit.bathrooms) response += `• **Bathrooms:** ${unit.bathrooms}\n`;
      if (unit.square_footage) response += `• **Size:** ${unit.square_footage} sq ft\n`;
      response += '\n';
    });
    
    if (units.length > 10) {
      response += `*...and ${units.length - 10} more units*\n\n`;
    }
  }

  // Priority 4: Compliance/Access assets
  if (results.compliance_assets && results.compliance_assets.length > 0) {
    const assets = results.compliance_assets;
    hasData = true;
    
    response += `## 🔐 Access & Compliance Information (${assets.length} found)\n\n`;
    
    assets.forEach((asset: any) => {
      response += `**${asset.asset_name || 'Asset'}**\n`;
      if (asset.asset_value) response += `• **Value/Code:** ${asset.asset_value}\n`;
      if (asset.description) response += `• **Description:** ${asset.description}\n`;
      if (asset.category) response += `• **Category:** ${asset.category}\n`;
      response += '\n';
    });
  }

  // Priority 5: Communications
  if (results.communications_log && results.communications_log.length > 0) {
    const communications = results.communications_log;
    hasData = true;
    
    response += `## 📧 Recent Communications (${communications.length} found)\n\n`;
    
    communications.slice(0, 5).forEach((comm: any) => {
      response += `**${comm.communication_type || 'Communication'}**\n`;
      if (comm.subject) response += `• **Subject:** ${comm.subject}\n`;
      if (comm.recipient_name) response += `• **To:** ${comm.recipient_name}`;
      if (comm.recipient_email) response += ` (${comm.recipient_email})`;
      response += '\n';
      if (comm.sent_date) response += `• **Date:** ${new Date(comm.sent_date).toLocaleDateString()}\n`;
      response += '\n';
    });
  }

  // Priority 6: Major works
  if (results.major_works_projects && results.major_works_projects.length > 0) {
    const projects = results.major_works_projects;
    hasData = true;
    
    response += `## 🔨 Major Works Projects (${projects.length} found)\n\n`;
    
    projects.forEach((project: any) => {
      response += `**${project.project_name || 'Project'}**\n`;
      if (project.description) response += `• **Description:** ${project.description}\n`;
      if (project.status) response += `• **Status:** ${project.status}\n`;
      if (project.estimated_cost) response += `• **Estimated cost:** ${project.estimated_cost}\n`;
      if (project.start_date) response += `• **Start date:** ${new Date(project.start_date).toLocaleDateString()}\n`;
      response += '\n';
    });
  }

  // Priority 7: Service charges
  if (results.service_charges && results.service_charges.length > 0) {
    const charges = results.service_charges;
    hasData = true;
    
    response += `## 💰 Service Charges (${charges.length} found)\n\n`;
    
    charges.forEach((charge: any) => {
      response += `**${charge.charge_type || 'Service Charge'}**\n`;
      if (charge.amount) response += `• **Amount:** ${charge.amount}\n`;
      if (charge.frequency) response += `• **Frequency:** ${charge.frequency}\n`;
      if (charge.due_date) response += `• **Due date:** ${new Date(charge.due_date).toLocaleDateString()}\n`;
      if (charge.description) response += `• **Description:** ${charge.description}\n`;
      response += '\n';
    });
  }

  // Priority 8: Directors
  if (results.leaseholders && results.leaseholders.length > 0) {
    const directors = results.leaseholders.filter((lh: any) => lh.is_director);
    if (directors.length > 0) {
      hasData = true;
      
      response += `## 👨‍💼 Company Directors (${directors.length} found)\n\n`;
      
      directors.forEach((director: any) => {
        response += `**${director.name || 'Director'}**\n`;
        if (director.director_role) response += `• **Role:** ${director.role}\n`;
        if (director.director_since) response += `• **Since:** ${new Date(director.director_since).toLocaleDateString()}\n`;
        if (director.email) response += `• **Email:** ${director.email}\n`;
        if (director.phone_number) response += `• **Phone:** ${director.phone_number}\n`;
        response += '\n';
      });
    }
  }

  if (!hasData) {
    response = "Database queried but no matching data found for your request.";
  }

  console.log("✅ DATABASE RESPONSE FORMATTED:", response.length, "characters");
  
  return response;
};

// Re-export from unified parser for backward compatibility
export { isPropertyQuery } from './queryParser';

/**
 * Process any query with database-first approach
 */
export const processQueryDatabaseFirst = async (
  supabase: SupabaseClient,
  query: string
): Promise<string> => {
  console.log("🎯 PROCESSING QUERY WITH DATABASE-FIRST APPROACH:", query);
  
  // ALWAYS search database first for property-related queries
  if (isPropertyQuery(query)) {
    console.log("🎯 PROPERTY QUERY DETECTED - searching database");
    
    const databaseResults = await searchAllRelevantTables(supabase, query);
    
    // If we found data, format and return it
    if (Object.keys(databaseResults).length > 0) {
      console.log("✅ DATABASE DATA FOUND - returning formatted response");
      return formatDatabaseResponse(query, databaseResults);
    }
    
    console.log("ℹ️ No database data found for property query");
    return `No specific property data found in the database for "${query}". 

This could mean:
• The property, unit, or person doesn't exist in the system
• The search terms need to be more specific
• The data hasn't been entered yet

Try asking:
• "Who is the leaseholder of unit 5 at Ashwood House?"
• "What buildings do we manage?"
• "What are the access codes for [building name]?"`;
  }
  
  // For non-property queries, we'll still return a message indicating 
  // this should be handled by AI
  console.log("ℹ️ Non-property query - should be handled by AI");
  return ""; // Empty string indicates AI should handle this
};