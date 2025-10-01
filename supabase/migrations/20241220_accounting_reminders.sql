-- Accounting Periods and Reminders Migration
-- Adds comprehensive budget tracking and reminder scheduling

-- Accounting Periods (already exists, but let's enhance it)
-- This table was created in the previous migration, but let's add more fields
ALTER TABLE accounting_periods 
ADD COLUMN period_type text CHECK (period_type IN ('budget', 'year_end', 'audit', 'quarterly', 'monthly')) DEFAULT 'year_end',
ADD COLUMN status text CHECK (status IN ('upcoming', 'current', 'completed', 'overdue')) DEFAULT 'upcoming',
ADD COLUMN reminder_sent boolean DEFAULT false,
ADD COLUMN completion_date date,
ADD COLUMN notes text;

-- Accounting Reminders table
CREATE TABLE accounting_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES buildings(id),
    period_id uuid REFERENCES accounting_periods(id),
    reminder_type text NOT NULL CHECK (reminder_type IN ('budget_approval', 'year_end', 'audit', 'quarterly_review', 'monthly_close')),
    due_date date NOT NULL,
    reminder_days int NOT NULL CHECK (reminder_days IN (90, 60, 30, 14, 7, 1)),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'completed', 'overdue')),
    title text NOT NULL,
    description text,
    priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    sent_at timestamptz,
    acknowledged_at timestamptz,
    completed_at timestamptz,
    notes text
);

-- Reminder Templates table
CREATE TABLE reminder_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_type text NOT NULL UNIQUE,
    title_template text NOT NULL,
    description_template text NOT NULL,
    days_before_due int[] NOT NULL DEFAULT ARRAY[90, 60, 30, 14, 7, 1],
    priority text NOT NULL DEFAULT 'medium',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Reminder History table
CREATE TABLE reminder_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id uuid NOT NULL REFERENCES accounting_reminders(id),
    action text NOT NULL CHECK (action IN ('created', 'sent', 'acknowledged', 'completed', 'overdue', 'updated')),
    actor uuid REFERENCES auth.users(id),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_accounting_periods_building ON accounting_periods(building_id);
CREATE INDEX idx_accounting_periods_type ON accounting_periods(period_type);
CREATE INDEX idx_accounting_periods_status ON accounting_periods(status);
CREATE INDEX idx_accounting_reminders_building ON accounting_reminders(building_id);
CREATE INDEX idx_accounting_reminders_due_date ON accounting_reminders(due_date);
CREATE INDEX idx_accounting_reminders_status ON accounting_reminders(status);
CREATE INDEX idx_accounting_reminders_type ON accounting_reminders(reminder_type);
CREATE INDEX idx_reminder_history_reminder ON reminder_history(reminder_id);

-- Function to create standard accounting periods for a building
CREATE OR REPLACE FUNCTION create_standard_accounting_periods(building_uuid uuid, year int)
RETURNS void AS $$
DECLARE
    current_year int := COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
    -- Budget approval period (due Jan 31st of following year)
    INSERT INTO accounting_periods (building_id, period_name, locked_before, period_type, due_date)
    VALUES (
        building_uuid,
        'Budget Approval ' || (current_year + 1),
        (current_year + 1) || '-01-31',
        'budget',
        (current_year + 1) || '-01-31'
    );

    -- Year-end accounts period (due Dec 31st)
    INSERT INTO accounting_periods (building_id, period_name, locked_before, period_type, due_date)
    VALUES (
        building_uuid,
        'Year End Accounts ' || current_year,
        current_year || '-12-31',
        'year_end',
        current_year || '-12-31'
    );

    -- Audit period (due Mar 31st of following year)
    INSERT INTO accounting_periods (building_id, period_name, locked_before, period_type, due_date)
    VALUES (
        building_uuid,
        'Annual Audit ' || (current_year + 1),
        (current_year + 1) || '-03-31',
        'audit',
        (current_year + 1) || '-03-31'
    );

    -- Quarterly periods
    INSERT INTO accounting_periods (building_id, period_name, locked_before, period_type, due_date)
    VALUES 
        (building_uuid, 'Q1 ' || current_year, current_year || '-03-31', 'quarterly', current_year || '-03-31'),
        (building_uuid, 'Q2 ' || current_year, current_year || '-06-30', 'quarterly', current_year || '-06-30'),
        (building_uuid, 'Q3 ' || current_year, current_year || '-09-30', 'quarterly', current_year || '-09-30'),
        (building_uuid, 'Q4 ' || current_year, current_year || '-12-31', 'quarterly', current_year || '-12-31');
