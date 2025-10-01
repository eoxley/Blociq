-- RLS Policies for Accounting Reminders
-- Ensures proper access control for reminder and period management

-- Enable RLS on new tables
ALTER TABLE accounting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_history ENABLE ROW LEVEL SECURITY;

-- Accounting Reminders - scoped by building
CREATE POLICY "accounting_reminders_read" ON accounting_reminders
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = accounting_reminders.building_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "accounting_reminders_write" ON accounting_reminders
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.building_id = accounting_reminders.building_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );

-- Reminder Templates - readable by all authenticated users
CREATE POLICY "reminder_templates_read" ON reminder_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "reminder_templates_write" ON reminder_templates
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM user_buildings ub
            WHERE ub.user_id = auth.uid()
            AND ub.role = 'owner'
        )
    );

-- Reminder History - scoped by reminder building
CREATE POLICY "reminder_history_read" ON reminder_history
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM accounting_reminders ar
            JOIN user_buildings ub ON ub.building_id = ar.building_id
            WHERE ar.id = reminder_history.reminder_id
            AND ub.user_id = auth.uid()
        )
    );

CREATE POLICY "reminder_history_write" ON reminder_history
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM accounting_reminders ar
            JOIN user_buildings ub ON ub.building_id = ar.building_id
            WHERE ar.id = reminder_history.reminder_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'manager')
        )
    );




