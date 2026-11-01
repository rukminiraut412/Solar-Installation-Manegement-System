-- ==============================================================================
-- Migration: 105_customer_portal_workflow.sql
-- Scope: Customer Role, User Binding, Comprehensive Installation Requirements Form,
--        and Requirements-to-Quotation Linking
-- Authority: SOLAR_MANAGEMENT_SYSTEM.md & Customer-to-Installation Architecture
-- ==============================================================================

-- 1. Extend user roles check constraint to include 'Customer'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support', 'Customer'));

-- 2. Link Customers table directly to authenticated User accounts
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- 3. Customer Comprehensive Installation Requirements Table
CREATE TABLE IF NOT EXISTS customer_installation_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- A. Property Information
    property_type VARCHAR(50) NOT NULL DEFAULT 'Residential',
    ownership_status VARCHAR(50) NOT NULL DEFAULT 'Owned',
    installation_location TEXT NOT NULL,
    roof_type VARCHAR(50) NOT NULL DEFAULT 'RCC Flat',
    roof_area_sqft NUMERIC(10,2),
    floors_count INT DEFAULT 1,
    roof_restrictions TEXT,
    
    -- B. Electricity Details
    electricity_consumer_number VARCHAR(100),
    discom_name VARCHAR(150),
    avg_monthly_bill NUMERIC(10,2),
    monthly_units NUMERIC(10,2),
    connection_type VARCHAR(50) DEFAULT 'Single Phase',
    existing_meter_details TEXT,
    
    -- C. Solar Requirements
    preferred_system_type VARCHAR(50) NOT NULL DEFAULT 'On-Grid',
    required_capacity_kw NUMERIC(5,2) DEFAULT 3.0,
    installation_purpose TEXT,
    preferred_timeline VARCHAR(100) DEFAULT 'Immediate (Within 1 Month)',
    battery_required VARCHAR(50) DEFAULT 'No',
    
    -- D. Site and Installation Details
    full_installation_address TEXT NOT NULL,
    parking_access TEXT,
    roof_accessibility TEXT,
    nearby_obstacles TEXT,
    special_requirements TEXT,
    
    -- E. Uploaded Documents (JSONB store of document URLs and metadata)
    documents_json JSONB DEFAULT '{}'::jsonb,
    
    -- F. Workflow and Admin Approval State
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' 
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_req_customer_id ON customer_installation_requirements(customer_id);
CREATE INDEX IF NOT EXISTS idx_req_user_id ON customer_installation_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_req_status ON customer_installation_requirements(status);

-- 4. Enable quotations to link to approved requirements and relax strict survey requirement
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS requirements_id UUID REFERENCES customer_installation_requirements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_requirements_id ON quotations(requirements_id);

DO $$ BEGIN
    ALTER TABLE quotations ALTER COLUMN survey_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
