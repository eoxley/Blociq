import { SupabaseClient } from '@supabase/supabase-js';

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
  
  // Special case: "what buildings" or "buildings list" queries
  if (queryLower.includes('what buildings') || 
      queryLower.includes('list buildings') || 
      queryLower.includes('show buildings') ||
      queryLower.includes('all buildings')) {
    console.log("🏢 BUILDINGS LIST QUERY DETECTED");
    
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

  // Define all possible searches based on query content
  const searches = [
    // Leaseholder data - highest priority
    {
      table: 'vw_units_leaseholders',
      condition: queryLower.includes('leaseholder') || 
                queryLower.includes('tenant') || 
                queryLower.includes('who') ||
                queryLower.includes('contact') ||
                queryLower.includes('email') ||
                queryLower.includes('phone') ||
                /unit\s*\d+/.test(queryLower),
      columns: 'unit_number, unit_label, leaseholder_name, leaseholder_email, leaseholder_phone, building_name, building_id, is_director, director_role',
      limit: 50
    },
    
    // Building data
    {
      table: 'buildings', 
      condition: queryLower.includes('building') || 
                queryLower.includes('house') || 
                queryLower.includes('property') ||
                queryLower.includes('ashwood') ||
                queryLower.includes('oak') ||
                queryLower.includes('address'),
      columns: 'id, name, address, postcode, unit_count, building_manager_name, building_manager_email, building_manager_phone, emergency_contact_name, emergency_contact_phone, access_notes, key_access_notes, entry_code, parking_info',
      limit: 20
    },
    
    // Unit data
    {
      table: 'units',
      condition: queryLower.includes('unit') || 
                queryLower.includes('flat') || 
                /\d+/.test(queryLower) ||
                queryLower.includes('apartment'),
      columns: 'id, unit_number, unit_label, building_id, floor, unit_type, square_footage, bedrooms, bathrooms',
      limit: 50
    },
    
    // Access/security data from compliance assets
    {
      table: 'compliance_assets',
      condition: queryLower.includes('access') || 
                queryLower.includes('code') || 
                queryLower.includes('security') ||
                queryLower.includes('entry') ||
                queryLower.includes('door') ||
                queryLower.includes('gate'),
      columns: 'id, asset_name, asset_value, description, category, building_id',
      limit: 30
    },
    
    // Communications log
    {
      table: 'communications_log',
      condition: queryLower.includes('email') || 
                queryLower.includes('letter') || 
                queryLower.includes('communication') ||
                queryLower.includes('correspondence') ||
                queryLower.includes('notice'),
      columns: 'id, communication_type, subject, recipient_name, recipient_email, sent_date, building_id, unit_id',
      limit: 20
    },
    
    // Major works projects
    {
      table: 'major_works_projects',
      condition: queryLower.includes('works') || 
                queryLower.includes('section 20') || 
                queryLower.includes('project') ||
                queryLower.includes('maintenance') ||
                queryLower.includes('repair'),
      columns: 'id, project_name, description, status, estimated_cost, start_date, completion_date, building_id',
      limit: 15
    },
    
    // Service charges
    {
      table: 'service_charges',
      condition: queryLower.includes('service charge') ||
                queryLower.includes('maintenance charge') ||
                queryLower.includes('ground rent') ||
                queryLower.includes('charge'),
      columns: 'id, charge_type, amount, frequency, due_date, unit_id, building_id, description',
      limit: 30
    },

    // Directors (company directors/board members)
    {
      table: 'leaseholders',
      condition: queryLower.includes('director') ||
                queryLower.includes('board') ||
                queryLower.includes('management company'),
      columns: 'id, name, email, phone_number, unit_id, is_director, director_role, director_since',
      limit: 20
    }
  ];
  
  // Execute all relevant searches in parallel for better performance
  const searchPromises = searches
    .filter(search => search.condition)
    .map(async (search) => {
      try {
        console.log(`🔍 Searching ${search.table}...`);
        
        let query = supabase
          .from(search.table)
          .select(search.columns)
          .limit(search.limit);

        const { data, error } = await query;
        
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
    tablesSearched: searches.filter(s => s.condition).length,
    tablesWithResults: Object.keys(searchResults).length,
    totalRecords: Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0)
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
  
  // Priority 1: Leaseholder information
  if (results.vw_units_leaseholders && results.vw_units_leaseholders.length > 0) {
    const leaseholders = results.vw_units_leaseholders;
    hasData = true;
    
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

  // Priority 2: Building information
  if (results.buildings && results.buildings.length > 0) {
    const buildings = results.buildings;
    hasData = true;
    
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

/**
 * Determine if a query requires database search based on property-related keywords
 */
export const isPropertyQuery = (query: string): boolean => {
  const queryLower = query.toLowerCase();
  
  const propertyKeywords = [
    'leaseholder', 'tenant', 'unit', 'flat', 'building', 'house',
    'access', 'code', 'security', 'email', 'phone', 'contact',
    'works', 'compliance', 'maintenance', 'service charge',
    'director', 'ground rent', 'property', 'address',
    'ashwood', 'oak court', 'communication', 'notice'
  ];
  
  return propertyKeywords.some(keyword => queryLower.includes(keyword));
};

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