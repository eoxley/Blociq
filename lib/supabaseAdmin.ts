import { createClient } from "@supabase/supabase-js";

let adminClientInstance: any = null;

export function getSupabaseAdmin() {
  if (!adminClientInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables for admin client");
    }

    adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });
  }
  
  return adminClientInstance;
}

// Legacy export for backwards compatibility - lazy initialized
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    return getSupabaseAdmin()[prop];
  }
});
