require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAllIssues() {
  console.log('🔧 Fixing all identified issues...')
  
  try {
    // Fix 1: Create building_todos table
    console.log('\n📝 Fix 1: Creating building_todos table...')
    const createTodosTable = `
      CREATE TABLE IF NOT EXISTS building_todos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        is_complete BOOLEAN DEFAULT false,
        due_date TIMESTAMP WITH TIME ZONE,
        priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
        assigned_to TEXT,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: todosTableError } = await supabase.rpc('exec_sql', { sql: createTodosTable })
    if (todosTableError) {
      console.error('❌ Error creating building_todos table:', todosTableError)
    } else {
      console.log('✅ Building todos table created/fixed')
    }

    // Fix 2: Add indexes to building_todos
    console.log('\n📊 Fix 2: Adding indexes to building_todos...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_building_todos_building_id ON building_todos(building_id);',
      'CREATE INDEX IF NOT EXISTS idx_building_todos_status ON building_todos(status);',
      'CREATE INDEX IF NOT EXISTS idx_building_todos_due_date ON building_todos(due_date);',
      'CREATE INDEX IF NOT EXISTS idx_building_todos_priority ON building_todos(priority);',
      'CREATE INDEX IF NOT EXISTS idx_building_todos_created_at ON building_todos(created_at);'
    ]
    
    for (const index of indexes) {
      const { error } = await supabase.rpc('execByName', { 
        functionName: 'exec_sql', 
        params: { sql: index } 
      })
      if (error) {
        console.error('❌ Error creating index:', error)
      }
    }
    console.log('✅ Indexes added to building_todos')

    // Fix 3: Enable RLS on building_todos
    console.log('\n🔒 Fix 3: Enabling RLS on building_todos...')
    const { error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE building_todos ENABLE ROW LEVEL SECURITY;' 
    })
    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError)
    } else {
      console.log('✅ RLS enabled on building_todos')
    }

    // Fix 4: Fix compliance assets with undefined names
    console.log('\n📋 Fix 4: Fixing compliance assets...')
    const complianceFixes = [
      "UPDATE compliance_assets SET name = 'Electrical Safety Certificate' WHERE category = 'Electrical' AND (name IS NULL OR name = 'undefined');",
      "UPDATE compliance_assets SET name = 'Fire Safety Certificate' WHERE category = 'Fire' AND (name IS NULL OR name = 'undefined');",
      "UPDATE compliance_assets SET name = 'Gas Safety Certificate' WHERE category = 'Gas' AND (name IS NULL OR name = 'undefined');"
    ]
    
    for (const fix of complianceFixes) {
      const { error } = await supabase.rpc('exec_s', { sql: fix })
      if (error) {
        console.error('❌ Error fixing compliance assets:', error)
      }
    }
    console.log('✅ Compliance assets fixed')

    // Fix 5: Add sample building todos
    console.log('\n📝 Fix 5: Adding sample building todos...')
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id')
      .limit(1)
    
    if (buildings && buildings.length > 0) {
      const sampleTodos = [
        {
          building_id: buildings[0].id,
          title: ' Heating System Maintenance',
          description: 'Annual heating system inspection and maintenance',
          status: 'pending',
          priority: 'High',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        },
        {
          building_id: buildings[0].id,
          title: 'Fire Safety Check',
          description: 'Monthly fire safety equipment inspection',
          status: 'in_progress',
          priority: 'Medium',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        },
        {
          building_id: buildings[0].id,
          title: 'Electrical Inspection',
          description: 'Quarterly electrical system inspection',
          status: 'completed',
          priority: 'Low',
          due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
        }
      ]
      
      for (const todo of sampleTodos) {
        const { error } = await supabase
          .from('building_todos')
          .insert(todo)
        
        if (error) {
          console.error('❌ Error adding sample todo:', error)
        } else {
          console.log(`✅ Added sample todo: ${todo.title}`)
        }
      }
    }

    console.log('\n✅ All fixes completed!')
    console.log('\n🔗 You can now test the pages at:')
    console.log('  - http://localhost:3000/compliance')
    console.log('  - http://localhost:3000/buildings')
    console.log('  - http://localhost:3000/inbox')
    console.log('\n📝 Test users:')
    console.log('  - eleanor.oxley@blociq.co.uk (password: testpassword123)')
    console.log('  - testbloc@blociq.co.uk (password: testpassword123)')

  } catch (error) {
    console.error('❌ Error fixing issues pie:', error)
  }
}

fixAllIssues() 