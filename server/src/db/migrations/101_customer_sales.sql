-- ==============================================================================
-- Migration: 101_customer_sales.sql
-- Ownership: Member 2 (Customer & Sales)
-- Scope: Customers, Timeline, Enquiries, Site Surveys, Packages, Quotations,
--        BOM, Orders, Projects, and Authoritative Frozen project_bom_items
-- Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
-- ==============================================================================

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address_street TEXT,
    address_city VARCHAR(100) NOT NULL DEFAULT 'Ahmedabad',
    address_state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
    address_pincode VARCHAR(20),
    electricity_consumer_number VARCHAR(100),
    sanctioned_load_kw NUMERIC(5,2),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- 2. Customer Timeline Table
CREATE TABLE IF NOT EXISTS customer_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_timeline_customer_id ON customer_timeline(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_timeline_created_at ON customer_timeline(created_at);

-- 3. Enquiries Table
CREATE TABLE IF NOT EXISTS enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    source VARCHAR(50) NOT NULL CHECK (source IN ('WEB', 'WHATSAPP', 'PHONE_CALL', 'REFERRAL', 'WALK_IN')),
    status VARCHAR(50) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'MERGED')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    estimated_monthly_bill NUMERIC(10,2),
    estimated_roof_area_sqft NUMERIC(10,2),
    grid_type_preference VARCHAR(20) DEFAULT 'On-Grid' CHECK (grid_type_preference IN ('On-Grid', 'Off-Grid')),
    interested_capacity_kw NUMERIC(4,2),
    notes TEXT,
    duplicate_of_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
    disqualification_reason TEXT,
    follow_up_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_phone ON enquiries(phone);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_to ON enquiries(assigned_to);

-- 4. Enquiry Follow-up History
CREATE TABLE IF NOT EXISTS enquiry_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    call_summary TEXT NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    next_follow_up TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiry_follow_ups_enquiry_id ON enquiry_follow_ups(enquiry_id);

-- 5. Site Surveys Table
CREATE TABLE IF NOT EXISTS site_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_number VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REWORK', 'REJECTED')),
    roof_area_sqft NUMERIC(10,2),
    shadow_free_sqft NUMERIC(10,2),
    roof_type VARCHAR(50),
    azimuth_degrees NUMERIC(5,2),
    tilt_angle_degrees NUMERIC(5,2),
    cable_run_meters NUMERIC(6,2),
    grid_phase VARCHAR(20),
    sanctioned_load_kw NUMERIC(5,2),
    structural_condition VARCHAR(50),
    feeder_code VARCHAR(100),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    rework_reason TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_surveys_status ON site_surveys(status);
CREATE INDEX IF NOT EXISTS idx_site_surveys_enquiry_id ON site_surveys(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_customer_id ON site_surveys(customer_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_technician ON site_surveys(assigned_technician_id);

-- 6. Survey Photos Table
CREATE TABLE IF NOT EXISTS survey_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('PANORAMA', 'OBSTACLES', 'METER_BOARD', 'DISTRIBUTION_BOARD', 'ROOF_SURFACE', 'OTHER')),
    notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_id ON survey_photos(survey_id);

-- 7. Solar Ready Packages Catalog
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    capacity_kw NUMERIC(4,2) NOT NULL,
    grid_type VARCHAR(20) NOT NULL CHECK (grid_type IN ('On-Grid', 'Off-Grid')),
    base_price NUMERIC(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_packages_capacity_grid ON packages(capacity_kw, grid_type);

-- 8. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    version INT NOT NULL DEFAULT 1,
    survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    capacity_kw NUMERIC(4,2) NOT NULL,
    grid_type VARCHAR(20) NOT NULL CHECK (grid_type IN ('On-Grid', 'Off-Grid')),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED')),
    hardware_subtotal NUMERIC(12,2) NOT NULL,
    installation_labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL,
    tax_percent NUMERIC(5,2) NOT NULL DEFAULT 12.0,
    total_amount NUMERIC(12,2) NOT NULL,
    subsidy_estimated_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ NOT NULL,
    proposal_token VARCHAR(100) UNIQUE NOT NULL,
    customer_notes TEXT,
    digital_signature_url TEXT,
    accepted_at TIMESTAMPTZ,
    declined_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_proposal_token ON quotations(proposal_token);

-- 9. Quotation Items (Itemized Bill of Materials)
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID,
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    is_serialized BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quote_id ON quotation_items(quotation_id);

-- 10. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK (order_status IN ('CONFIRMED', 'IN_FULFILMENT', 'COMPLETED', 'CANCELLED')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_ADVANCE' CHECK (payment_status IN ('PENDING_ADVANCE', 'ADVANCE_PAID', 'FULLY_PAID')),
    total_contract_value NUMERIC(12,2) NOT NULL,
    advance_required_percent NUMERIC(5,2) NOT NULL DEFAULT 25.0,
    advance_required_amount NUMERIC(12,2) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- 11. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    capacity_kw NUMERIC(4,2) NOT NULL,
    grid_type VARCHAR(20) NOT NULL CHECK (grid_type IN ('On-Grid', 'Off-Grid')),
    current_stage VARCHAR(50) NOT NULL DEFAULT 'STOCK_RESERVATION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_order_id ON projects(order_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);

-- 12. Authoritative Frozen project_bom_items Table (Created by Member 2 upon Quote Acceptance)
CREATE TABLE IF NOT EXISTS project_bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID,
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    is_serialized BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proj_bom_project_id ON project_bom_items(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_bom_order_id ON project_bom_items(order_id);
CREATE INDEX IF NOT EXISTS idx_proj_bom_sku ON project_bom_items(sku);
