import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/database.types";

export async function getSessionWithProfile() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { session: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, agency_id")
    .eq("id", session.user.id)
    .single();

  return { session, profile, supabase };
}
