-- Enhance communications_log table for Outlook add-in email logging
-- This adds columns needed for automatic email capture from the add-in

-- Add new columns for better email tracking
ALTER TABLE communications_log 
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_forward BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'outlook_addin', 'api', 'system'));

-- Add indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_communications_log_direction ON communications_log(direction);
CREATE INDEX IF NOT EXISTS idx_communications_log_recipient_email ON communications_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_communications_log_source ON communications_log(source);
CREATE INDEX IF NOT EXISTS idx_communications_log_is_reply ON communications_log(is_reply);
CREATE INDEX IF NOT EXISTS idx_communications_log_is_forward ON communications_log(is_forward);

-- Create a view for Outlook add-in email history
CREATE OR REPLACE VIEW outlook_email_history AS
SELECT 
  cl.id,
  cl.subject,
  cl.content,
  cl.recipient_email,
  cl.building_name,
  cl.leaseholder_name,
  cl.unit_number,
  cl.sent_at,
  cl.is_reply,
  cl.is_forward,
  cl.source,
  cl.status,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name
FROM communications_log cl
LEFT JOIN auth.users u ON cl.sent_by = u.id
WHERE cl.type = 'email' 
  AND cl.direction = 'outgoing'
  AND cl.source = 'outlook_addin'
ORDER BY cl.sent_at DESC;

-- Create a function to get email statistics by building
CREATE OR REPLACE FUNCTION get_building_email_stats(building_id_param UUID)
RETURNS TABLE (
  total_emails bigint,
  total_replies bigint,
  total_forwards bigint,
  unique_recipients bigint,
  last_email_date timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_emails,
    COUNT(CASE WHEN is_reply THEN 1 END) as total_replies,
    COUNT(CASE WHEN is_forward THEN 1 END) as total_forwards,
    COUNT(DISTINCT recipient_email) as unique_recipients,
    MAX(sent_at) as last_email_date
  FROM communications_log
  WHERE building_id = building_id_param
    AND type = 'email'
    AND direction = 'outgoing';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON outlook_email_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_building_email_stats(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN communications_log.direction IS 'Direction of communication: incoming or outgoing';
COMMENT ON COLUMN communications_log.recipient_email IS 'Email address of the recipient (for outgoing emails)';
COMMENT ON COLUMN communications_log.is_reply IS 'Whether this email is a reply to a previous email';
COMMENT ON COLUMN communications_log.is_forward IS 'Whether this email is a forward of a previous email';
COMMENT ON COLUMN communications_log.source IS 'Source of the communication: manual, outlook_addin, api, or system';
COMMENT ON VIEW outlook_email_history IS 'View of all emails sent via Outlook add-in with user and building context';
COMMENT ON FUNCTION get_building_email_stats(UUID) IS 'Get email statistics for a specific building';

-- Insert sample data for testing (optional)
INSERT INTO communications_log (
  type, 
  subject, 
  content, 
  sent_at, 
  sent_by, 
  building_name, 
  leaseholder_name, 
  status, 
  direction, 
  recipient_email, 
  is_reply, 
  is_forward, 
  source
) VALUES 
(
  'email',
  'Test Email from Outlook Add-in',
  'This is a test email sent via the BlocIQ Outlook add-in.',
  NOW(),
  (SELECT id FROM auth.users LIMIT 1),
  'Sample Building',
  'sample@example.com',
  'sent',
  'outgoing',
  'sample@example.com',
  false,
  false,
  'outlook_addin'
) ON CONFLICT DO NOTHING;
