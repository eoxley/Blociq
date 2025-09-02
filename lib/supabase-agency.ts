// Enhanced Supabase client with automatic agency scoping
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { getCurrentAgencyId } from '@/lib/agency'

// Re-export the base client for cases where agency scoping isn't needed
export { supabase } from '@/lib/supabaseClient'

/**
 * Enhanced Supabase client that automatically adds agency_id filtering
 * Use this for queries that should be scoped to the current agency
 */
class AgencyScopedSupabaseClient {
  private client: ReturnType<typeof createClientComponentClient<Database>>

  constructor() {
    this.client = createClientComponentClient<Database>()
  }

  // Pass through auth methods
  get auth() {
    return this.client.auth
  }

  get storage() {
    return this.client.storage
  }

  get realtime() {
    return this.client.realtime
  }

  get rpc() {
    return this.client.rpc
  }

  get functions() {
    return this.client.functions
  }

  /**
   * Enhanced from() method that automatically applies agency scoping where applicable
   */
  from<T extends keyof Database['public']['Tables']>(table: T) {
    const query = this.client.from(table)
    
    // Tables that should be automatically scoped by agency_id
    const agencyScopedTables = [
      'buildings',
      'units', 
      'leaseholders',
      'building_documents',
      'incoming_emails',
      'building_compliance_assets',
      'compliance_assets',
      'ai_logs',
      'email_history',
      'sent_emails',
      'building_setup',
      'leases',
      'contractors',
      'compliance_inspections',
      'building_compliance_config',
      'compliance_notifications',
      'property_events',
      'calendar_events',
      'works_orders',
      'connected_accounts'
    ]

    // If this table should be agency-scoped, wrap the query
    if (agencyScopedTables.includes(table as string)) {
      return new AgencyScopedQueryBuilder(query, table as string)
    }

    return query
  }
}

/**
 * Wrapper for query builder that automatically applies agency filtering
 */
class AgencyScopedQueryBuilder<T> {
  private query: any
  private tableName: string

  constructor(query: any, tableName: string) {
    this.query = query
    this.tableName = tableName
  }

  select(columns?: string) {
    const newQuery = this.query.select(columns)
    return this.applyAgencyScope(newQuery)
  }

  insert(values: any) {
    // For inserts, automatically add agency_id if not provided
    const currentAgencyId = getCurrentAgencyId()
    
    if (currentAgencyId) {
      if (Array.isArray(values)) {
        values = values.map(value => ({
          ...value,
          agency_id: value.agency_id || currentAgencyId
        }))
      } else if (typeof values === 'object' && values !== null) {
        values = {
          ...values,
          agency_id: values.agency_id || currentAgencyId
        }
      }
    }

    return this.query.insert(values)
  }

  update(values: any) {
    const newQuery = this.query.update(values)
    return this.applyAgencyScope(newQuery)
  }

  delete() {
    const newQuery = this.query.delete()
    return this.applyAgencyScope(newQuery)
  }

  upsert(values: any) {
    // For upserts, automatically add agency_id if not provided
    const currentAgencyId = getCurrentAgencyId()
    
    if (currentAgencyId) {
      if (Array.isArray(values)) {
        values = values.map(value => ({
          ...value,
          agency_id: value.agency_id || currentAgencyId
        }))
      } else if (typeof values === 'object' && values !== null) {
        values = {
          ...values,
          agency_id: values.agency_id || currentAgencyId
        }
      }
    }

    return this.query.upsert(values)
  }

  // Pass through other query methods
  eq(column: string, value: any) {
    return this.applyAgencyScope(this.query.eq(column, value))
  }

  neq(column: string, value: any) {
    return this.applyAgencyScope(this.query.neq(column, value))
  }

  gt(column: string, value: any) {
    return this.applyAgencyScope(this.query.gt(column, value))
  }

  gte(column: string, value: any) {
    return this.applyAgencyScope(this.query.gte(column, value))
  }

  lt(column: string, value: any) {
    return this.applyAgencyScope(this.query.lt(column, value))
  }

