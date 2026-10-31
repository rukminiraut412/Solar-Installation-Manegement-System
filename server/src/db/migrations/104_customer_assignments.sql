-- ==============================================================================
-- Migration: 104_customer_assignments.sql
-- Scope: Customer Team Assignments, Dynamic Role Task Distribution & Scoping
-- Authority: SOLAR_MANAGEMENT_SYSTEM.md
-- ==============================================================================

-- 1. Extend Customers table with assignment and detailed solar requirement columns
ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS installation_location TEXT,
    ADD COLUMN IF NOT EXISTS solar_requirement VARCHAR(100) DEFAULT 'On-Grid Solar System',
    ADD COLUMN IF NOT EXISTS required_capacity_kw NUMERIC(6,2) DEFAULT 3.0,
    ADD COLUMN IF NOT EXISTS additional_notes TEXT,
    ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(50) DEFAULT 'PENDING_ASSIGNMENT',
    ADD COLUMN IF NOT EXISTS assigned_seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_warehouse_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_support_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- 2. Indexes for strict role-based scoping and performant dashboard queries
CREATE INDEX IF NOT EXISTS idx_customers_assigned_seller ON customers(assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_technician ON customers(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_warehouse ON customers(assigned_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_support ON customers(assigned_support_id);
CREATE INDEX IF NOT EXISTS idx_customers_assignment_status ON customers(assignment_status);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- 3. Customer Team Assignments History Table (Audit Log of Team Assignment Actions)
CREATE TABLE IF NOT EXISTS customer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES users(id) ON DELETE SET NULL,
    support_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignment_notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_assign_customer_id ON customer_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_assign_assigned_at ON customer_assignments(assigned_at);
