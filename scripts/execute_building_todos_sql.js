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

async function executeBuildingTodosSQL() {
  console.log('🔧 Executing building_todos SQL script...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_building_todos.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📝 SQL file loaded successfully')
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      try {
        // For statements that return data (like SELECT), we'll handle them differently
        if (statement.trim().toUpperCase().startsWith('SELECT')) {
          console.log(`📊 Executing SELECT statement ${i + 1}...`)
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            console.error(`❌ Error executing SELECT statement ${i + 1}:`, error)
          } else {
            console.log(`✅ SELECT statement ${i + 1} executed successfully`)
            if (data && data.length > 0) {
              console.log('📊 Results:', data)
            }
          }
        } else {
          console.log(`🔧 Executing statement ${i + 1}...`)
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error)
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        }
      } catch (stmtError) {
        console.error(`❌ Error in statement ${i + 1}:`, stmtError)
      }
    }
    
    // Verify the table was created by trying to query it
    console.log('\n🔍 Verifying building_todos table...')
    const { data: todos, error: queryError } = await supabase
      .from('building_todos')
      .select('*')
      .limit(5)
    
    if (queryError) {
      console.error('❌ Error querying building_todos table:', queryError)
    } else {
      console.log(`✅ building_todos table verified! Found ${todos?.length || 0} todos`)
      
      if (todos && todos.length > 0) {
        console.log('📝 Sample todos:')
        todos.forEach((todo, index) => {
          console.log(`  ${index + 1}. ${todo.title} (${todo.status}) - Due: ${todo.due_date}`)
        })
      }
    }
    
    console.log('\n✅ Building todos SQL execution completed!')
    console.log('\n🔗 You can now test the building todos functionality at:')
    console.log('  - http://localhost:3000/buildings')
    console.log('  - Any building page with todos')
    
  } catch (error) {
    console.error('❌ Error executing building todos SQL:', error)
  }
}

executeBuildingTodosSQL() 