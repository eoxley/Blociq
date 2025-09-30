-- Add client, type, and companies house number columns to buildings table
-- Migration: 20250930000000_add_client_type_companies_house.sql

-- Add new columns for client information
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS client TEXT,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS companies_house_number TEXT;

-- Add index for client lookup
CREATE INDEX IF NOT EXISTS idx_buildings_client ON public.buildings(client);

-- Add index for companies house number
CREATE INDEX IF NOT EXISTS idx_buildings_companies_house_number ON public.buildings(companies_house_number);

-- Add comments
COMMENT ON COLUMN public.buildings.client IS 'Client name (e.g., management company name)';
COMMENT ON COLUMN public.buildings.type IS 'Building ownership type (RMC, RTM, Freehold, Leasehold)';
COMMENT ON COLUMN public.buildings.companies_house_number IS 'Companies House registration number for RMC/RTM';