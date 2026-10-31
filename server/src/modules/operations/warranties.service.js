/**
 * Operations Warranty Management Service (Phase 6)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.3) & docs/contracts/operations.md (§5, §7)
 * 
 * Rules:
 * 1. Authority for warranty lookup across the entire application (consumed by Member 4 Support & Finance).
 * 2. Shared API: GET /api/v1/operations/warranties/:serialNumber
 * 3. Normalized Statuses: WITHIN_PERIOD, EXPIRED, VOID, NOT_ACTIVE.
 * 4. Activation events: DELIVERY (default per [NC-02]) or HANDOVER.
 * 5. Dynamic Expiry: Calculates exact end date using interval arithmetic based on product warranty terms.
 * 6. Warranty claims & replacement unit tracking.
 */

import { OperationsDb } from './db.adapter.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

export const WarrantiesService = {
  /**
   * Unified authoritative warranty lookup by serial number
   * Consumed by Member 4's warranty adapter and customer support portal.
   */
  async getWarrantyBySerialNumber(serialNumber) {
    if (!serialNumber) {
      throw { status: 400, message: 'serialNumber is required' };
    }

    const cleanSn = String(serialNumber).trim();
    const store = OperationsDb.getStore();
    const sItem = store.serialItems.get(cleanSn);

    if (!sItem) {
      throw {
        status: 404,
        code: 'SERIAL_NOT_FOUND',
        message: `Serial item '${cleanSn}' does not exist in authoritative serial registry.`
      };
    }

    const prod = store.products.find(p => p.id === sItem.productId);
    let record = store.warrantyRecords.get(cleanSn);

    // If unit is in warehouse or returned, status is NOT_ACTIVE or VOID
    if (!record) {
      if (sItem.status === 'IN_WAREHOUSE' || sItem.status === 'RESERVED') {
        return {
          serialNumber: cleanSn,
          status: 'NOT_ACTIVE',
          product: {
            id: sItem.productId,
            sku: sItem.sku,
            name: sItem.productName,
            category: sItem.category
          },
          terms: {
            durationMonths: prod?.warrantyMonths || 24,
            startDate: null,
            endDate: null,
            activatedOnEvent: null
          },
          serviceBilling: {
            isPartsCovered: false,
            isLaborCovered: false,
            reason: 'Unit has not been delivered or activated at site.'
          },
          claimsHistory: []
        };
      }

      if (sItem.status === 'QUARANTINED' || sItem.status === 'DECOMMISSIONED') {
        return {
          serialNumber: cleanSn,
          status: 'VOID',
          product: {
            id: sItem.productId,
            sku: sItem.sku,
            name: sItem.productName,
            category: sItem.category
          },
          terms: null,
          serviceBilling: {
            isPartsCovered: false,
            isLaborCovered: false,
            reason: 'Serial unit is quarantined or decommissioned.'
          },
          claimsHistory: []
        };
      }

      // Auto-synthesize active record if already installed/dispatched
      const startDate = new Date(sItem.createdAt || Date.now());
      const termsMonths = prod?.warrantyMonths || 24;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + termsMonths);

      record = {
        id: `war-${cleanSn}`,
        serialNumber: cleanSn,
        productId: sItem.productId,
        productName: sItem.productName,
        category: sItem.category,
        status: new Date() <= endDate ? 'WITHIN_PERIOD' : 'EXPIRED',
        termsMonths,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        activatedOnEvent: 'DELIVERY',
        createdAt: sItem.createdAt
      };
      store.warrantyRecords.set(cleanSn, record);
    }

    // Evaluate dynamic expiration against today's date
    const today = new Date().toISOString().split('T')[0];
    let computedStatus = record.status;
    if (record.status !== 'VOID' && record.endDate) {
      computedStatus = today <= record.endDate ? 'WITHIN_PERIOD' : 'EXPIRED';
      record.status = computedStatus;
    }

    // Find claims history
    const claims = store.warrantyClaims.filter(c => c.serialNumber === cleanSn);

    const isCovered = computedStatus === 'WITHIN_PERIOD';

    return {
      serialNumber: cleanSn,
      status: computedStatus,
      product: {
        id: sItem.productId,
        sku: sItem.sku,
        name: sItem.productName,
        category: sItem.category
      },
      terms: {
        durationMonths: record.termsMonths,
        startDate: record.startDate,
        endDate: record.endDate,
        activatedOnEvent: record.activatedOnEvent || 'DELIVERY',
        manufacturerWarrantyYears: Math.round(record.termsMonths / 12)
      },
      serviceBilling: {
        isPartsCovered: isCovered,
        isLaborCovered: isCovered,
        rateNotice: isCovered
          ? 'Covered under warranty (₹0 billable for covered parts & labor).'
          : 'Warranty expired (Parts and field service visits are billable to customer).'
      },
      claimsHistory: claims
    };
  },

  /**
   * Explicitly activate or adjust warranty record
   */
  async activateWarranty({ serialNumber, startDate, termsMonths, event = 'DELIVERY', user }) {
    const cleanSn = String(serialNumber).trim();
    const store = OperationsDb.getStore();
    const sItem = store.serialItems.get(cleanSn);

    if (!sItem) {
      throw { status: 404, message: `Serial item ${cleanSn} not found.` };
    }

    const prod = store.products.find(p => p.id === sItem.productId);
    const duration = termsMonths || prod?.warrantyMonths || 24;

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + duration);

    const todayStr = new Date().toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const status = todayStr <= endStr ? 'WITHIN_PERIOD' : 'EXPIRED';

    const record = {
      id: `war-${Date.now()}-${cleanSn}`,
      serialNumber: cleanSn,
      productId: sItem.productId,
      productName: sItem.productName,
      category: sItem.category,
      status,
      termsMonths: duration,
      startDate: start.toISOString().split('T')[0],
      endDate: endStr,
      activatedOnEvent: event,
      createdAt: new Date().toISOString()
    };

    store.warrantyRecords.set(cleanSn, record);

    await recordAuditLog({
      userId: user?.id || 'system',
      action: 'WARRANTY_ACTIVATED',
      entity: 'warranty_records',
      entityId: cleanSn,
      details: { status, startDate: record.startDate, endDate: record.endDate, duration }
    });

    return record;
  },

  /**
   * Log a warranty claim against a serial item
   */
  async createClaim({
    serialNumber,
    issueDescription,
    claimType = 'REPAIR',
    reportedBy,
    user
  }) {
    const cleanSn = String(serialNumber).trim();
    const store = OperationsDb.getStore();

    const warrantyInfo = await this.getWarrantyBySerialNumber(cleanSn);

    const claimId = `CLM-2026-${String(store.warrantyClaims.length + 1).padStart(4, '0')}`;
    const timestamp = new Date().toISOString();

    const claim = {
      id: claimId,
      serialNumber: cleanSn,
      productSku: warrantyInfo.product.sku,
      productName: warrantyInfo.product.name,
      issueDescription,
      claimType,
      status: 'OPEN',
      coverageStatusAtClaim: warrantyInfo.status,
      isBillable: warrantyInfo.status !== 'WITHIN_PERIOD',
      reportedBy: reportedBy || user?.fullName || 'Customer Support',
      replacementSerialNumber: null,
      createdAt: timestamp,
      resolvedAt: null
    };

    store.warrantyClaims.push(claim);

    await recordAuditLog({
      userId: user?.id || 'support',
      action: 'WARRANTY_CLAIM_LOGGED',
      entity: 'warranty_claims',
      entityId: claimId,
      details: { serialNumber: cleanSn, coverageStatus: warrantyInfo.status }
    });

    return claim;
  },

  /**
   * List warranty claims with optional status filter
   */
  async listClaims(filters = {}) {
    const store = OperationsDb.getStore();
    let list = [...store.warrantyClaims];

    if (filters.status) {
      list = list.filter(c => c.status === filters.status);
    }
    if (filters.serialNumber) {
      list = list.filter(c => c.serialNumber === filters.serialNumber);
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};
