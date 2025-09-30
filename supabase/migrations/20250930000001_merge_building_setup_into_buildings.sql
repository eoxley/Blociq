-- Merge building_setup fields into buildings table
-- Migration: 20250930000001_merge_building_setup_into_buildings.sql

-- Add building setup columns directly to buildings table
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS structure_type VARCHAR(50) CHECK (structure_type IN ('Freehold', 'RMC', 'Tripartite', 'RTM', 'Leasehold')),
ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) CHECK (client_type IN ('Freeholder Company', 'Board of Directors', 'Management Company')),
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS operational_notes TEXT;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_buildings_structure_type ON public.buildings(structure_type);
CREATE INDEX IF NOT EXISTS idx_buildings_client_name ON public.buildings(client_name);

-- Add comments
COMMENT ON COLUMN public.buildings.structure_type IS 'Building ownership structure (Freehold, RMC, Tripartite, RTM, Leasehold)';
COMMENT ON COLUMN public.buildings.client_type IS 'Type of client managing the building (Freeholder Company, Board of Directors, Management Company)';
COMMENT ON COLUMN public.buildings.client_name IS 'Client or management company name';
COMMENT ON COLUMN public.buildings.client_contact IS 'Primary contact person for the client';
COMMENT ON COLUMN public.buildings.client_email IS 'Client contact email address';
COMMENT ON COLUMN public.buildings.operational_notes IS 'Operational notes and procedures for building management';