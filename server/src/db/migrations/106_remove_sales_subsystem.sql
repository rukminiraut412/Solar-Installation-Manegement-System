-- ==============================================================================
-- Migration: 106_remove_sales_subsystem.sql
-- Scope: Remove Sales Subsystem Tables and Constraints
-- Preserves: customers, customer_timeline, customer_assignments, customer_installation_requirements,
--            orders, projects, project_bom_items, users, inventory, support_finance
-- ==============================================================================

-- 1. Remove Foreign Key constraint from orders to quotations so orders can exist independently
DO $$ BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_quotation_id_fkey;
    ALTER TABLE orders ALTER COLUMN quotation_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Drop Sales-Specific Tables (Cascade drops related triggers/indexes)
DROP TABLE IF EXISTS survey_photos CASCADE;
DROP TABLE IF EXISTS site_surveys CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS enquiry_follow_ups CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