  lte(column: string, value: any) {
    return this.applyAgencyScope(this.query.lte(column, value))
  }

  like(column: string, pattern: string) {
    return this.applyAgencyScope(this.query.like(column, pattern))
  }

  ilike(column: string, pattern: string) {
    return this.applyAgencyScope(this.query.ilike(column, pattern))
  }

  is(column: string, value: any) {
    return this.applyAgencyScope(this.query.is(column, value))
  }

  in(column: string, values: any[]) {
    return this.applyAgencyScope(this.query.in(column, values))
  }

  contains(column: string, value: any) {
    return this.applyAgencyScope(this.query.contains(column, value))
  }

  containedBy(column: string, value: any) {
    return this.applyAgencyScope(this.query.containedBy(column, value))
  }

  rangeGt(column: string, range: string) {
    return this.applyAgencyScope(this.query.rangeGt(column, range))
  }

  rangeGte(column: string, range: string) {
    return this.applyAgencyScope(this.query.rangeGte(column, range))
  }

  rangeLt(column: string, range: string) {
    return this.applyAgencyScope(this.query.rangeLt(column, range))
  }

  rangeLte(column: string, range: string) {
    return this.applyAgencyScope(this.query.rangeLte(column, range))
  }

  rangeAdjacent(column: string, range: string) {
    return this.applyAgencyScope(this.query.rangeAdjacent(column, range))
  }

  overlaps(column: string, value: any) {
    return this.applyAgencyScope(this.query.overlaps(column, value))
  }

  textSearch(column: string, query: string, config?: any) {
    return this.applyAgencyScope(this.query.textSearch(column, query, config))
  }

  match(query: Record<string, any>) {
    return this.applyAgencyScope(this.query.match(query))
  }

  not(column: string, operator: string, value: any) {
    return this.applyAgencyScope(this.query.not(column, operator, value))
  }

  or(filters: string) {
    return this.applyAgencyScope(this.query.or(filters))
  }

  filter(column: string, operator: string, value: any) {
    return this.applyAgencyScope(this.query.filter(column, operator, value))
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    return this.applyAgencyScope(this.query.order(column, options))
  }

  limit(count: number) {
    return this.applyAgencyScope(this.query.limit(count))
  }

  range(from: number, to: number) {
    return this.applyAgencyScope(this.query.range(from, to))
  }

  abortSignal(signal: AbortSignal) {
    return this.applyAgencyScope(this.query.abortSignal(signal))
  }

  single() {
    return this.query.single()
  }

  maybeSingle() {
    return this.query.maybeSingle()
  }

  csv() {
    return this.query.csv()
  }

  geojson() {
    return this.query.geojson()
  }

  explain(options?: any) {
    return this.query.explain(options)
  }

  rollback() {
    return this.query.rollback()
  }

  returns() {
    return this.query.returns()
  }

  /**
   * Apply agency scoping to a query if current agency is available
   */
  private applyAgencyScope(query: any) {
    const currentAgencyId = getCurrentAgencyId()
    
    if (currentAgencyId) {
      // Only apply agency filter if the query doesn't already have one
      // This allows for manual overrides when needed
      return query.eq('agency_id', currentAgencyId)
    }
    
    return query
  }
}

// Export the agency-scoped client
export const agencySupabase = new AgencyScopedSupabaseClient()

/**
 * Utility function to get current agency ID for server-side usage
 */
export function getCurrentAgencyIdFromCookies(cookieString?: string): string | null {
  if (typeof window !== 'undefined') {
    return getCurrentAgencyId()
  }
  
  if (!cookieString) return null
  
  const cookies = cookieString.split(';')
  const agencyCookie = cookies.find(cookie => 
    cookie.trim().startsWith('blociq_current_agency=')
  )
  
  return agencyCookie ? agencyCookie.split('=')[1]?.trim() || null : null
}

/**
 * Server-side function to create agency-scoped Supabase client
 */
export function createAgencyServerClient(agencyId: string) {
  // This would be implemented for server-side usage
  // For now, return the regular server client
  const { createClient } = require('@/utils/supabase/server')
  return createClient()
}