END;
$$ LANGUAGE plpgsql;

-- Function to generate reminders for a period
CREATE OR REPLACE FUNCTION generate_reminders_for_period(period_uuid uuid)
RETURNS void AS $$
DECLARE
    period_record record;
    template_record record;
    reminder_days int;
    due_date date;
BEGIN
    -- Get period details
    SELECT * INTO period_record
    FROM accounting_periods
    WHERE id = period_uuid;

    -- Get template for this period type
    SELECT * INTO template_record
    FROM reminder_templates
    WHERE reminder_type = period_record.period_type
    AND is_active = true;

    IF template_record IS NULL THEN
        RETURN;
    END IF;

    -- Generate reminders for each day interval
    FOREACH reminder_days IN ARRAY template_record.days_before_due
    LOOP
        due_date := period_record.locked_before - INTERVAL '1 day' * reminder_days;
        
        -- Only create future reminders
        IF due_date >= CURRENT_DATE THEN
            INSERT INTO accounting_reminders (
                building_id,
                period_id,
                reminder_type,
                due_date,
                reminder_days,
                title,
                description,
                priority
            ) VALUES (
                period_record.building_id,
                period_uuid,
                period_record.period_type,
                due_date,
                reminder_days,
                replace(template_record.title_template, '{period_name}', period_record.period_name),
                replace(template_record.description_template, '{period_name}', period_record.period_name),
                template_record.priority
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming reminders for a building
CREATE OR REPLACE FUNCTION get_upcoming_reminders(building_uuid uuid, days_ahead int DEFAULT 30)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    due_date date,
    reminder_days int,
    status text,
    priority text,
    period_name text,
    days_until_due int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.id,
        ar.title,
        ar.description,
        ar.due_date,
        ar.reminder_days,
        ar.status,
        ar.priority,
        ap.period_name,
        EXTRACT(DAYS FROM (ar.due_date - CURRENT_DATE))::int as days_until_due
    FROM accounting_reminders ar
    LEFT JOIN accounting_periods ap ON ap.id = ar.period_id
    WHERE ar.building_id = building_uuid
    AND ar.due_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND ar.status IN ('pending', 'sent', 'acknowledged')
    ORDER BY ar.due_date ASC, ar.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update reminder status
CREATE OR REPLACE FUNCTION update_reminder_status(
    reminder_uuid uuid,
    new_status text,
    actor_uuid uuid DEFAULT NULL,
    notes_text text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    old_status text;
BEGIN
    -- Get current status
    SELECT status INTO old_status
    FROM accounting_reminders
    WHERE id = reminder_uuid;

    -- Update reminder
    UPDATE accounting_reminders
    SET 
        status = new_status,
        sent_at = CASE WHEN new_status = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END,
        acknowledged_at = CASE WHEN new_status = 'acknowledged' THEN COALESCE(acknowledged_at, NOW()) ELSE acknowledged_at END,
        completed_at = CASE WHEN new_status = 'completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
        notes = COALESCE(notes_text, notes)
    WHERE id = reminder_uuid;

    -- Log history
    INSERT INTO reminder_history (reminder_id, action, actor, notes)
    VALUES (reminder_uuid, new_status, actor_uuid, notes_text);

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Insert default reminder templates
INSERT INTO reminder_templates (reminder_type, title_template, description_template, days_before_due, priority) VALUES
('budget', 'Budget Approval Due: {period_name}', 'The budget approval for {period_name} is due. Please review and approve the annual budget.', ARRAY[90, 60, 30, 14, 7], 'high'),
('year_end', 'Year-End Accounts Due: {period_name}', 'Year-end accounts for {period_name} must be prepared and submitted. This includes financial statements and supporting documentation.', ARRAY[90, 60, 30, 14, 7], 'critical'),
('audit', 'Annual Audit Due: {period_name}', 'The annual audit for {period_name} is scheduled. Please ensure all documentation is ready for the auditor.', ARRAY[90, 60, 30, 14, 7], 'high'),
('quarterly', 'Quarterly Review Due: {period_name}', 'Quarterly financial review for {period_name} is due. Please complete the quarterly reporting requirements.', ARRAY[30, 14, 7, 1], 'medium'),
('monthly', 'Monthly Close Due: {period_name}', 'Monthly accounting close for {period_name} is due. Please complete all month-end procedures.', ARRAY[7, 3, 1], 'low');




