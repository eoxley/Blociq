-- ========================================
-- CREATE EMAIL ATTACHMENTS TABLE
-- Date: 2025-01-15
-- Description: Table to store email attachments for inline image support
-- ========================================

-- Create email_attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES incoming_emails(id) ON DELETE CASCADE,
  content_id VARCHAR(255) NOT NULL,
  content_bytes TEXT NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  name VARCHAR(255),
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_content_id ON email_attachments(content_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_created_at ON email_attachments(created_at);

-- Enable RLS
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view attachments for their emails" ON email_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM incoming_emails 
      WHERE incoming_emails.id = email_attachments.email_id 
      AND incoming_emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for their emails" ON email_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM incoming_emails 
      WHERE incoming_emails.id = email_attachments.email_id 
      AND incoming_emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments for their emails" ON email_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM incoming_emails 
      WHERE incoming_emails.id = email_attachments.email_id 
      AND incoming_emails.user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE email_attachments IS 'Stores email attachments for inline image support';
COMMENT ON COLUMN email_attachments.content_id IS 'Content-ID from email (e.g., image001.png@01D9...)';
COMMENT ON COLUMN email_attachments.content_bytes IS 'Base64 encoded content of the attachment';
COMMENT ON COLUMN email_attachments.content_type IS 'MIME type of the attachment (e.g., image/png)'; 