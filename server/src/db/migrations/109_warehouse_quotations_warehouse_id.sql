-- Migration: 109_warehouse_quotations_warehouse_id.sql
-- Scope: Link warehouse_quotations to assigned warehouse user

ALTER TABLE warehouse_quotations 
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wh_quotes_warehouse_id ON warehouse_quotations(warehouse_id);
