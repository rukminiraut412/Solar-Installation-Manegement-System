-- ==============================================================================
-- Migration: 107_complete_workflow.sql
-- Scope: Warehouse Quotations, System Settings, Notifications,
--        and End-to-End Workflow Gates & ID Tracking
-- ==============================================================================

-- 1. System Settings Table (Configurable Admin Technician Scheduling & Feature Flags)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value)
VALUES ('admin_technician_scheduling', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. System Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO',
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 3. Warehouse Quotations Table (Warehouse & Admin Owned)
CREATE TABLE IF NOT EXISTS warehouse_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    version INT NOT NULL DEFAULT 1,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    requirements_id UUID REFERENCES customer_installation_requirements(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    capacity_kw NUMERIC(4,2) NOT NULL DEFAULT 3.0,
    grid_type VARCHAR(20) NOT NULL DEFAULT 'On-Grid',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN (
            'DRAFT', 
            'SUBMITTED_TO_ADMIN', 
            'ADMIN_APPROVED', 
            'CHANGES_REQUESTED', 
            'REJECTED', 
            'SENT_TO_CUSTOMER', 
            'CUSTOMER_ACCEPTED', 
            'CUSTOMER_REVISION_REQUESTED', 
            'CUSTOMER_DECLINED'
        )),
    hardware_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    installation_labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_percent NUMERIC(5,2) NOT NULL DEFAULT 12.0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    admin_notes TEXT,
    customer_notes TEXT,
    declined_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wh_quotes_cust ON warehouse_quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_wh_quotes_req ON warehouse_quotations(requirements_id);
CREATE INDEX IF NOT EXISTS idx_wh_quotes_proj ON warehouse_quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_wh_quotes_status ON warehouse_quotations(status);

-- 4. Warehouse Quotation Items Table
CREATE TABLE IF NOT EXISTS warehouse_quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES warehouse_quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_serialized BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_wh_quote_items_qid ON warehouse_quotation_items(quotation_id);

-- 5. Extend projects with workflow gating fields
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS requirements_id UUID REFERENCES customer_installation_requirements(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES warehouse_quotations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) NOT NULL DEFAULT 'REQUIREMENTS_SUBMITTED',
    ADD COLUMN IF NOT EXISTS scheduled_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_date DATE,
    ADD COLUMN IF NOT EXISTS scheduled_time_slot VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_stock_reserved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_barcode_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_commissioned BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_warranty_active BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_req ON projects(requirements_id);
CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(workflow_stage);

-- 6. Extend orders with quotation and requirements references
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES warehouse_quotations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS requirements_id UUID REFERENCES customer_installation_requirements(id) ON DELETE SET NULL;
