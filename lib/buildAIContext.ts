import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function buildAIContext(buildingId: string): Promise<string> {
  try {
    // Fetch building data
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        *,
        units (
          id,
          unit_number,
          floor,
          type,
          status,
          rent_amount,
          service_charge,
          tenant_name,
          tenant_email,
          tenant_phone,
          lease_start_date,
          lease_end_date
        ),
        events (
          id,
          title,
          description,
          event_date,
          event_type
        ),
        documents (
          id,
          title,
          description,
          file_url,
          document_type,
          created_at
        )
      `)
      .eq('id', buildingId)
      .single();

    if (buildingError || !building) {
      console.error('Error fetching building data:', buildingError);
      return '';
    }

    // Build structured context
    let context = `BUILDING: ${building.name}\n`;
    context += `ADDRESS: ${building.address || 'Not specified'}\n`;
    context += `UNITS: ${building.unit_count || 0}\n`;
    context += `CREATED: ${building.created_at ? new Date(building.created_at).toLocaleDateString() : 'Unknown'}\n\n`;

    // Add units information
    if (building.units && building.units.length > 0) {
      context += 'UNITS:\n';
      building.units.forEach((unit: any) => {
        context += `- Unit ${unit.unit_number} (Floor ${unit.floor}): ${unit.type}\n`;
        context += `  Status: ${unit.status}\n`;
        context += `  Rent: £${unit.rent_amount || 'Not set'}\n`;
        context += `  Service Charge: £${unit.service_charge || 'Not set'}\n`;
        if (unit.tenant_name) {
          context += `  Tenant: ${unit.tenant_name} (${unit.tenant_email || 'No email'})\n`;
          context += `  Phone: ${unit.tenant_phone || 'No phone'}\n`;
          context += `  Lease: ${unit.lease_start_date ? new Date(unit.lease_start_date).toLocaleDateString() : 'No start date'} to ${unit.lease_end_date ? new Date(unit.lease_end_date).toLocaleDateString() : 'No end date'}\n`;
        }
        context += '\n';
      });
    }

    // Add events information
    if (building.events && building.events.length > 0) {
      context += 'EVENTS:\n';
      building.events.forEach((event: any) => {
        context += `- ${event.title} (${event.event_type})\n`;
        context += `  Date: ${event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}\n`;
        context += `  Description: ${event.description || 'No description'}\n\n`;
      });
    }

    // Add documents information
    if (building.documents && building.documents.length > 0) {
      context += 'DOCUMENTS:\n';
      building.documents.forEach((doc: any) => {
        context += `- ${doc.title} (${doc.document_type})\n`;
        context += `  Created: ${doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown'}\n`;
        context += `  Description: ${doc.description || 'No description'}\n\n`;
      });
    }

    return context;

  } catch (error) {
    console.error('Error building AI context:', error);
    return '';
  }
} 