import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getStructuredBuildingData(buildingIdOrName: string) {
  // Check if it's a numeric ID or UUID
  const isNumericId = !isNaN(Number(buildingIdOrName)) && buildingIdOrName.length < 36;
  const isUuid = buildingIdOrName.length === 36;

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      unit_count,
      units (
        id,
        unit_number,
        type,
        floor,
        leaseholder_email
      ),
      compliance_docs (
        doc_type,
        created_at
      ),
      incoming_emails (
        subject,
        from_email,
        received_at
      )
    `)
    .eq(isNumericId ? 'id' : 'name', isNumericId ? Number(buildingIdOrName) : buildingIdOrName)
    .single();

  if (error) {
    console.error('Failed to fetch structured building data:', error.message);
    return null;
  }

  return data;
} 