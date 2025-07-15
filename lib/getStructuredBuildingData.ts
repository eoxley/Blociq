import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getStructuredBuildingData(buildingIdOrName: string) {
  const isId = buildingIdOrName.length === 36; // basic UUID check

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      units (
        id,
        name,
        leaseholder:leaseholder_id (
          full_name,
          email,
          phone
        )
      ),
      documents (
        title,
        category,
        uploaded_at
      ),
      correspondence (
        subject,
        sent_at,
        to_email
      )
    `)
    .eq(isId ? 'id' : 'name', buildingIdOrName)
    .single();

  if (error) {
    console.error('Failed to fetch structured building data:', error.message);
    return null;
  }

  return data;
} 