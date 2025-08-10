import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PlaceholderMap {
  [key: string]: string;
}

export interface TemplateMatch {
  id: number;
  name: string;
  type: string;
  subject: string | null;
  content: string;
  score: number;
}

/**
 * Fetch building, unit, and leaseholder context to create a placeholder map
 */
export async function buildPlaceholderMap({
  buildingId,
  unitId,
  leaseholderId,
  extraFields = {}
}: {
  buildingId?: string;
  unitId?: string;
  leaseholderId?: string;
  extraFields?: Record<string, string>;
}): Promise<PlaceholderMap> {
  const placeholders: PlaceholderMap = { ...extraFields };

  // Fetch building data
  if (buildingId) {
    try {
      const { data: building } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single();

      if (building) {
        placeholders.building_name = building.name || '';
        placeholders.building_address = building.address || '';
        placeholders.manager_name = building.building_manager_name || '';
        placeholders.manager_email = building.building_manager_email || '';
        placeholders.manager_phone = building.building_manager_phone || '';
        placeholders.emergency_contact_name = building.emergency_contact_name || '';
        placeholders.emergency_contact_phone = building.emergency_contact_phone || '';
        placeholders.fire_panel_location = building.fire_panel_location || '';
        placeholders.council_borough = building.council_borough || '';
        placeholders.entry_code = building.entry_code || '';
        placeholders.access_notes = building.access_notes || '';
        placeholders.parking_info = building.parking_info || '';
        placeholders.waste_collection_day = building.waste_collection_day || '';
        placeholders.recycling_info = building.recycling_info || '';
      }
    } catch (error) {
      console.warn('Could not fetch building data:', error);
    }
  }

  // Fetch unit data
  if (unitId) {
    try {
      const { data: unit } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single();

      if (unit) {
        placeholders.unit_number = unit.unit_number || '';
        placeholders.floor = unit.floor || '';
        placeholders.unit_type = unit.type || '';
      }
    } catch (error) {
      console.warn('Could not fetch unit data:', error);
    }
  }

  // Fetch leaseholder data
  if (leaseholderId) {
    try {
      const { data: leaseholder } = await supabase
        .from('leaseholders')
        .select('*')
        .eq('id', leaseholderId)
        .single();

      if (leaseholder) {
        placeholders.leaseholder_name = leaseholder.full_name || '';
        placeholders.leaseholder_email = leaseholder.email || '';
        placeholders.leaseholder_phone = leaseholder.phone || '';
        placeholders.leaseholder_address = leaseholder.address || '';
      }
    } catch (error) {
      console.warn('Could not fetch leaseholder data:', error);
    }
  }

  // Add current date
  placeholders.current_date = new Date().toLocaleDateString('en-GB');
  placeholders.current_year = new Date().getFullYear().toString();

  return placeholders;
}

/**
 * Find the best template match using both keyword and embedding similarity
 */
export async function findBestTemplate({
  type,
  templateHint,
  buildingId
}: {
  type: string;
  templateHint?: string;
  buildingId?: string;
}): Promise<TemplateMatch | null> {
  try {
    // First, get all templates of the specified type
    const { data: templates } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('type', type);

    if (!templates || templates.length === 0) {
      return null;
    }

    // If we have a template hint, use semantic search
    if (templateHint) {
      const searchQuery = `${type} ${templateHint}`;
      
      // Create embedding for the search query
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: searchQuery,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // For now, we'll use a simple keyword matching approach
      // In a full implementation, you'd store embeddings for templates and do vector search
      const scoredTemplates = templates.map(template => {
        const searchableText = `${template.name} ${template.subject || ''} ${template.content}`.toLowerCase();
        const hintLower = templateHint.toLowerCase();
        
        // Simple keyword scoring
        let score = 0;
        const words = hintLower.split(/\s+/);
        
        words.forEach(word => {
          if (searchableText.includes(word)) {
            score += 1;
          }
        });

        // Bonus for exact name matches
        if (template.name.toLowerCase().includes(hintLower)) {
          score += 2;
        }

        return {
          ...template,
          score
        };
      });

      // Sort by score and return the best match
      scoredTemplates.sort((a, b) => b.score - a.score);
      return scoredTemplates[0].score > 0 ? scoredTemplates[0] : templates[0];
    }

    // If no hint, return the first template of the type
    return templates[0];
  } catch (error) {
    console.error('Error finding template:', error);
    return null;
  }
}

/**
 * Replace placeholders in template content
 */
export function replacePlaceholders(
  content: string,
  placeholders: PlaceholderMap
): { renderedContent: string; usedPlaceholders: string[]; missingPlaceholders: string[] } {
  const usedPlaceholders: string[] = [];
  const missingPlaceholders: string[] = [];
  
  // Find all placeholder patterns like {{placeholder_name}}
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let renderedContent = content;
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholderName = match[1].trim();
    const placeholderValue = placeholders[placeholderName];

    if (placeholderValue !== undefined) {
      renderedContent = renderedContent.replace(match[0], placeholderValue);
      usedPlaceholders.push(placeholderName);
    } else {
      missingPlaceholders.push(placeholderName);
    }
  }

  return {
    renderedContent,
    usedPlaceholders,
    missingPlaceholders
  };
}
