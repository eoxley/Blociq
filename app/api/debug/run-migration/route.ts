import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Run the SQL migration directly
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add building_id column to document_jobs table if it doesn't exist
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'document_jobs' AND column_name = 'building_id') THEN
                ALTER TABLE document_jobs ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;
                CREATE INDEX IF NOT EXISTS idx_document_jobs_building_id ON document_jobs(building_id);
                COMMENT ON COLUMN document_jobs.building_id IS 'Reference to the building this document relates to';
            END IF;
        END $$;

        -- Add scope column to leases table if it doesn't exist
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'leases' AND column_name = 'scope') THEN
                ALTER TABLE leases ADD COLUMN scope TEXT NOT NULL DEFAULT 'unit' CHECK (scope IN ('building', 'unit'));
                CREATE INDEX IF NOT EXISTS idx_leases_scope ON leases(scope);
                COMMENT ON COLUMN leases.scope IS 'Whether this lease covers a unit or entire building';
            END IF;
        END $$;

        -- Add missing columns to communications_log if they don't exist
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'communications_log' AND column_name = 'building_id') THEN
                ALTER TABLE communications_log ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;
                CREATE INDEX IF NOT EXISTS idx_communications_log_building_id ON communications_log(building_id);
                COMMENT ON COLUMN communications_log.building_id IS 'Reference to the building this communication relates to';
            END IF;
        END $$;

        -- Add leaseholder_id column to communications_log if it doesn't exist
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'communications_log' AND column_name = 'leaseholder_id') THEN
                ALTER TABLE communications_log ADD COLUMN leaseholder_id UUID;
                CREATE INDEX IF NOT EXISTS idx_communications_log_leaseholder_id ON communications_log(leaseholder_id);
                COMMENT ON COLUMN communications_log.leaseholder_id IS 'Reference to the leaseholder this communication relates to';
            END IF;
        END $$;

        -- Add other missing columns to communications_log if they don't exist
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'communications_log' AND column_name = 'direction') THEN
                ALTER TABLE communications_log ADD COLUMN direction TEXT CHECK (direction IN ('incoming', 'outgoing'));
                COMMENT ON COLUMN communications_log.direction IS 'Direction of communication: incoming or outgoing';
            END IF;
        END $$;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'communications_log' AND column_name = 'metadata') THEN
                ALTER TABLE communications_log ADD COLUMN metadata JSONB DEFAULT '{}';
                COMMENT ON COLUMN communications_log.metadata IS 'Additional metadata for the communication';
            END IF;
        END $$;

        -- Create building_access table if it doesn't exist
        CREATE TABLE IF NOT EXISTS building_access (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'viewer')),
            granted_by UUID REFERENCES auth.users(id),
            granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, building_id)
        );

        -- Create indexes for building_access
        CREATE INDEX IF NOT EXISTS idx_building_access_user_id ON building_access(user_id);
        CREATE INDEX IF NOT EXISTS idx_building_access_building_id ON building_access(building_id);
      `
    });

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({
        error: 'Migration failed',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    });

  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json({
      error: 'Failed to run migration',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}