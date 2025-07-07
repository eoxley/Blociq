import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveDraftToSupabase({
  userId,
  input,
  output,
  category,
  building,
}: {
  userId: string;
  input: string;
  output: string;
  category: string;
  building: string;
}) {
  const { data, error } = await supabase
    .from('drafts')
    .insert([
      {
        user_id: userId,
        input,
        output,
        category,
        building,
      },
    ]);

  if (error) throw error;
  return data;
}
