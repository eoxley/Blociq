const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Create Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyCalendarFix() {
  console.log('🔧 Applying calendar agency isolation fix...')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250923120000_fix_calendar_agency_isolation.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the migration into individual statements (basic approach)
    const statements = migrationSQL
      .split(/\$\$/g)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`📝 Found ${Math.ceil(statements.length / 2)} DO blocks to execute`)

    // Execute DO blocks (every other statement pair)
    for (let i = 0; i < statements.length; i += 2) {
      if (statements[i + 1]) {
        const doBlock = statements[i] + '$$' + statements[i + 1] + '$$'
        if (doBlock.includes('DO $$')) {
          console.log(`⚡ Executing DO block ${Math.ceil((i + 1) / 2)}...`)
          const { error } = await supabase.rpc('exec_sql', { sql: doBlock })
          if (error) {
            console.error(`❌ Error in DO block ${Math.ceil((i + 1) / 2)}:`, error)
          } else {
            console.log(`✅ DO block ${Math.ceil((i + 1) / 2)} completed`)
          }
        }
      }
    }

    // Execute the other individual statements
    const otherStatements = [
      "CREATE INDEX IF NOT EXISTS idx_property_events_agency_id ON property_events(agency_id);",

      `UPDATE property_events pe
SET agency_id = b.agency_id
FROM buildings b
WHERE pe.building_id = b.id
  AND pe.agency_id IS NULL
  AND b.agency_id IS NOT NULL;`,

      `UPDATE property_events pe
SET agency_id = p.agency_id
FROM profiles p
WHERE pe.created_by = p.id
  AND pe.agency_id IS NULL
  AND pe.building_id IS NULL
  AND p.agency_id IS NOT NULL;`,

      `UPDATE property_events
SET agency_id = (
  SELECT id FROM agencies
  WHERE slug = 'blociq-property-management'
  LIMIT 1
)
WHERE agency_id IS NULL;`,

      "DROP POLICY IF EXISTS \"Users can view property events\" ON property_events;",
      "DROP POLICY IF EXISTS \"Users can insert property events\" ON property_events;",
      "DROP POLICY IF EXISTS \"Users can update property events\" ON property_events;",
      "DROP POLICY IF EXISTS \"Users can delete property events\" ON property_events;",

      `CREATE POLICY "Users can view events in their agency" ON property_events
  FOR SELECT USING (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );`,

      `CREATE POLICY "Users can insert events in their agency" ON property_events
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );`,

      `CREATE POLICY "Users can update events in their agency" ON property_events
  FOR UPDATE USING (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );`,

      `CREATE POLICY "Users can delete events in their agency" ON property_events
  FOR DELETE USING (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );`,

      "ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;",

      "COMMENT ON COLUMN property_events.agency_id IS 'Reference to the agency that owns this event - ensures calendar isolation between agencies';"
    ]

    for (const statement of otherStatements) {
      console.log(`⚡ Executing statement: ${statement.substring(0, 60)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error('❌ Statement error:', error)
      } else {
        console.log('✅ Statement completed')
      }
    }

    console.log('🎉 Calendar agency isolation fix applied successfully!')

  } catch (error) {
    console.error('❌ Failed to apply calendar fix:', error)
    process.exit(1)
  }
}

applyCalendarFix()