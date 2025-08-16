-- Add HRB-specific compliance assets
-- These are Building Safety Act requirements for Higher Risk Buildings

insert into public.compliance_assets (title, category, description, frequency_months) values
  ('Building Safety Case', 'HRB - Building Safety', 'Building Safety Case as required under Building Safety Act', 12),
  ('Safety Case Report', 'HRB - Building Safety', 'Annual Safety Case Report submission', 12),
  ('Mandatory Occurrence Reporting', 'HRB - Building Safety', 'Reporting of safety occurrences to BSR', 1),
  ('Building Information File', 'HRB - Documentation', 'Maintenance of Building Information File', 12),
  ('Resident Engagement Strategy', 'HRB - Engagement', 'Strategy for resident engagement in building safety', 12),
  ('Accountable Person Registration', 'HRB - Registration', 'Registration with Building Safety Regulator', 12),
  ('Building Assessment Certificate', 'HRB - Certification', 'Building Assessment Certificate from BSR', 60),
  ('Fire Safety Information', 'HRB - Fire Safety', 'Enhanced fire safety information for HRBs', 6),
  ('Structural Safety Assessment', 'HRB - Structural', 'Enhanced structural safety assessments', 12),
  ('Fire and Emergency File', 'HRB - Documentation', 'Fire and emergency file maintenance', 6)
on conflict do nothing;
