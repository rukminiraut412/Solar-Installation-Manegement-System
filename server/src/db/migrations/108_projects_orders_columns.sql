-- Migration 108: Harmonize project_code/project_number and order columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code VARCHAR(50);
UPDATE projects SET project_code = project_number WHERE project_code IS NULL AND project_number IS NOT NULL;
UPDATE projects SET project_number = project_code WHERE project_number IS NULL AND project_code IS NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
