-- BlocIQ Compliance Assets Seed Script
-- This script populates the compliance_assets table with comprehensive compliance requirements

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clear existing compliance assets (optional - comment out if you want to keep existing data)
-- DELETE FROM compliance_assets;

-- Insert compliance assets organized by category
INSERT INTO compliance_assets (id, name, description, category, created_at) VALUES
-- Legal & Safety
('ca-001', 'Fire Risk Assessment (FRA)', 'Comprehensive fire safety assessment of the building and its systems', 'Legal & Safety', NOW()),
('ca-002', 'Fire Safety Management Plan', 'Documented procedures for fire safety management and emergency response', 'Legal & Safety', NOW()),
('ca-003', 'Fire Alarm System Maintenance', 'Regular testing and maintenance of fire alarm and detection systems', 'Legal & Safety', NOW()),
('ca-004', 'Emergency Lighting Testing', 'Monthly testing and annual certification of emergency lighting systems', 'Legal & Safety', NOW()),
('ca-005', 'Fire Extinguisher Servicing', 'Annual servicing and certification of fire extinguishers', 'Legal & Safety', NOW()),
('ca-006', 'Fire Door Inspections', 'Quarterly inspections of fire doors and their self-closing mechanisms', 'Legal & Safety', NOW()),
('ca-007', 'Fire Safety Training', 'Annual fire safety training for staff and residents', 'Legal & Safety', NOW()),
('ca-008', 'Fire Safety Signage', 'Maintenance and compliance of fire safety signs and notices', 'Legal & Safety', NOW()),

-- Structural & Condition
('ca-009', 'Building Condition Survey', 'Comprehensive assessment of building structure and condition', 'Structural & Condition', NOW()),
('ca-010', 'Roof Inspections', 'Annual inspection of roof condition and waterproofing', 'Structural & Condition', NOW()),
('ca-011', 'External Wall Inspections', 'Regular inspection of external walls and cladding systems', 'Structural & Condition', NOW()),
('ca-012', 'Drainage System Maintenance', 'Regular cleaning and inspection of drainage systems', 'Structural & Condition', NOW()),
('ca-013', 'Window and Door Inspections', 'Annual inspection of windows, doors and their security features', 'Structural & Condition', NOW()),
('ca-014', 'Pavement and Hardstanding', 'Regular inspection of external paving and hardstanding areas', 'Structural & Condition', NOW()),
('ca-015', 'Boundary Fencing', 'Inspection and maintenance of boundary fencing and gates', 'Structural & Condition', NOW()),

-- Operational & Contracts
('ca-016', 'Lift Maintenance Contract', 'Regular maintenance and safety inspections of passenger lifts', 'Operational & Contracts', NOW()),
('ca-017', 'Heating System Maintenance', 'Annual servicing and maintenance of central heating systems', 'Operational & Contracts', NOW()),
('ca-018', 'Hot Water System Maintenance', 'Regular maintenance of hot water systems and temperature monitoring', 'Operational & Contracts', NOW()),
('ca-019', 'Ventilation System Maintenance', 'Maintenance of mechanical ventilation and air conditioning systems', 'Operational & Contracts', NOW()),
('ca-020', 'Cleaning Contract Management', 'Management of cleaning contracts and service standards', 'Operational & Contracts', NOW()),
('ca-021', 'Waste Management Contract', 'Management of waste collection and recycling services', 'Operational & Contracts', NOW()),
('ca-022', 'Security System Maintenance', 'Maintenance of CCTV, access control and security systems', 'Operational & Contracts', NOW()),
('ca-023', 'Landscaping Maintenance', 'Regular maintenance of gardens and landscaping', 'Operational & Contracts', NOW()),

-- Insurance
('ca-024', 'Building Insurance', 'Comprehensive building insurance with adequate coverage', 'Insurance', NOW()),
('ca-025', 'Public Liability Insurance', 'Public liability insurance for common areas and operations', 'Insurance', NOW()),
('ca-026', 'Employers Liability Insurance', 'Insurance coverage for staff and contractors', 'Insurance', NOW()),
('ca-027', 'Directors & Officers Insurance', 'D&O insurance for board members and officers', 'Insurance', NOW()),
('ca-028', 'Professional Indemnity Insurance', 'Professional indemnity coverage for management services', 'Insurance', NOW()),
('ca-029', 'Cyber Insurance', 'Insurance coverage for cyber risks and data protection', 'Insurance', NOW()),

