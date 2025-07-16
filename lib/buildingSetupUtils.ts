import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BuildingSetup {
  id?: number;
  building_id: number;
  structure_type: 'Freehold' | 'RMC' | 'Tripartite' | null;
  operational_notes: string | null;
  client_type: 'Freeholder Company' | 'Board of Directors' | null;
  client_name: string | null;
  client_contact: string | null;
  client_email: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get building setup information
 */
export async function getBuildingSetup(buildingId: number): Promise<BuildingSetup | null> {
  try {
    const { data, error } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .single();

    if (error) {
      console.warn('Error fetching building setup:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching building setup:', error);
    return null;
  }
}

/**
 * Get appropriate recipient for communications based on building setup
 */
export function getCommunicationRecipient(setup: BuildingSetup | null): {
  recipient: string;
  recipientType: string;
  email?: string;
} {
  if (!setup) {
    return {
      recipient: 'Building Management',
      recipientType: 'Generic'
    };
  }

  switch (setup.client_type) {
    case 'Board of Directors':
      return {
        recipient: setup.client_name || 'The Board of Directors',
        recipientType: 'Directors',
        email: setup.client_email || undefined
      };
    
    case 'Freeholder Company':
      return {
        recipient: setup.client_name || 'The Freeholder',
        recipientType: 'Freeholder',
        email: setup.client_email || undefined
      };
    
    default:
      return {
        recipient: 'Building Management',
        recipientType: 'Generic'
      };
  }
}

/**
 * Get communication template based on building structure
 */
export function getCommunicationTemplate(setup: BuildingSetup | null, type: 'reminder' | 'update' | 'emergency'): {
  subject: string;
  greeting: string;
  context: string;
} {
  const recipient = getCommunicationRecipient(setup);
  
  const templates = {
    reminder: {
      subject: `Reminder: Action Required - ${setup?.client_name || 'Building Management'}`,
      greeting: `Dear ${recipient.recipient}`,
      context: `This is a reminder regarding outstanding matters that require your attention.`
    },
    update: {
      subject: `Update: Building Management Report - ${setup?.client_name || 'Building Management'}`,
      greeting: `Dear ${recipient.recipient}`,
      context: `Please find below an update on recent building management activities and compliance status.`
    },
    emergency: {
      subject: `URGENT: Immediate Action Required - ${setup?.client_name || 'Building Management'}`,
      greeting: `Dear ${recipient.recipient}`,
      context: `This is an urgent communication requiring immediate attention.`
    }
  };

  return templates[type];
}

/**
 * Get operational notes for quick reference
 */
export function getOperationalNotes(setup: BuildingSetup | null): string[] {
  if (!setup?.operational_notes) {
    return [];
  }

  return setup.operational_notes
    .split('\n')
    .map(note => note.trim())
    .filter(note => note.length > 0);
}

/**
 * Check if building setup is complete
 */
export function isSetupComplete(setup: BuildingSetup | null): boolean {
  if (!setup) return false;
  
  return !!(
    setup.structure_type &&
    setup.client_type &&
    (setup.client_name || setup.client_contact || setup.client_email)
  );
}

/**
 * Get setup completion percentage
 */
export function getSetupCompletion(setup: BuildingSetup | null): number {
  if (!setup) return 0;
  
  const fields = [
    setup.structure_type,
    setup.client_type,
    setup.client_name,
    setup.client_contact,
    setup.client_email,
    setup.operational_notes
  ];
  
  const completedFields = fields.filter(field => field && field.trim().length > 0).length;
  return Math.round((completedFields / fields.length) * 100);
} 