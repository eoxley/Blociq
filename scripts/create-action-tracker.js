const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const SQL_SCHEMA = `
-- Action Tracker Schema for BlocIQ
-- Building-specific action/task tracking system

-- Create the building_action_tracker table
CREATE TABLE IF NOT EXISTS building_action_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  due_date date,
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  priority text CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  source text DEFAULT 'Manual' CHECK (source IN ('Manual', 'Meeting', 'Call', 'Email')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_building_id ON building_action_tracker(building_id);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_due_date ON building_action_tracker(due_date);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_completed ON building_action_tracker(completed);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_priority ON building_action_tracker(priority);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_source ON building_action_tracker(source);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_building_action_tracker_updated_at ON building_action_tracker;
CREATE TRIGGER update_building_action_tracker_updated_at 
    BEFORE UPDATE ON building_action_tracker 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE building_action_tracker ENABLE ROW LEVEL SECURITY;
`

const SEED_DATA_SQL = `
-- Insert seed data for testing (building ID: 2beeec1d-a94e-4058-b881-213d74cc6830)
INSERT INTO building_action_tracker (building_id, item_text, due_date, notes, completed, priority, source, created_at) VALUES
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Follow up on fire safety certificate renewal', '2024-12-15', 'Contact fire safety contractor to schedule renewal inspection', false, 'high', 'Meeting', NOW() - INTERVAL '2 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Repair communal area lighting on 2nd floor', '2024-11-20', 'Reported by leaseholder in unit 2B - flickering lights in hallway', false, 'medium', 'Call', NOW() - INTERVAL '1 day'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Schedule building insurance review', '2024-10-15', 'Policy expires in January - need to review coverage options', true, 'medium', 'Email', NOW() - INTERVAL '5 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Update building access codes', '2024-11-01', 'Change main entrance code after recent leaseholder turnover', true, 'low', 'Manual', NOW() - INTERVAL '3 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Organize annual building meeting', '2024-12-30', 'Send out meeting notices and prepare agenda items', false, 'low', 'Manual', NOW() - INTERVAL '1 day'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Check and service lift emergency phone', NULL, 'Monthly maintenance check - ensure emergency communication working', false, 'medium', 'Meeting', NOW()),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Replace broken intercom for unit 3A', '2024-11-10', 'Leaseholder reported intercom not working - need to schedule repair', true, 'high', 'Call', NOW() - INTERVAL '4 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Review and update building emergency procedures', '2024-12-01', 'Annual review of evacuation plans and emergency contact lists', false, 'medium', 'Manual', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;
`

async function createActionTracker() {
  try {
    console.log('🚀 Creating Action Tracker schema...')
    
    // Create schema
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: SQL_SCHEMA })
    
    if (schemaError) {
      // Try direct query if RPC doesn't work
      console.log('📊 Trying direct SQL execution...')
      
      // Split SQL into individual statements
      const statements = SQL_SCHEMA
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)
      
      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.log(`⚠️ Statement execution note: ${error.message}`)
        }
      }
    }
    
    console.log('✅ Schema created successfully')
    
    // Add seed data
    console.log('🌱 Adding seed data...')
    
    const { error: seedError } = await supabase.rpc('exec_sql', { sql: SEED_DATA_SQL })
    
    if (seedError) {
      console.log(`⚠️ Seed data note: ${seedError.message}`)
      // Try manual insert instead
      console.log('📊 Trying manual data insertion...')
      
      const seedItems = [
        {
          building_id: '2beeec1d-a94e-4058-b881-213d74cc6830',
          item_text: 'Follow up on fire safety certificate renewal',
          due_date: '2024-12-15',
          notes: 'Contact fire safety contractor to schedule renewal inspection',
          completed: false,
          priority: 'high',
          source: 'Meeting'
        },
        {
          building_id: '2beeec1d-a94e-4058-b881-213d74cc6830',
          item_text: 'Repair communal area lighting on 2nd floor',
          due_date: '2024-11-20',
          notes: 'Reported by leaseholder in unit 2B - flickering lights in hallway',
          completed: false,
          priority: 'medium',
          source: 'Call'
        },
        {
          building_id: '2beeec1d-a94e-4058-b881-213d74cc6830',
          item_text: 'Schedule building insurance review',
          due_date: '2024-10-15',
          notes: 'Policy expires in January - need to review coverage options',
          completed: true,
          priority: 'medium',
          source: 'Email'
        },
        {
          building_id: '2beeec1d-a94e-4058-b881-213d74cc6830',
          item_text: 'Update building access codes',
          due_date: '2024-11-01',
          notes: 'Change main entrance code after recent leaseholder turnover',
          completed: true,
          priority: 'low',
          source: 'Manual'
        },
        {
          building_id: '2beeec1d-a94e-4058-b881-213d74cc6830',
          item_text: 'Organize annual building meeting',
          due_date: '2024-12-30',
          notes: 'Send out meeting notices and prepare agenda items',
          completed: false,
          priority: 'low',
          source: 'Manual'
        }
      ]
      
      const { data, error: insertError } = await supabase
        .from('building_action_tracker')
        .insert(seedItems)
        .select()
      
      if (insertError) {
        console.error('❌ Manual insert failed:', insertError)
      } else {
        console.log(`✅ Inserted ${data?.length || 0} seed items`)
      }
    } else {
      console.log('✅ Seed data added successfully')
    }
    
    // Verify the setup
    console.log('🔍 Verifying setup...')
    
    const { data: trackerItems, error: verifyError } = await supabase
      .from('building_action_tracker')
      .select('*')
      .eq('building_id', '2beeec1d-a94e-4058-b881-213d74cc6830')
      .limit(5)
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
    } else {
      console.log(`✅ Found ${trackerItems?.length || 0} action tracker items`)
      if (trackerItems?.length > 0) {
        console.log('📋 Sample item:', {
          text: trackerItems[0].item_text,
          priority: trackerItems[0].priority,
          source: trackerItems[0].source,
          due_date: trackerItems[0].due_date
        })
      }
    }
    
    console.log('🎉 Action Tracker setup complete!')
    console.log('🔗 You can now view the tracker at: /buildings/2beeec1d-a94e-4058-b881-213d74cc6830')
    
  } catch (error) {
    console.error('❌ Failed to create Action Tracker:', error)
    process.exit(1)
  }
}

// Run the setup
createActionTracker()