import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 Running communications_log schema migration...')

    // Apply the communications_log migration
    const migrationSQL = `
      -- Add missing columns to communications_log if they don't exist
      DO $$
      BEGIN
          -- Add building_id column with foreign key if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'building_id'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;

              CREATE INDEX IF NOT EXISTS idx_communications_log_building_id
              ON communications_log(building_id);
          END IF;

          -- Add leaseholder_id column if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'leaseholder_id'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL;

              CREATE INDEX IF NOT EXISTS idx_communications_log_leaseholder_id
              ON communications_log(leaseholder_id);
          END IF;

          -- Add content column if missing
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'content'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN content TEXT;
          END IF;

          -- Add subject column if missing
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'subject'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN subject TEXT;
          END IF;

          -- Add sent_at column if missing
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'sent_at'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

              CREATE INDEX IF NOT EXISTS idx_communications_log_sent_at
              ON communications_log(sent_at DESC);
          END IF;

          -- Add direction column if missing
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'direction'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN direction TEXT DEFAULT 'outbound'
              CHECK (direction IN ('inbound', 'outbound'));

              CREATE INDEX IF NOT EXISTS idx_communications_log_direction
              ON communications_log(direction);
          END IF;

          -- Add sent_by column if missing
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'communications_log' AND column_name = 'sent_by'
          ) THEN
              ALTER TABLE communications_log
              ADD COLUMN sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

              CREATE INDEX IF NOT EXISTS idx_communications_log_sent_by
              ON communications_log(sent_by);
          END IF;

      END $$;

      -- Update any existing null sent_at values to use created_at
      UPDATE communications_log
      SET sent_at = created_at
      WHERE sent_at IS NULL AND created_at IS NOT NULL;
    `;

    // Execute the migration
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (migrationError) {
      console.error('Migration error:', migrationError)
      return NextResponse.json({
        error: 'Migration failed',
        details: migrationError
      }, { status: 500 })
    }

    console.log('✅ Migration completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Communications log migration completed'
    })

  } catch (error) {
    console.error('❌ Error running migration:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check communications_log table schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'communications_log')
      .order('ordinal_position')

    if (error) {
      return NextResponse.json({
        error: 'Failed to check schema',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      table: 'communications_log',
      columns: columns || [],
      column_count: columns?.length || 0
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check table schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}