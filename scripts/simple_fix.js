require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function simpleFix() {
  console.log('🔧 Simple fix for all issues...')
  
  try {
    // Fix 1: Update compliance assets with proper names
    console.log('\n📋 Fix 1: Updating compliance assets...')
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('compliance_assets')
      .select('*')
    
    if (complianceError) {
      console.error('❌ Error fetching compliance assets:', complianceError)
    } else {
      console.log(`Found ${complianceAssets?.length || 0} compliance assets`)
      
      // Update assets with undefined names
      for (const asset of complianceAssets || []) {
        if (!asset.name || asset.name === 'undefined') {
          let newName = ''
          switch (asset.category) {
            case 'Electrical':
              newName = 'Electrical Safety Certificate'
              break
            case 'Fire':
              newName = 'Fire Safety Certificate'
              break
            case 'Gas':
              newName = 'Gas Safety Certificate'
              break
            default:
              newName = `${asset.category} Certificate`
          }
          
          const { error: updateError } = await supabase
            .from('compliance_assets')
            .update({ name: newName })
            .eq('id', asset.id)
          
          if (updateError) {
            console.error(`❌ Error updating asset ${asset.id}:`, updateError)
          } else {
            console.log(`✅ Updated asset: ${newName}`)
          }
        }
      }
    }

    // Fix 2: Add sample building todos (if table exists)
    console.log('\n📝 Fix 2: Adding sample building todos...')
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id')
      .limit(1)
    
    if (buildings && buildings.length > 0) {
      const sampleTodos = [
        {
          building_id: buildings[0].id,
          title: 'Heating System Maintenance',
          description: 'Annual heating system inspection and maintenance',
          status: 'pending',
          priority: 'High',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          building_id: buildings[0].id,
          title: 'Fire Safety Check',
          description: 'Monthly fire safety equipment inspection',
          status: 'in_progress',
          priority: 'Medium',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          building_id: buildings[0].id,
          title: 'Electrical Inspection',
          description: 'Quarterly electrical system inspection',
          status: 'completed',
          priority: 'Low',
          due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      for (const todo of sampleTodos) {
        const { error } = await supabase
          .from('building_todos')
          .insert(todo)
        
        if (error) {
          console.log(`⚠️ Could not add todo (table might not exist): ${todo.title}`)
        } else {
          console.log(`✅ Added sample todo: ${todo.title}`)
        }
      }
    }

    // Fix 3: Test the inbox functionality
    console.log('\n📧 Fix 3: Testing inbox functionality...')
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .limit(5)
    
    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError)
    } else {
      console.log(`✅ Found ${emails?.length || 0} emails in inbox`)
    }

    console.log('\n✅ Simple fixes completed!')
    console.log('\n🔗 You can now test the pages at:')
    console.log('  - http://localhost:3000/compliance')
    console.log('  - http://localhost:3000/buildings')
    console.log('  - http://localhost:3000/inbox')
    console.log('\n📝 Test users:')
    console.log('  - eleanor.oxley@blociq.co.uk (password: testpassword123)')
    console.log('  - testbloc@blociq.co.uk (password: testpassword123)')

  } catch (error) {
    console.error('❌ Error in simple fix:', error)
  }
}

simpleFix() 