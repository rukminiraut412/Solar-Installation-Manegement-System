/**
 * Operations Module Warranty Adapter
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.5, §7.6, §20.1 T-19)
 * Operations Contract Authority: docs/contracts/operations.md (§10.3, §15.3, §17)
 * 
 * Provides an isolated interface between Member 4 (Support & Finance)
 * and Member 3 (Operations - Warranty & Serialized Stock).
 * 
 * Authoritative Table: `serial_items` (defined in 001_foundation.sql / Member 3 contract).
 * Speculative views or unverified fallbacks like 'serial_registry' are strictly omitted.
 * 
 * Never silently treats unavailable or offline warranty data as confirmed coverage.
 */

import { ENV, query } from './db.js';
import { store } from './store.js';

const isProduction = () => (process.env.NODE_ENV === 'production' || ENV.NODE_ENV === 'production');

export const WarrantyAdapter = {
  isOperationsModuleMerged: false,

  /**
   * Look up warranty status for a component by serial number.
   * Queries PostgreSQL `warranty_records` JOIN `serial_items` JOIN `products`.
   * In production mode, never silently falls back to in-memory fixtures.
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

    // Authoritative Query: Matching 001_foundation.sql & docs/contracts/operations.md §15.3
    // Sole authoritative table is serial_items.
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
      if (res && res.rows && res.rows.length > 0) {
        return this._evaluateDates(res.rows[0], claimDate, true);
      }
    } catch (err) {
      console.warn(`[WARRANTY-ADAPTER-NOTICE] Operations SQL query: ${err.message}`);
    }

    // In production mode, if the database did not yield an authoritative record,
    // do NOT silently fall back to mock data as confirmed coverage.
    if (isProduction()) {
      return {
        status: 'UNAVAILABLE',
        message: `Authoritative warranty record for serial '${cleanSerial}' is unavailable. Live Operations database connection required.`,
        record: null,
        isAuthoritativeDB: false
      };
    }

    // Fallback adapter record permitted ONLY for dev/isolated testing
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

  _evaluateDates(rawRecord, claimDate, isDB = false) {
    const startDateStr = rawRecord.start_date || rawRecord.startDate;
    const endDateStr = rawRecord.end_date || rawRecord.endDate;
    const durationMonths = Number(rawRecord.duration_months || rawRecord.durationMonths || 24);
    const productName = rawRecord.product_name || rawRecord.productName || 'Solar Equipment';
    const warrantyCode = rawRecord.warranty_code || rawRecord.warrantyCode || 'WRN-UNKNOWN';
    const serialNumber = rawRecord.serial_number || rawRecord.serialNumber;
    const party = rawRecord.party || 'MANUFACTURER';
    const scope = rawRecord.scope || 'PARTS';

    // Normalized envelope supporting both camelCase (Member 3 REST contract) and snake_case
    const record = {
      ...rawRecord,
      id: rawRecord.warranty_id || rawRecord.id,
      serial_number: serialNumber,
      serialNumber,
      warranty_code: warrantyCode,
      warrantyCode,
      product_name: productName,
      productName,
      duration_months: durationMonths,
      durationMonths,
      start_date: startDateStr,
      startDate: startDateStr,
      end_date: endDateStr,
      endDate: endDateStr,
      party,
      scope,
      isAuthoritativeDB: isDB
    };

    if (rawRecord.status === 'Void' || rawRecord.warranty_status === 'Void') {
      return {
        status: 'VOID',
        message: 'Warranty voided by administration.',
        record,
        isAuthoritativeDB: isDB
      };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
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
        message: `Warranty expired on ${endDateStr} (~${expiredDays} days ago). Paid service card applies.`,
        record,
        expiredDays,
        isAuthoritativeDB: isDB
      };
    }

    // Active within period
    const remainingDays = Math.floor((endDate - checkDate) / 86400000);
    const remainingMonths = Number((remainingDays / 30.4).toFixed(1));

    return {
      status: 'WITHIN_PERIOD',
      message: `Warranty active: ~${remainingMonths} months (${remainingDays} days) remaining.`,
      record,
      remainingDays,
      remainingMonths,
      isAuthoritativeDB: isDB
    };
  }
};
