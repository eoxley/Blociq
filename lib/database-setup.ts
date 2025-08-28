import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface TableStatus {
  exists: boolean
  rowCount: number
  error?: string
}

export async function checkTableExists(tableName: string): Promise<TableStatus> {
  try {
    // Try to get row count to check if table exists
    const { count, error } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      // If error is about table not existing, return false
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return { exists: false, rowCount: 0 }
      }
      return { exists: true, rowCount: 0, error: error.message }
    }
    
    return { exists: true, rowCount: count || 0 }
  } catch (err) {
    return { exists: false, rowCount: 0, error: String(err) }
  }
}

export async function createCommunicationsLogTable(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc('create_communications_log_table')
    if (error) {
      console.log('📋 communications_log table creation failed:', error.message)
      return false
    }
    console.log('✅ communications_log table created successfully')
    return true
  } catch (err) {
    console.log('📋 communications_log table creation error:', err)
    return false
  }
}

export async function createBuildingComplianceAssetsTable(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc('create_building_compliance_assets_table')
    if (error) {
      console.log('🏢 building_compliance_assets table creation failed:', error.message)
      return false
    }
    console.log('✅ building_compliance_assets table created successfully')
    return true
  } catch (err) {
    console.log('🏢 building_compliance_assets table creation error:', err)
    return false
  }
}

export async function ensureRequiredTables(): Promise<{
  communicationsLog: boolean
  buildingComplianceAssets: boolean
}> {
  console.log('🔍 Checking required database tables...')
  
  const communicationsLogStatus = await checkTableExists('communications_log')
  const buildingComplianceAssetsStatus = await checkTableExists('building_compliance_assets')
  
  console.log('📋 communications_log:', communicationsLogStatus.exists ? '✅ exists' : '❌ missing')
  console.log('🏢 building_compliance_assets:', buildingComplianceAssetsStatus.exists ? '✅ exists' : '❌ missing')
  
  let communicationsLogCreated = false
  let buildingComplianceAssetsCreated = false
  
  if (!communicationsLogStatus.exists) {
    console.log('📋 Creating communications_log table...')
    communicationsLogCreated = await createCommunicationsLogTable()
  }
  
  if (!buildingComplianceAssetsStatus.exists) {
    console.log('🏢 Creating building_compliance_assets table...')
    buildingComplianceAssetsCreated = await createBuildingComplianceAssetsTable()
  }
  
  return {
    communicationsLog: communicationsLogStatus.exists || communicationsLogCreated,
    buildingComplianceAssets: buildingComplianceAssetsStatus.exists || buildingComplianceAssetsCreated
  }
}

export async function getDatabaseHealth(): Promise<{
  healthy: boolean
  tables: Record<string, TableStatus>
  message: string
}> {
  const requiredTables = [
    'buildings',
    'building_compliance_assets',
    'compliance_assets',
    'communications_log',
    'users'
  ]
  
  const tableStatuses: Record<string, TableStatus> = {}
  let allTablesExist = true
  
  for (const table of requiredTables) {
    const status = await checkTableExists(table)
    tableStatuses[table] = status
    if (!status.exists) {
      allTablesExist = false
    }
  }
  
  return {
    healthy: allTablesExist,
    tables: tableStatuses,
    message: allTablesExist 
      ? 'All required tables exist' 
      : 'Some required tables are missing'
  }
}

export async function safeQuery<T>(
  tableName: string,
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; tableExists: boolean }> {
  const tableStatus = await checkTableExists(tableName)
  
  if (!tableStatus.exists) {
    console.log(`⚠️ Table ${tableName} doesn't exist, returning empty result`)
    return { data: null, error: null, tableExists: false }
  }
  
  try {
    const result = await queryFn()
    return { ...result, tableExists: true }
  } catch (err) {
    console.error(`❌ Error querying ${tableName}:`, err)
    return { data: null, error: err, tableExists: true }
  }
}
