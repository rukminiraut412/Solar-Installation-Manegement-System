/**
 * Operations Module Warranty Adapter
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.5, §7.6, §20.1 T-19)
 * 
 * Provides an isolated interface between Member 4 (Support & Finance)
 * and Member 3 (Operations - Warranty & Serialized Stock).
 * 
 * Target Contract (Member 3 - Operations):
 * Database Table: `warranty_records` JOIN `serial_items` JOIN `products`
 * Columns: id, serial_number, product_name, duration_months, start_date, end_date, status, party, scope
 * 
 * Current Status: PENDING MEMBER 3 OPERATIONS MODULE MERGE
 */

import { query } from '../../db/connection.js';
import { store } from './store.js';

export const WarrantyAdapter = {
  isOperationsModuleMerged: false,

  /**
   * Look up warranty status for a component by serial number
   * Queries PostgreSQL `warranty_records` if database is connected;
   * Otherwise falls back to mock contract records with explicit status flag.
   */
  async checkEligibility(serialNumber, claimDate = new Date().toISOString().split('T')[0]) {
    const cleanSerial = (serialNumber || '').trim();

    if (!cleanSerial) {
      return {
        status: 'INVALID_INPUT',
        message: 'Serial number is required for warranty lookup.',
        record: null,
        isAuthoritativeDB: false
      };
    }

    // Attempt live PostgreSQL query matching 001_foundation.sql schema
    const sql = `
      SELECT 
        w.id AS warranty_id,
        w.warranty_code,
        w.duration_months,
        w.start_date,
        w.end_date,
        w.status AS warranty_status,
        w.party,
        w.scope,
        s.serial_number,
        p.name AS product_name
      FROM warranty_records w
      JOIN serial_items s ON w.serial_item_id = s.id
      JOIN products p ON s.product_id = p.id
      WHERE LOWER(s.serial_number) = LOWER($1)
      LIMIT 1;
    `;

    try {
      const res = await query(sql, [cleanSerial]);
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        return this._evaluateDates(row, claimDate, true);
      }
    } catch (err) {
      console.warn(`[WARRANTY-ADAPTER-NOTICE] Operations SQL query: ${err.message}`);
    }

    // Fallback adapter record until Member 3 populates live tables
    const fallback = store.warranties.find(w => w.serial_number.toLowerCase() === cleanSerial.toLowerCase());
    if (fallback) {
      return this._evaluateDates(fallback, claimDate, false);
    }

    return {
      status: 'NO_RECORD',
      message: `No active warranty contract found for serial '${cleanSerial}'.`,
      record: null,
      isAuthoritativeDB: false
    };
  },

  _evaluateDates(record, claimDate, isDB = false) {
    if (record.status === 'Void' || record.warranty_status === 'Void') {
      return {
        status: 'VOID',
        message: 'Warranty voided by administration.',
        record,
        isAuthoritativeDB: isDB
      };
    }

    const startDate = new Date(record.start_date);
    const endDate = new Date(record.end_date);
    const checkDate = new Date(claimDate);

    if (checkDate < startDate) {
      return {
        status: 'NOT_ACTIVE',
        message: 'Warranty start date is in the future.',
        record,
        isAuthoritativeDB: isDB
      };
    }

    if (checkDate > endDate) {
      const expiredDays = Math.floor((checkDate - endDate) / 86400000);
      return {
        status: 'EXPIRED',
        message: `Warranty expired on ${record.end_date} (~${expiredDays} days ago). Paid service card applies.`,
        record,
        expiredDays,
        isAuthoritativeDB: isDB
      };
    }

    // Active
    const remainingDays = Math.floor((endDate - checkDate) / 86400000);
    const remainingMonths = (remainingDays / 30.4).toFixed(1);

    return {
      status: 'WITHIN_PERIOD',
      message: `Warranty active: ~${remainingMonths} months (${remainingDays} days) remaining.`,
      record,
      remainingDays,
      remainingMonths: Number(remainingMonths),
      isAuthoritativeDB: isDB
    };
  }
};
