-- Create building_tasks table
CREATE TABLE IF NOT EXISTS building_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    due_date DATE,
    assigned_to TEXT, -- email or user_id
    status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Complete')),
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    notes TEXT
);

-- Create site_inspections table
CREATE TABLE IF NOT EXISTS site_inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    inspected_by TEXT NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inspection_items table
CREATE TABLE IF NOT EXISTS inspection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inspection_id UUID NOT NULL REFERENCES site_inspections(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Not Inspected' CHECK (status IN ('OK', 'Issue Found', 'Not Inspected', 'Needs Attention')),
    notes TEXT,
    location TEXT,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_building_tasks_building_id ON building_tasks(building_id);
CREATE INDEX IF NOT EXISTS idx_building_tasks_status ON building_tasks(status);
CREATE INDEX IF NOT EXISTS idx_building_tasks_due_date ON building_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_building_tasks_assigned_to ON building_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_site_inspections_building_id ON site_inspections(building_id);
CREATE INDEX IF NOT EXISTS idx_site_inspections_date ON site_inspections(inspection_date);

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_status ON inspection_items(status);

-- Enable Row Level Security
ALTER TABLE building_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for building_tasks
CREATE POLICY "Users can view tasks for buildings they have access to" ON building_tasks
    FOR SELECT USING (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = building_tasks.building_id
        )
    );

CREATE POLICY "Users can insert tasks for buildings they have access to" ON building_tasks
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = building_tasks.building_id
        )
    );

CREATE POLICY "Users can update tasks for buildings they have access to" ON building_tasks
    FOR UPDATE USING (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = building_tasks.building_id
        )
    );

CREATE POLICY "Users can delete tasks for buildings they have access to" ON building_tasks
    FOR DELETE USING (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = building_tasks.building_id
        )
    );

-- RLS Policies for site_inspections
CREATE POLICY "Users can view inspections for buildings they have access to" ON site_inspections
    FOR SELECT USING (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = site_inspections.building_id
        )
    );

CREATE POLICY "Users can insert inspections for buildings they have access to" ON site_inspections
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = site_inspections.building_id
        )
    );

CREATE POLICY "Users can update inspections for buildings they have access to" ON site_inspections
    FOR UPDATE USING (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = site_inspections.building_id
        )
    );

CREATE POLICY "Users can delete inspections for buildings they have access to" ON site_inspections
    FOR DELETE USING (
        building_id IN (
            SELECT id FROM buildings 
            WHERE id = site_inspections.building_id
        )
    );

-- RLS Policies for inspection_items
CREATE POLICY "Users can view inspection items for inspections they have access to" ON inspection_items
    FOR SELECT USING (
        inspection_id IN (
            SELECT id FROM site_inspections 
            WHERE id = inspection_items.inspection_id
        )
    );

CREATE POLICY "Users can insert inspection items for inspections they have access to" ON inspection_items
    FOR INSERT WITH CHECK (
        inspection_id IN (
            SELECT id FROM site_inspections 
            WHERE id = inspection_items.inspection_id
        )
    );

CREATE POLICY "Users can update inspection items for inspections they have access to" ON inspection_items
    FOR UPDATE USING (
        inspection_id IN (
            SELECT id FROM site_inspections 
            WHERE id = inspection_items.inspection_id
        )
    );

CREATE POLICY "Users can delete inspection items for inspections they have access to" ON inspection_items
    FOR DELETE USING (
        inspection_id IN (
            SELECT id FROM site_inspections 
            WHERE id = inspection_items.inspection_id
        )
    );

-- Create function to auto-generate inspection items from compliance assets
CREATE OR REPLACE FUNCTION generate_inspection_items(inspection_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO inspection_items (inspection_id, asset_type, asset_name, location, priority)
    SELECT 
        inspection_id,
        ca.asset_type,
        ca.name,
        COALESCE(ca.location, 'General'),
        CASE 
            WHEN ca.asset_type IN ('Fire Alarm', 'Emergency Lighting', 'Fire Extinguishers') THEN 'Critical'
            WHEN ca.asset_type IN ('Lifts', 'HVAC', 'Electrical') THEN 'High'
            ELSE 'Medium'
        END as priority
    FROM compliance_assets ca
    INNER JOIN site_inspections si ON ca.building_id = si.building_id
    WHERE si.id = inspection_id
    AND ca.status = 'Active';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate inspection items when inspection is created
CREATE OR REPLACE FUNCTION trigger_generate_inspection_items()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM generate_inspection_items(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_inspection_items
    AFTER INSERT ON site_inspections
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_inspection_items();

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_building_tasks_updated_at
    BEFORE UPDATE ON building_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_inspections_updated_at
    BEFORE UPDATE ON site_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at
    BEFORE UPDATE ON inspection_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 