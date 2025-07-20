require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 Running outlook_tokens table migration...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_outlook_tokens.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })
        
        if (error) {
          console.error('❌ Error executing statement:', error)
          console.error('Statement:', statement)
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }
    
    console.log('✅ Migration completed!')
    
    // Test the table
    console.log('🧪 Testing table access...')
    const { data, error } = await supabase
      .from('outlook_tokens')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Error testing table:', error)
    } else {
      console.log('✅ Table is accessible and working!')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigration() 