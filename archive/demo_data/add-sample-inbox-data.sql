-- Add sample data to incoming_emails table for testing inbox overview
-- This ensures the dashboard shows live data even without Outlook connection

-- First, ensure the table has the right structure
ALTER TABLE incoming_emails 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'low',
ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS mentioned_properties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS suggested_actions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_tag VARCHAR(100) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS triage_category VARCHAR(100) DEFAULT 'General';

-- Add sample emails for testing
INSERT INTO incoming_emails (
  user_id,
  from_email,
  subject,
  body_preview,
  received_at,
  unread,
  handled,
  urgency_level,
  urgency_score,
  mentioned_properties,
  ai_insights,
  suggested_actions,
  ai_tag,
  triage_category,
  building_id,
  is_deleted
) VALUES 
-- High priority emails
(
  (SELECT id FROM auth.users LIMIT 1), -- Use first user
  'urgent@tenant.com',
  'URGENT: Water leak in Flat 8',
  'There is a significant water leak coming from the ceiling in Flat 8. Water is dripping onto electrical outlets. This needs immediate attention.',
  NOW() - INTERVAL '2 hours',
  true,
  false,
  'critical',
  9,
  ARRAY['Ashwood House'],
  '[{"type": "safety", "priority": "critical", "summary": "Water leak near electrical outlets - safety risk"}]',
  '[{"action": "Emergency plumber", "priority": "critical"}]',
  'Emergency',
  'Maintenance',
  (SELECT id FROM buildings LIMIT 1),
  false
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'complaint@tenant.com',
  'Noise complaint - Flat 5',
  'Excessive noise from Flat 5 every night after 11pm. Music and loud conversations are disturbing other residents.',
  NOW() - INTERVAL '1 day',
  true,
  false,
  'high',
  7,
  ARRAY['Ashwood House'],
  '[{"type": "complaint", "priority": "high", "summary": "Noise complaint requiring investigation"}]',
  '[{"action": "Send warning letter", "priority": "high"}]',
  'Complaint',
  'Leaseholder Relations',
  (SELECT id FROM buildings LIMIT 1),
  false
),
-- Medium priority emails
(
  (SELECT id FROM auth.users LIMIT 1),
  'maintenance@tenant.com',
  'Heating not working - Flat 3',
  'The heating system in Flat 3 has not been working for 3 days. It is getting quite cold.',
  NOW() - INTERVAL '3 days',
  false,
  true,
  'medium',
  5,
  ARRAY['Ashwood House'],
  '[{"type": "maintenance", "priority": "medium", "summary": "Heating system failure"}]',
  '[{"action": "Schedule heating repair", "priority": "medium"}]',
  'Maintenance',
  'Maintenance & Repairs',
  (SELECT id FROM buildings LIMIT 1),
  false
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'service@tenant.com',
  'Service charge query - Flat 7',
  'I have received my service charge statement and would like clarification on the recent increase.',
  NOW() - INTERVAL '4 days',
  false,
  true,
  'low',
  3,
  ARRAY['Ashwood House'],
  '[{"type": "query", "priority": "low", "summary": "Service charge clarification request"}]',
  '[{"action": "Provide detailed breakdown", "priority": "low"}]',
  'Financial',
  'Financial Management',
  (SELECT id FROM buildings LIMIT 1),
  false
),
-- More recent emails
(
  (SELECT id FROM auth.users LIMIT 1),
  'repair@tenant.com',
  'Window repair needed - Flat 2',
  'The window in the bedroom of Flat 2 is stuck and cannot be opened. This is affecting ventilation.',
  NOW() - INTERVAL '6 hours',
  true,
  false,
  'medium',
  4,
  ARRAY['Ashwood House'],
  '[{"type": "repair", "priority": "medium", "summary": "Window mechanism failure"}]',
  '[{"action": "Arrange window repair", "priority": "medium"}]',
  'Repairs',
  'Maintenance & Repairs',
  (SELECT id FROM buildings LIMIT 1),
  false
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'access@tenant.com',
  'Key fob not working - Flat 9',
  'My key fob stopped working yesterday. I cannot access the building or my flat.',
  NOW() - INTERVAL '1 day',
  true,
  false,
  'high',
  6,
  ARRAY['Ashwood House'],
  '[{"type": "access", "priority": "high", "summary": "Key fob access issue"}]',
  '[{"action": "Issue replacement key fob", "priority": "high"}]',
  'Access',
  'Property Management',
  (SELECT id FROM buildings LIMIT 1),
  false
),
-- Older handled emails
(
  (SELECT id FROM auth.users LIMIT 1),
  'resolved@tenant.com',
  'Lift repair completed - Building',
  'Thank you for the prompt repair of the lift. It is now working perfectly.',
  NOW() - INTERVAL '1 week',
  false,
  true,
  'low',
  2,
  ARRAY['Ashwood House'],
  '[{"type": "feedback", "priority": "low", "summary": "Positive feedback on lift repair"}]',
  '[]',
  'Feedback',
  'Maintenance & Repairs',
  (SELECT id FROM buildings LIMIT 1),
  false
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'compliance@tenant.com',
  'Fire safety inspection scheduled',
  'The annual fire safety inspection has been scheduled for next Tuesday. Please ensure all common areas are accessible.',
  NOW() - INTERVAL '2 days',
  false,
  true,
  'medium',
  5,
  ARRAY['Ashwood House'],
  '[{"type": "compliance", "priority": "medium", "summary": "Fire safety inspection notification"}]',
  '[{"action": "Prepare building for inspection", "priority": "medium"}]',
  'Compliance',
  'Compliance & Regulations',
  (SELECT id FROM buildings LIMIT 1),
  false
),
-- Recent unread emails
(
  (SELECT id FROM auth.users LIMIT 1),
  'new@tenant.com',
  'New tenant moving in - Flat 4',
  'I will be moving into Flat 4 next week. What do I need to know about the building?',
  NOW() - INTERVAL '30 minutes',
  true,
  false,
  'low',
  3,
  ARRAY['Ashwood House'],
  '[{"type": "welcome", "priority": "low", "summary": "New tenant welcome inquiry"}]',
  '[{"action": "Send welcome pack", "priority": "low"}]',
  'Welcome',
  'Leaseholder Relations',
  (SELECT id FROM buildings LIMIT 1),
  false
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'payment@tenant.com',
  'Service charge payment confirmation',
  'I have just made my quarterly service charge payment. Please confirm receipt.',
  NOW() - INTERVAL '1 hour',
  true,
  false,
  'low',
  2,
  ARRAY['Ashwood House'],
  '[{"type": "payment", "priority": "low", "summary": "Service charge payment confirmation"}]',
  '[{"action": "Send payment receipt", "priority": "low"}]',
  'Payment',
  'Financial Management',
  (SELECT id FROM buildings LIMIT 1),
  false
);

-- Update the user_id for all emails to match the current user
-- This ensures the RLS policies work correctly
UPDATE incoming_emails 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_user_id ON incoming_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_urgency_level ON incoming_emails(urgency_level);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_ai_tag ON incoming_emails(ai_tag);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_triage_category ON incoming_emails(triage_category);

-- Add RLS policy for user access
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own emails" ON incoming_emails;

-- Create new policy for user access
CREATE POLICY "Users can view their own emails" ON incoming_emails
  FOR ALL USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON incoming_emails TO authenticated;
GRANT ALL ON incoming_emails TO service_role;
