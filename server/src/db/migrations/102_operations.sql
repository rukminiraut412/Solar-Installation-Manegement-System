-- ==============================================================================
-- Migration: 102_operations.sql
-- Module: Operations & Fulfilment (Member 3)
-- Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3, §7.3, §7.4, §7.5, §9, §17, §20)
-- Contract Authority: docs/contracts/operations.md
-- Dependencies: 001_platform_foundation.sql (users, audit_logs)
-- Harmonized with: 101_customer_sales.sql (Member 2) and 103_support_finance.sql (Member 4)
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE product_category_enum AS ENUM (
        'PANEL', 'INVERTER', 'BATTERY', 'STRUCTURE', 'ELECTRICAL', 'SAFETY', 'CONSUMABLE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ledger_transaction_type AS ENUM (
        'PURCHASE_RECEIPT', 'RESERVATION', 'RELEASE_RESERVATION',
        'DISPATCH', 'RETURN_CUSTOMER', 'RETURN_VENDOR', 'WRITE_OFF', 'AUDIT_CORRECTION'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE serial_status_enum AS ENUM (
        'IN_WAREHOUSE', 'RESERVED', 'IN_TRANSIT', 'INSTALLED',
        'ACTIVE_WARRANTY', 'REPLACED_UNDER_WARRANTY', 'EXPIRED_WARRANTY',
        'DAMAGED_QUARANTINE', 'RETURNED_TO_VENDOR'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE dispatch_status_enum AS ENUM (
        'DRAFT', 'PACKING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE job_status_enum AS ENUM (
        'SCHEDULED', 'IN_PROGRESS', 'TESTING_PENDING', 'PHOTO_PENDING',
        'HANDOVER_PENDING', 'COMPLETED', 'REWORK_REQUIRED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE warranty_status_enum AS ENUM (
        'WITHIN_PERIOD', 'EXPIRED', 'VOID', 'NOT_ACTIVE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TRANSITIONAL PREREQUISITE TABLES (Safe execution if 101 has not run)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    order_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_ADVANCE',
    total_contract_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    advance_required_percent NUMERIC(4,2) NOT NULL DEFAULT 25.0,
    advance_required_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    advance_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id),
    customer_id UUID REFERENCES customers(id),
    capacity_kw NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    grid_type VARCHAR(20) NOT NULL DEFAULT 'ON_GRID',
    current_stage VARCHAR(50) NOT NULL DEFAULT 'PENDING_DISPATCH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT CATEGORIES & MASTER CATALOG
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    category_id UUID REFERENCES product_categories(id),
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    is_serialized BOOLEAN NOT NULL DEFAULT false,
    min_safety_stock INT NOT NULL DEFAULT 5 CHECK (min_safety_stock >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    warranty_months INT NOT NULL DEFAULT 24 CHECK (warranty_months >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 4. WAREHOUSE INVENTORY ITEMS & DOUBLE-ENTRY LEDGER
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(100) NOT NULL DEFAULT 'Main Central Warehouse',
    storage_bin VARCHAR(50) NOT NULL DEFAULT 'BIN-A1',
    on_hand_quantity INT NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    last_counted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reserved_not_exceed_onhand CHECK (reserved_quantity <= on_hand_quantity),
    UNIQUE(product_id, warehouse_location, storage_bin)
);

CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity_change INT NOT NULL,
    balance_on_hand INT NOT NULL CHECK (balance_on_hand >= 0),
    balance_reserved INT NOT NULL CHECK (balance_reserved >= 0),
    balance_available INT NOT NULL CHECK (balance_available >= 0),
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_product ON inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON inventory_ledger(created_at);

-- 5. GOODS RECEIVED NOTES (GRN) & INBOUND VENDOR SHIPMENTS
CREATE TABLE IF NOT EXISTS stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(150) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_received INT NOT NULL CHECK (quantity_received > 0),
    unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
    batch_number VARCHAR(100)
);

-- 6. PHYSICAL AUDIT DISCREPANCIES & ADJUSTMENT APPROVALS
CREATE TABLE IF NOT EXISTS inventory_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    system_qty INT NOT NULL,
    counted_qty INT NOT NULL,
    variance INT NOT NULL,
    variance_cost NUMERIC(10,2) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requires_admin_approval BOOLEAN NOT NULL DEFAULT false,
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROJECT BOM ITEMS (Harmonized with Member 2)
CREATE TABLE IF NOT EXISTS project_bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    order_id UUID,
    product_id UUID REFERENCES products(id),
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(6,2) NOT NULL CHECK (quantity > 0),
    quantity_required NUMERIC(6,2),
    quantity_reserved NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_dispatched NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (quantity_dispatched >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    is_serialized BOOLEAN NOT NULL DEFAULT false,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_proj_bom_project ON project_bom_items(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_bom_order ON project_bom_items(order_id);

-- Idempotent column check in case Member 2's 101 created project_bom_items first:
ALTER TABLE project_bom_items 
    ADD COLUMN IF NOT EXISTS order_id UUID,
    ADD COLUMN IF NOT EXISTS quantity_required NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS quantity_reserved NUMERIC(6,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quantity_dispatched NUMERIC(6,2) NOT NULL DEFAULT 0;
UPDATE project_bom_items SET quantity_required = quantity WHERE quantity_required IS NULL AND quantity IS NOT NULL;

-- 8. STOCK RESERVATIONS
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    bom_item_id UUID NOT NULL REFERENCES project_bom_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    reserved_quantity NUMERIC(6,2) NOT NULL CHECK (reserved_quantity > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPATCHED', 'RELEASED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_project ON stock_reservations(project_id);

-- 9. AUTHORITATIVE SERIAL REGISTRY (Agreed Naming: serial_items)
CREATE TABLE IF NOT EXISTS serial_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES products(id),
    status VARCHAR(50) NOT NULL DEFAULT 'IN_WAREHOUSE' 
        CHECK (status IN ('IN_WAREHOUSE', 'RESERVED', 'IN_TRANSIT', 'INSTALLED', 'ACTIVE_WARRANTY', 'REPLACED_UNDER_WARRANTY', 'EXPIRED_WARRANTY', 'DAMAGED_QUARANTINE', 'RETURNED_TO_VENDOR')),
    unit_cost_paise BIGINT NOT NULL DEFAULT 0,
    project_id UUID REFERENCES projects(id),
    customer_id UUID REFERENCES customers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_serial_number ON serial_items(LOWER(serial_number));
CREATE INDEX IF NOT EXISTS idx_serial_product ON serial_items(product_id);
CREATE INDEX IF NOT EXISTS idx_serial_project ON serial_items(project_id);

-- Backward compatibility view
CREATE OR REPLACE VIEW serial_registry AS SELECT * FROM serial_items;

CREATE TABLE IF NOT EXISTS serial_item_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_item_id UUID NOT NULL REFERENCES serial_items(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id),
    project_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. DISPATCH ORDERS & MANIFEST ITEMS
CREATE TABLE IF NOT EXISTS dispatch_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    order_id UUID NOT NULL UNIQUE, -- Prevents duplicate active manifests per order
    vehicle_number VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PACKING', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
    advance_payment_override BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT,
    override_approved_by UUID REFERENCES users(id),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    challan_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispatch_project ON dispatch_orders(project_id);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
    bom_item_id UUID NOT NULL REFERENCES project_bom_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    serial_item_id UUID REFERENCES serial_items(id),
    quantity NUMERIC(6,2) NOT NULL CHECK (quantity > 0),
    is_scanned BOOLEAN NOT NULL DEFAULT false,
    scanned_at TIMESTAMPTZ
);

-- 11. TECHNICIANS & CREW SCHEDULING
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skills TEXT[] NOT NULL DEFAULT '{}',
    certifications JSONB DEFAULT '[]'::jsonb,
    daily_rate NUMERIC(10,2) NOT NULL DEFAULT 800.00 CHECK (daily_rate >= 0),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME' CHECK (employment_type IN ('FULL_TIME', 'CONTRACTOR')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technician_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('SURVEY', 'INSTALLATION')),
    reference_id UUID NOT NULL,
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL DEFAULT 'MORNING' CHECK (time_slot IN ('MORNING', 'AFTERNOON', 'FULL_DAY')),
    role_in_crew VARCHAR(50) NOT NULL DEFAULT 'INSTALLER' CHECK (role_in_crew IN ('ELECTRICAL_LEAD', 'INSTALLER', 'HELPER')),
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(technician_id, scheduled_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_assignments_date ON technician_assignments(scheduled_date);

-- 12. MOBILE INSTALLATION JOBS & SAFETY GATES
CREATE TABLE IF NOT EXISTS installation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id),
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' 
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'TESTING_PENDING', 'PHOTO_PENDING', 'HANDOVER_PENDING', 'COMPLETED', 'REWORK_REQUIRED', 'CANCELLED')),
    system_capacity_kw NUMERIC(3,1) NOT NULL,
    grid_type VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    lead_technician_id UUID REFERENCES technicians(id),
    rework_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installation_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    notes TEXT,
    UNIQUE(job_id, step_number)
);

CREATE TABLE IF NOT EXISTS installation_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    grid_voltage_volts NUMERIC(5,1) NOT NULL,
    open_circuit_voltage_voc NUMERIC(6,1) NOT NULL,
    active_generation_kw NUMERIC(5,2) NOT NULL,
    earthing_resistance_ohms NUMERIC(5,2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PASSED', 'FAILED')),
    tested_by UUID REFERENCES users(id),
    tested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    instrument_model VARCHAR(100),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS installation_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    photo_category VARCHAR(50) NOT NULL 
        CHECK (photo_category IN ('STRUCTURE_AND_PANELS', 'INVERTER_AND_WIRING', 'BATTERY_AND_CONTROLLER', 'EARTHING_PIT', 'OTHER')),
    cloudinary_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installation_handover (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL UNIQUE REFERENCES installation_jobs(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    signature_data_url TEXT NOT NULL,
    confirmed_capacity_kw NUMERIC(3,1) NOT NULL,
    satisfaction_score INT CHECK (satisfaction_score BETWEEN 1 AND 5),
    customer_comments TEXT,
    client_ip VARCHAR(45),
    signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    certificate_pdf_url TEXT
);

-- 13. AUTHORITATIVE WARRANTY RECORDS (Agreed Schema Matching Member 4's Adapter)
CREATE TABLE IF NOT EXISTS warranty_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_code VARCHAR(50) UNIQUE NOT NULL,
    serial_item_id UUID NOT NULL REFERENCES serial_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    customer_id UUID REFERENCES customers(id),
    project_id UUID REFERENCES projects(id),
    duration_months INT NOT NULL CHECK (duration_months > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    party VARCHAR(50) NOT NULL DEFAULT 'Manufacturer' CHECK (party IN ('Manufacturer', 'Installer')),
    scope VARCHAR(50) NOT NULL DEFAULT 'Full Replacement' CHECK (scope IN ('Full Replacement', 'Performance', 'Workmanship')),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Void', 'Not_Active')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warranty_serial ON warranty_records(serial_item_id);
CREATE INDEX IF NOT EXISTS idx_warranty_code ON warranty_records(warranty_code);

CREATE TABLE IF NOT EXISTS warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_id UUID NOT NULL REFERENCES warranty_records(id) ON DELETE CASCADE,
    ticket_id VARCHAR(100),
    claim_type VARCHAR(50) NOT NULL CHECK (claim_type IN ('REPAIR', 'REPLACEMENT', 'GOODWILL')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SETTLED')),
    fault_description TEXT NOT NULL,
    resolution_notes TEXT,
    replacement_serial_id UUID REFERENCES serial_items(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. SEED DATA: 7 CATEGORIES & MASTER PRODUCTS (1 kW to 5 kW Ready-Made Packages)
INSERT INTO product_categories (code, name, description) VALUES
    ('PANEL', 'Solar PV Modules', 'Monocrystalline, Polycrystalline, and Bifacial Photovoltaic Panels'),
    ('INVERTER', 'Solar Inverters', 'On-Grid String Inverters, Off-Grid Hybrid Inverters, and Microinverters'),
    ('BATTERY', 'Energy Storage Batteries', 'Solar Tubular Lead-Acid, Lithium Ferro-Phosphate (LFP) Battery Banks'),
    ('STRUCTURE', 'Mounting Structures', 'Aluminium Rails, Elevated GI Strut Structures, Roof Anchor Brackets'),
    ('ELECTRICAL', 'Switchgear & Cables', 'Solar DC Cables, AC Distribution Boxes, DC Disconnects, MC4 Connectors'),
    ('SAFETY', 'Earthing & Lightning', 'Chemical Earthing Electrodes, Earthing Compound, Lightning Arrestors'),
    ('CONSUMABLE', 'Hardware & Fasteners', 'SS304 Fasteners, UV Conduit Pipes, Cable Ties, Waterproofing Sealant')
ON CONFLICT (code) DO NOTHING;

-- Seed Standard Master Hardware Products matching 1 kW to 5 kW BOM Generator
INSERT INTO products (sku, category, brand, model, name, description, unit_cost, unit_price, is_serialized, min_safety_stock, unit, warranty_months) VALUES
    -- Solar Panels
    ('PNL-MONO-540W', 'PANEL', 'Waaree', 'WS-540', '540W Monocrystalline PERC Solar Panel', 'High efficiency 144 half-cut cells solar module', 11500.00, 14200.00, true, 20, 'PCS', 240),
    ('PNL-MONO-440W', 'PANEL', 'Vikram Solar', 'Somera 440W', '440W Monocrystalline Half-Cut Panel', 'Mono-facial module suitable for compact residential roofs', 9800.00, 12000.00, true, 15, 'PCS', 240),
    
    -- Inverters (On-Grid & Off-Grid)
    ('INV-GROW-3K-26', 'INVERTER', 'Growatt', 'MIN 3000TL-X', 'Growatt 3.3kW On-Grid String Inverter', 'Single phase, dual MPPT, IP65 protection with Wi-Fi dongle', 24500.00, 31000.00, true, 5, 'PCS', 24),
    ('INV-GROW-5K-26', 'INVERTER', 'Growatt', 'MIN 5000TL-X', 'Growatt 5kW On-Grid String Inverter', 'Dual MPPT, 98.4% max efficiency, grid-tied string inverter', 38000.00, 48500.00, true, 4, 'PCS', 24),
    ('INV-HYBR-3K-48', 'INVERTER', 'Luminous', 'Solarverter PRO 3kW', 'Luminous 3kW 48V Off-Grid Hybrid Inverter', 'Pure sine wave inverter with MPPT solar charge controller', 29000.00, 36500.00, true, 3, 'PCS', 24),
    ('INV-HYBR-5K-48', 'INVERTER', 'Luminous', 'Solarverter PRO 5kW', 'Luminous 5kW 48V Off-Grid Hybrid Inverter', 'Heavy duty off-grid solar inverter with generator support', 45000.00, 56000.00, true, 3, 'PCS', 24),
    
    -- Batteries
    ('BAT-LFP-48V-100', 'BATTERY', 'Exide', 'Sunsurance LFP 48V', '48V 100Ah Lithium Ferro-Phosphate Battery', 'Wall-mounted lithium battery with smart BMS and 4000 cycle life', 65000.00, 82000.00, true, 4, 'PCS', 24),
    ('BAT-TUB-12V-150', 'BATTERY', 'Luminous', 'Solar C10 150Ah', '12V 150Ah Tall Tubular Solar Battery', 'Deep cycle lead-acid battery engineered for frequent power cuts', 10500.00, 13800.00, true, 8, 'PCS', 24),
    
    -- Mounting Structures
    ('STR-RAIL-ALUM-3KW', 'STRUCTURE', 'Tata Bluescope', 'AlumMount-3KW', 'Elevated Aluminium Rail Mounting Stand (3 kW)', 'Corrosion-resistant aluminium rails with stainless steel brackets', 4800.00, 6800.00, false, 10, 'SETS', 60),
    ('STR-RAIL-ALUM-5KW', 'STRUCTURE', 'Tata Bluescope', 'AlumMount-5KW', 'Elevated Aluminium Rail Mounting Stand (5 kW)', 'High-wind certified mounting structure set with roof clamps', 7500.00, 10500.00, false, 8, 'SETS', 60),
    
    -- Electrical & Wiring
    ('CAB-DC-4SQMM', 'ELECTRICAL', 'Polycab', 'SolarDC 4mm2', 'Solar DC Cable 4 sq mm (Red/Black Pair)', 'Electron-beam cross-linked halogen-free solar power cable', 48.00, 72.00, false, 500, 'METERS', 12),
    ('CAB-AC-4SQMM', 'ELECTRICAL', 'Polycab', 'Havells 4mm2', 'AC Flexible Copper Cable 4 sq mm', 'Single phase 3-core industrial armored copper AC wiring', 62.00, 90.00, false, 300, 'METERS', 12),
    ('BOX-ACDB-3KW', 'ELECTRICAL', 'Schneider', 'ACDB-1PH-3KW', 'AC Distribution Box (Single Phase 3 kW)', 'Equipped with MCB, Type II AC SPD, and weatherproof enclosure', 2200.00, 3400.00, false, 10, 'PCS', 12),
    ('BOX-DCDB-1IN', 'ELECTRICAL', 'Schneider', 'DCDB-1IN-1OUT', 'DC Distribution Box (1 String In / 1 String Out)', 'Equipped with 1000V DC Fuse, DC Isolator, and 1000V DC SPD', 2600.00, 3900.00, false, 10, 'PCS', 12),
    
    -- Earthing & Safety
    ('EAR-CHEM-ROD-2M', 'SAFETY', 'TruePower', 'Cu-Bonded 2M', 'Chemical Earthing Electrode with Compound (2 Meter)', 'Copper-bonded solid rod with 25kg conductive backfill compound', 2100.00, 3200.00, false, 20, 'SETS', 60),
    ('EAR-LIGHT-ARR', 'SAFETY', 'TruePower', 'LA-SPIKE-1M', 'Copper Lightning Arrestor Spike (1 Meter)', 'Includes brass base, 3-prong lightning receiver, and elevation mast', 1400.00, 2200.00, false, 15, 'PCS', 60)
ON CONFLICT (sku) DO NOTHING;

-- Initialise Warehouse Inventory for seeded products
INSERT INTO inventory_items (product_id, warehouse_location, storage_bin, on_hand_quantity, reserved_quantity)
SELECT id, 'Main Central Warehouse', 'BIN-A1', 50, 0
FROM products
ON CONFLICT (product_id, warehouse_location, storage_bin) DO NOTHING;
