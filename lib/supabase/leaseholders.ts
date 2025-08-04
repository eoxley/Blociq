import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getLeaseholderData(leaseholderId: string) {
  try {
    const { data, error } = await supabase
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        phone,
        units (
          id,
          unit_number,
          floor,
          type,
          buildings (
            id,
            name,
            address
          )
        )
      `)
      .eq('id', leaseholderId)
      .single();

    if (error) {
      console.error('Error fetching leaseholder data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLeaseholderData:', error);
    return null;
  }
} 