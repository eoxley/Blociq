require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createOutlookTokensTable() {
  console.log('🔧 Creating outlook_tokens table...')
  
  try {
    // Create the outlook_tokens table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS outlook_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, email)
        );
      `
    })

    if (createError) {
      console.error('❌ Error creating table:', createError)
      return
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE outlook_tokens ENABLE ROW LEVEL SECURITY;'
    })

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError)
      return
    }

    // Create RLS policies
    const policies = [
      `CREATE POLICY "Users can view their own outlook tokens" ON outlook_tokens FOR SELECT USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can insert their own outlook tokens" ON outlook_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY "Users can update their own outlook tokens" ON outlook_tokens FOR UPDATE USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can delete their own outlook tokens" ON outlook_tokens FOR DELETE USING (auth.uid() = user_id);`
    ]

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy })
      if (policyError && !policyError.message.includes('already exists')) {
        console.error('❌ Error creating policy:', policyError)
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON outlook_tokens(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_outlook_tokens_email ON outlook_tokens(email);'
    ]

    for (const index of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: index })
      if (indexError) {
        console.error('❌ Error creating index:', indexError)
      }
    }

    console.log('✅ outlook_tokens table created successfully!')
    
    // Test the table by checking if it exists
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
    console.error('❌ Unexpected error:', error)
  }
}

createOutlookTokensTable() 