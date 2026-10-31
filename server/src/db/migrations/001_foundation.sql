-- ====================================================================
-- SunPower Solutions - Migration 001: Foundation Schema
-- ====================================================================

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  role_id VARCHAR(50) REFERENCES roles(id),
  customer_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ DEFAULT NOW(),
  actor_user_id VARCHAR(50),
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  request_id VARCHAR(100),
  ip VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS status_history (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  actor_user_id VARCHAR(50),
  reason TEXT,
  at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  customer_code VARCHAR(30) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  phone_norm VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  customer_type VARCHAR(50) DEFAULT 'Residential',
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  merged_into_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  order_code VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(50) REFERENCES customers(id),
  quotation_id VARCHAR(50),
  total_paise BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Created',
  payment_status VARCHAR(50) DEFAULT 'Unpaid',
  policy_snapshot_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  project_code VARCHAR(30) UNIQUE NOT NULL,
  order_id VARCHAR(50) UNIQUE REFERENCES orders(id),
  customer_id VARCHAR(50) REFERENCES customers(id),
  capacity_kw NUMERIC(5,2) DEFAULT 3.0,
  system_type VARCHAR(50) DEFAULT 'On-Grid',
  status VARCHAR(50) DEFAULT 'Created',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  is_serialized BOOLEAN DEFAULT false,
  unit VARCHAR(20) DEFAULT 'UNIT',
  standard_cost_paise BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS serial_items (
  id VARCHAR(50) PRIMARY KEY,
  product_id VARCHAR(50) REFERENCES products(id),
  serial_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'IN_STOCK',
  unit_cost_paise BIGINT DEFAULT 0,
  project_id VARCHAR(50) REFERENCES projects(id),
  customer_id VARCHAR(50) REFERENCES customers(id),
  UNIQUE (product_id, serial_number)
);

CREATE TABLE IF NOT EXISTS warranty_records (
  id VARCHAR(50) PRIMARY KEY,
  warranty_code VARCHAR(50) UNIQUE NOT NULL,
  serial_item_id VARCHAR(50) REFERENCES serial_items(id),
  project_id VARCHAR(50) REFERENCES projects(id),
  customer_id VARCHAR(50) REFERENCES customers(id),
  product_id VARCHAR(50) REFERENCES products(id),
  party VARCHAR(50) DEFAULT 'MANUFACTURER',
  scope VARCHAR(50) DEFAULT 'PARTS',
  duration_months INT DEFAULT 24,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installation_jobs (
  id VARCHAR(50) PRIMARY KEY,
  job_code VARCHAR(50) UNIQUE NOT NULL,
  project_id VARCHAR(50) REFERENCES projects(id),
  type VARCHAR(50) DEFAULT 'Installation',
  status VARCHAR(50) DEFAULT 'Scheduled',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
