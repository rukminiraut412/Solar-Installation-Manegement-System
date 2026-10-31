-- ====================================================================
-- SunPower Solutions - Migration 103: Support, Finance and AI Schema
-- Exclusive Ownership: Member 4
-- Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.6, §7.7, §8, §9, §15.2, §16.5, §16.9, §17)
-- Dependencies: 001_platform_foundation.sql, 101_customer_sales.sql, 102_operations.sql
-- ====================================================================

-- 1. Payment Requests (Razorpay test mode order tracking)
CREATE TABLE IF NOT EXISTS payment_requests (
  id VARCHAR(100) PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  purpose VARCHAR(50) NOT NULL, -- ADVANCE, BALANCE, FULL, SERVICE_CHARGE
  amount_paise BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'Created', -- Created, Initiated, Pending Verification, Paid, Failed, Cancelled, Expired, Mismatch (review)
  razorpay_order_id VARCHAR(100) UNIQUE,
  idempotency_key VARCHAR(100),
  is_test BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, purpose, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_order_id ON payment_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_razorpay_order_id ON payment_requests(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- 2. Payment Attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
  id VARCHAR(100) PRIMARY KEY,
  payment_request_id VARCHAR(100) NOT NULL REFERENCES payment_requests(id),
  razorpay_payment_id VARCHAR(100) UNIQUE,
  status VARCHAR(50) NOT NULL, -- Pending, Captured, Failed
  method_type VARCHAR(50),
  error_code VARCHAR(100),
  error_message_sanitized TEXT,
  amount_paise BIGINT NOT NULL,
  signature_verified BOOLEAN DEFAULT false,
  verified_via VARCHAR(50), -- CALLBACK, WEBHOOK, FETCH
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_request_id ON payment_attempts(payment_request_id);

-- 3. Verified Payments (Authoritative Ledger)
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(100) PRIMARY KEY,
  payment_code VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  invoice_id VARCHAR(100),
  payment_request_id VARCHAR(100) REFERENCES payment_requests(id),
  attempt_id VARCHAR(100) UNIQUE,
  source VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY', -- RAZORPAY, MANUAL
  amount_paise BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED', -- VERIFIED, REVERSED
  received_at TIMESTAMPTZ DEFAULT NOW(),
  reference VARCHAR(100),
  proof_file_id VARCHAR(100),
  recorded_by VARCHAR(50),
  is_test BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 4. Razorpay Webhook Event Deduplication
CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  id VARCHAR(100) PRIMARY KEY,
  provider_event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload_allowlisted_json JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  processing_status VARCHAR(50) NOT NULL, -- PROCESSED, DUPLICATE, FAILED, IGNORED
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_id ON razorpay_webhook_events(provider_event_id);

-- 5. Payment Reconciliations (Admin Audit Records)
CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id VARCHAR(100) PRIMARY KEY,
  payment_request_id VARCHAR(100) NOT NULL REFERENCES payment_requests(id),
  action VARCHAR(50) NOT NULL, -- VERIFY_OVERRIDE, REVERSE, MARK_FAILED
  reason TEXT NOT NULL,
  actor_id VARCHAR(50) NOT NULL,
  at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invoices & Line Items
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(100) PRIMARY KEY,
  invoice_code VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  total_paise BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Issued', -- Draft, Issued, Partially Paid, Paid, Void
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(100) PRIMARY KEY,
  invoice_id VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- 7. Direct Project Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(100) PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  category VARCHAR(50) NOT NULL, -- Transport, Permits, Consumables, Other
  amount_paise BIGINT NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
  approved_by VARCHAR(50),
  incurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);

-- 8. Technician Timesheet Pay Records
CREATE TABLE IF NOT EXISTS technician_pay_records (
  id VARCHAR(100) PRIMARY KEY,
  technician_id VARCHAR(50) NOT NULL,
  technician_name VARCHAR(120) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  approved_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  rate_paise BIGINT NOT NULL DEFAULT 50000, -- Default 500 INR/hr
  gross_paise BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Approved', -- Pending, Approved, Paid
  approved_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tech_pay_technician ON technician_pay_records(technician_id);

-- 9. Government Subsidy Application Tracking
CREATE TABLE IF NOT EXISTS subsidy_applications (
  id VARCHAR(100) PRIMARY KEY,
  project_id UUID UNIQUE NOT NULL REFERENCES projects(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  receivable_paise BIGINT NOT NULL DEFAULT 7800000, -- Demo 78,000 INR
  status VARCHAR(50) NOT NULL DEFAULT 'Documents Pending', -- Not Applicable, Documents Pending, Submitted, Under Review, Approved, Disbursed
  submitted_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  notes TEXT,
  checklist_json JSONB DEFAULT '{"electricityBill": true, "aadhaar": true, "bankPassbook": false, "rooftopPhoto": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subsidy_customer_id ON subsidy_applications(customer_id);

-- 10. Support Cases (owns the 33-transition FSM)
CREATE TABLE IF NOT EXISTS support_cases (
  id VARCHAR(100) PRIMARY KEY,
  case_code VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  project_id UUID REFERENCES projects(id),
  product_id UUID REFERENCES products(id),
  serial_item_id UUID REFERENCES serial_items(id),
  source VARCHAR(50) NOT NULL DEFAULT 'Portal', -- Portal, Phone, WhatsApp, Staff
  description TEXT NOT NULL,
  category_ai VARCHAR(50), -- Basic, Major, Safety-related, Unclear
  category_confirmed VARCHAR(50),
  priority VARCHAR(10) NOT NULL DEFAULT 'P3', -- P1, P2, P3, P4
  safety_flag BOOLEAN DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'New',
  assigned_technician_id VARCHAR(50),
  scheduled_visit_at TIMESTAMPTZ,
  technician_notes TEXT,
  technician_resolved BOOLEAN,
  support_review_notes TEXT,
  customer_confirmed BOOLEAN,
  dispute_notes TEXT,
  repeat_count INT DEFAULT 0,
  closure_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_cases_customer_id ON support_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_project_id ON support_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_status ON support_cases(status);

-- 11. Case Messages (Customer vs Internal)
CREATE TABLE IF NOT EXISTS case_messages (
  id VARCHAR(100) PRIMARY KEY,
  case_id VARCHAR(100) NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  author_id VARCHAR(50) NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  author_type VARCHAR(50) NOT NULL, -- CUSTOMER, AI, SUPPORT, ADMIN, TECHNICIAN
  body TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER', -- CUSTOMER, INTERNAL
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON case_messages(case_id);

-- 12. Service Tickets (Billing & Formal Scope)
CREATE TABLE IF NOT EXISTS service_tickets (
  id VARCHAR(100) PRIMARY KEY,
  ticket_code VARCHAR(50) UNIQUE NOT NULL,
  case_id VARCHAR(100) UNIQUE NOT NULL REFERENCES support_cases(id),
  serial_item_id UUID REFERENCES serial_items(id),
  coverage_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COVERED_WARRANTY, NOT_COVERED_PAID, GOODWILL
  state VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, Closed, Cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_tickets_case_id ON service_tickets(case_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_serial ON service_tickets(serial_item_id);

-- 13. Service Charges (Strictly gated by coverage decision)
CREATE TABLE IF NOT EXISTS service_charges (
  id VARCHAR(100) PRIMARY KEY,
  ticket_code VARCHAR(50) NOT NULL REFERENCES service_tickets(ticket_code),
  type VARCHAR(50) NOT NULL, -- PART, LABOR, VISIT, OTHER
  description VARCHAR(255) NOT NULL,
  amount_paise BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_charges_ticket_code ON service_charges(ticket_code);

-- 14. Approved Knowledge Base Help Articles (for safe AI guidance)
CREATE TABLE IF NOT EXISTS help_articles (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AI Requests (Telemetry & Auditing without storing sensitive prompts)
CREATE TABLE IF NOT EXISTS ai_requests (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  feature VARCHAR(50) NOT NULL,
  entity_refs JSONB,
  provider_mode VARCHAR(20) NOT NULL DEFAULT 'mock',
  status VARCHAR(20) NOT NULL,
  latency_ms INT,
  input_hash VARCHAR(64),
  output_hash VARCHAR(64),
  fallback_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