-- Lease & Documentation
('ca-030', 'Lease Compliance Review', 'Annual review of lease compliance and obligations', 'Lease & Documentation', NOW()),
('ca-031', 'Service Charge Budget', 'Annual preparation and distribution of service charge budgets', 'Lease & Documentation', NOW()),
('ca-032', 'Service Charge Accounts', 'Annual preparation and certification of service charge accounts', 'Lease & Documentation', NOW()),
('ca-033', 'Section 20 Consultation', 'Consultation process for major works and long-term agreements', 'Lease & Documentation', NOW()),
('ca-034', 'Ground Rent Collection', 'Collection and accounting of ground rent payments', 'Lease & Documentation', NOW()),
('ca-035', 'Leaseholder Communication', 'Regular communication with leaseholders on building matters', 'Lease & Documentation', NOW()),
('ca-036', 'Dispute Resolution', 'Management of leaseholder disputes and complaints', 'Lease & Documentation', NOW()),

-- Admin
('ca-037', 'Annual General Meeting', 'Annual general meeting of leaseholders', 'Admin', NOW()),
('ca-038', 'Board Meeting Minutes', 'Regular board meetings and minute keeping', 'Admin', NOW()),
('ca-039', 'Financial Reporting', 'Monthly financial reporting and budget monitoring', 'Admin', NOW()),
('ca-040', 'Contractor Management', 'Management of contractor relationships and performance', 'Admin', NOW()),
('ca-041', 'Health & Safety Policy', 'Health and safety policy and risk assessments', 'Admin', NOW()),
('ca-042', 'Data Protection Compliance', 'GDPR compliance and data protection measures', 'Admin', NOW()),
('ca-043', 'Complaints Procedure', 'Formal complaints procedure and handling', 'Admin', NOW()),

-- Smart Records
('ca-044', 'Digital Document Management', 'Digital storage and management of compliance documents', 'Smart Records', NOW()),
('ca-045', 'Building Management System', 'Monitoring and control of building systems', 'Smart Records', NOW()),
('ca-046', 'Energy Monitoring', 'Real-time energy consumption monitoring and reporting', 'Smart Records', NOW()),
('ca-047', 'Smart Metering', 'Smart metering systems for utilities', 'Smart Records', NOW()),
('ca-048', 'Digital Access Control', 'Digital access control and visitor management', 'Smart Records', NOW()),
('ca-049', 'IoT Sensor Monitoring', 'Internet of Things sensor monitoring for building systems', 'Smart Records', NOW()),
('ca-050', 'Predictive Maintenance', 'Predictive maintenance systems and analytics', 'Smart Records', NOW()),

-- Safety (BSA-specific)
('ca-051', 'Asbestos Management Survey', 'Asbestos survey and management plan', 'Safety', NOW()),
('ca-052', 'Asbestos Re-inspection', 'Annual re-inspection of asbestos-containing materials', 'Safety', NOW()),
('ca-053', 'Legionella Risk Assessment', 'Legionella risk assessment and water system management', 'Safety', NOW()),
('ca-054', 'Gas Safety Certificate', 'Annual gas safety inspection and certification', 'Safety', NOW()),
('ca-055', 'Electrical Installation Condition Report (EICR)', 'Periodic inspection of electrical installations', 'Safety', NOW()),
('ca-056', 'Portable Appliance Testing (PAT)', 'Annual testing of portable electrical appliances', 'Safety', NOW()),
('ca-057', 'Working at Height Risk Assessment', 'Risk assessment for working at height activities', 'Safety', NOW()),
('ca-058', 'Confined Space Risk Assessment', 'Risk assessment for confined space work', 'Safety', NOW()),
('ca-059', 'Manual Handling Risk Assessment', 'Risk assessment for manual handling activities', 'Safety', NOW()),
('ca-060', 'Noise Risk Assessment', 'Assessment of noise levels and hearing protection', 'Safety', NOW()),
('ca-061', 'Vibration Risk Assessment', 'Assessment of hand-arm and whole-body vibration', 'Safety', NOW()),
('ca-062', 'Display Screen Equipment Assessment', 'DSE assessment for office workstations', 'Safety', NOW()),
('ca-063', 'First Aid Provision', 'First aid provision and training', 'Safety', NOW()),
('ca-064', 'Accident Reporting', 'Accident reporting and investigation procedures', 'Safety', NOW()),
('ca-065', 'Emergency Procedures', 'Emergency procedures and evacuation plans', 'Safety', NOW()),
('ca-066', 'Security Risk Assessment', 'Security risk assessment and measures', 'Safety', NOW()),
('ca-067', 'Environmental Risk Assessment', 'Environmental risk assessment and management', 'Safety', NOW()),
('ca-068', 'Sustainability Reporting', 'Environmental sustainability reporting and targets', 'Safety', NOW()),
('ca-069', 'Energy Performance Certificate (EPC)', 'Energy performance assessment and certification', 'Safety', NOW()),
('ca-070', 'Carbon Reduction Plan', 'Carbon reduction strategy and implementation', 'Safety', NOW())

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  created_at = EXCLUDED.created_at;

-- Verification query
SELECT 
  category,
  COUNT(*) as asset_count
FROM compliance_assets 
GROUP BY category 
ORDER BY category;

-- Show total count
SELECT COUNT(*) as total_compliance_assets FROM compliance_assets; 