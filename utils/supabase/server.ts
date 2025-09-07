// Re-export from centralized location
export { createServerClient, createApiClient, getServiceClient as getServiceRoleClient } from '@/lib/supabase/server'

// Legacy compatibility
export async function createClient(cookieStore?: any) {
  const { createApiClient } = await import('@/lib/supabase/server')
  return createApiClient()
}
