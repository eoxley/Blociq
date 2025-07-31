require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBuildingTodosSimple() {
  console.log('🔧 Creating building_todos table (simple approach)...')
  
  try {
    // First, check if the table already exists
    console.log('🔍 Checking if building_todos table exists...')
    const { data: existingTodos, error: checkError } = await supabase
      .from('building_todos')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === 'PGRST204') {
      console.log('❌ building_todos table does not exist - this is expected')
      console.log('📝 Note: You will need to create this table manually in your Supabase dashboard')
      console.log('🔗 Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT]/editor')
      console.log('📋 Use the SQL from scripts/create_building_todos.sql')
    } else if (checkError) {
      console.error('❌ Error checking building_todos table:', checkError)
    } else {
      console.log('✅ building_todos table already exists')
    }

    // Get buildings to create sample todos for
    console.log('\n🏢 Getting buildings for sample todos...')
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .limit(5)
    
    if (buildingsError) {
      console.error('❌ Error fetching buildings:', buildingsError)
      return
    }
    
    console.log(`✅ Found ${buildings?.length || 0} buildings`)
    
    if (buildings && buildings.length > 0) {
      console.log('\n📝 Creating sample building todos...')
      
      const sampleTodos = [
        {
          building_id: buildings[0].id,
          title: 'Heating System Maintenance',
          description: 'Annual heating system inspection and maintenance',
          status: 'pending',
          priority: 'High',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_complete: false
        },
        {
          building_id: buildings[0].id,
          title: 'Fire Safety Check',
          description: 'Monthly fire safety equipment inspection',
          status: 'in_progress',
          priority: 'Medium',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_complete: false
        },
        {
          building_id: buildings[0].id,
          title: 'Electrical Inspection',
          description: 'Quarterly electrical system inspection',
          status: 'completed',
          priority: 'Low',
          due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_complete: true
        },
        {
          building_id: buildings[0].id,
          title: 'Gas Safety Certificate',
          description: 'Annual gas safety inspection and certificate renewal',
          status: 'pending',
          priority: 'High',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_complete: false
        },
        {
          building_id: buildings[0].id,
          title: 'Energy Performance Assessment',
          description: 'Energy efficiency assessment and EPC renewal',
          status: 'in_progress',
          priority: 'Medium',
          due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          is_complete: false
        }
      ]
      
      let createdCount = 0
      for (const todo of sampleTodos) {
        try {
          const { error } = await supabase
            .from('building_todos')
            .insert(todo)
          
          if (error) {
            console.log(`⚠️ Could not create todo "${todo.title}": ${error.message}`)
          } else {
            console.log(`✅ Created todo: ${todo.title}`)
            createdCount++
          }
        } catch (insertError) {
          console.log(`⚠️ Error creating todo "${todo.title}": ${insertError.message}`)
        }
      }
      
      console.log(`\n📊 Created ${createdCount} out of ${sampleTodos.length} sample todos`)
    }

    // Test querying the todos
    console.log('\n🔍 Testing building_todos queries...')
    const { data: testTodos, error: testError } = await supabase
      .from('building_todos')
      .select('*')
      .limit(5)
    
    if (testError) {
      console.error('❌ Error testing building_todos queries:', testError)
    } else {
      console.log(`✅ Successfully queried building_todos! Found ${testTodos?.length || 0} todos`)
      
      if (testTodos && testTodos.length > 0) {
        console.log('\n📝 Sample todos:')
        testTodos.forEach((todo, index) => {
          const dueDate = todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date'
          console.log(`  ${index + 1}. ${todo.title} (${todo.status}) - Due: ${dueDate}`)
        })
      }
    }

    console.log('\n✅ Building todos setup completed!')
    console.log('\n🔗 Next steps:')
    console.log('  1. If the table doesn\'t exist, create it manually in Supabase dashboard')
    console.log('  2. Use the SQL from scripts/create_building_todos.sql')
    console.log('  3. Test the building todos functionality')
    console.log('\n📝 Test pages:')
    console.log('  - http://localhost:3000/buildings')
    console.log('  - Any building page with todos')

  } catch (error) {
    console.error('❌ Error in building todos setup:', error)
  }
}

createBuildingTodosSimple() 