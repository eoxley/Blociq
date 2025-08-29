/**
 * Unified search configuration for database queries
 * Defines search rules, conditions, and table configurations
 */

export interface SearchRule {
  table: string;
  condition: boolean;
  columns: string;
  limit: number;
  description?: string;
}

/**
 * Generate search rules based on query content
 */
export function getSearchRules(queryLower: string): SearchRule[] {
  return [
    // Leaseholder data - highest priority
    {
      table: 'vw_units_leaseholders',
      condition: queryLower.includes('leaseholder') || 
                queryLower.includes('tenant') || 
                queryLower.includes('who') ||
                queryLower.includes('contact') ||
                queryLower.includes('email') ||
                queryLower.includes('phone') ||
                /\d+/.test(queryLower) || // Any number (including unit numbers)
                queryLower.includes('flat') || // Include "flat" keyword
                queryLower.includes('unit') || // Include "unit" keyword
                /\b(flat|unit)\b/.test(queryLower) || // Enhanced pattern matching
                (/\d+/.test(queryLower) && /\b(ashwood|house|building)\b/.test(queryLower)), // Number + building context
      columns: 'unit_number, unit_label, leaseholder_name, leaseholder_email, leaseholder_phone, building_name, building_id, is_director, director_role',
      limit: 50,
      description: 'Leaseholder and occupancy data'
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
      limit: 20,
      description: 'Building information and management contacts'
    },
    
    // Unit data
    {
      table: 'units',
      condition: queryLower.includes('unit') || 
                queryLower.includes('flat') || 
                /\d+/.test(queryLower) ||
                queryLower.includes('apartment'),
      columns: 'id, unit_number, unit_label, building_id, floor, unit_type, square_footage, bedrooms, bathrooms',
      limit: 50,
      description: 'Unit details and specifications'
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
      limit: 30,
      description: 'Access codes and security information'
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
      limit: 20,
      description: 'Communication history and correspondence'
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
      limit: 15,
      description: 'Major works projects and Section 20 consultations'
    },
    
    // Service charges
    {
      table: 'service_charges',
      condition: queryLower.includes('service charge') ||
                queryLower.includes('maintenance charge') ||
                queryLower.includes('ground rent') ||
                queryLower.includes('charge'),
      columns: 'id, charge_type, amount, frequency, due_date, unit_id, building_id, description',
      limit: 30,
      description: 'Service charges and billing information'
    },

    // Directors (company directors/board members)
    {
      table: 'leaseholders',
      condition: queryLower.includes('director') ||
                queryLower.includes('board') ||
                queryLower.includes('management company'),
      columns: 'id, name, email, phone_number, unit_id, is_director, director_role, director_since',
      limit: 20,
      description: 'Company directors and board members'
    }
  ];
}

/**
 * Special search configurations for specific queries
 */
export interface SpecialSearchConfig {
  name: string;
  condition: (queryLower: string) => boolean;
  searchLogic: 'buildings_list' | 'ashwood_leaseholder' | 'access_codes';
  description: string;
}

export const SPECIAL_SEARCHES: SpecialSearchConfig[] = [
  {
    name: 'buildings_list',
    condition: (queryLower: string) => (
      queryLower.includes('what buildings') || 
      queryLower.includes('list buildings') || 
      queryLower.includes('show buildings') ||
      queryLower.includes('all buildings')
    ),
    searchLogic: 'buildings_list',
    description: 'List all buildings under management'
  },
  {
    name: 'ashwood_leaseholder',
    condition: (queryLower: string) => (
      queryLower.includes('ashwood') && 
      (queryLower.includes('5') || queryLower.includes('flat') || /\b(flat|unit)\b/.test(queryLower))
    ),
    searchLogic: 'ashwood_leaseholder', 
    description: 'Specific leaseholder lookup for Ashwood House'
  },
  {
    name: 'access_codes_ashwood',
    condition: (queryLower: string) => (
      (queryLower.includes('access') || queryLower.includes('code')) && 
      queryLower.includes('ashwood')
    ),
    searchLogic: 'access_codes',
    description: 'Access codes for Ashwood House'
  }
];

/**
 * Fallback table configurations for when views don't exist
 */
export interface FallbackConfig {
  originalTable: string;
  fallbackTables: {
    table: string;
    columns: string;
    joinKey?: string;
  }[];
  combineLogic?: 'join_units_leaseholders' | 'join_buildings';
}

export const FALLBACK_CONFIGS: FallbackConfig[] = [
  {
    originalTable: 'vw_units_leaseholders',
    fallbackTables: [
      {
        table: 'units',
        columns: 'id, unit_number, unit_label, building_id',
        joinKey: 'id'
      },
      {
        table: 'leaseholders', 
        columns: 'id, name, email, phone_number, unit_id, is_director, director_role',
        joinKey: 'unit_id'
      },
      {
        table: 'buildings',
        columns: 'id, name',
        joinKey: 'id'
      }
    ],
    combineLogic: 'join_units_leaseholders'
  }
];

/**
 * Table priority for result ordering
 */
export const TABLE_PRIORITY: Record<string, number> = {
  'vw_units_leaseholders': 10,
  'buildings': 9,
  'units': 8,
  'leaseholders': 7,
  'compliance_assets': 6,
  'communications_log': 5,
  'major_works_projects': 4,
  'service_charges': 3
};

/**
 * Get search rules filtered by those that match the query
 */
export function getActiveSearchRules(query: string): SearchRule[] {
  const queryLower = query.toLowerCase();
  const allRules = getSearchRules(queryLower);
  
  return allRules.filter(rule => rule.condition);
}

/**
 * Get special search configuration if query matches
 */
export function getSpecialSearch(query: string): SpecialSearchConfig | null {
  const queryLower = query.toLowerCase();
  
  for (const specialSearch of SPECIAL_SEARCHES) {
    if (specialSearch.condition(queryLower)) {
      return specialSearch;
    }
  }
  
  return null;
}

/**
 * Get fallback configuration for a table
 */
export function getFallbackConfig(tableName: string): FallbackConfig | null {
  return FALLBACK_CONFIGS.find(config => config.originalTable === tableName) || null;
}