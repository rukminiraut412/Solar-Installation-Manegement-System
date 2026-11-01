/**
 * Operations Serial Number Tracking Service (Phase 3)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.2, §7.3) & docs/contracts/operations.md (§5)
 * 
 * Invariants:
 * 1. Authoritative serial table is `serial_items`.
 * 2. Serial numbers are globally unique.
 * 3. 100% barcode/QR scan verification before dispatch.
 * 4. 360-degree traceability from GRN receipt -> Dispatch -> Rooftop Installation -> Warranty.
 * 5. Damaged/returned hardware tracking with quarantine lifecycle.
 */

import { OperationsDb } from './db.adapter.js';
import { ProductsService } from './products.service.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

export const SerialsService = {
  /**
   * Register a single or batch of new serial numbers into the authoritative serial_items table
   */
  async registerSerials({ sku, productId, serialNumbers, grnNumber, unitCostPaise, userId = 'system' }) {
    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      throw { status: 400, message: 'serialNumbers must be a non-empty array' };
    }

    const store = OperationsDb.getStore();

    // Resolve product
    let product = null;
    if (productId) {
      product = await ProductsService.getProductById(productId);
    } else if (sku) {
      product = await ProductsService.getProductBySku(sku);
    }

    if (!product) {
      throw { status: 404, message: `Product not found for SKU: ${sku || productId}` };
    }

    if (!product.isSerialized) {
      throw { status: 400, message: `Product ${product.sku} is not configured as serialized.` };
    }

    // Verify all serials are unique and not already registered
    const existing = [];
    for (const sn of serialNumbers) {
      const cleanSn = String(sn).trim();
      if (store.serialItems.has(cleanSn)) {
        existing.push(cleanSn);
      }
    }

    if (existing.length > 0) {
      throw {
        status: 409,
        code: 'DUPLICATE_SERIAL_NUMBER',
        message: `The following serial numbers are already registered in the system: ${existing.join(', ')}`,
        duplicateSerials: existing
      };
    }

    const registered = [];
    const timestamp = new Date().toISOString();

    for (const sn of serialNumbers) {
      const cleanSn = String(sn).trim();
      const serialItem = {
        id: `ser-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        serialNumber: cleanSn,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        status: 'IN_WAREHOUSE',
        grnNumber: grnNumber || null,
        unitCostPaise: unitCostPaise || Math.round(product.unitCost * 100),
        projectId: null,
        customerId: null,
        dispatchOrderId: null,
        installationJobId: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      store.serialItems.set(cleanSn, serialItem);
      registered.push(serialItem);

      // Audit log entry
      store.serialAudit.push({
        id: `audit-sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        serialNumber: cleanSn,
        previousStatus: null,
        newStatus: 'IN_WAREHOUSE',
        action: 'SERIAL_REGISTERED',
        changedBy: userId,
        notes: `Registered via GRN: ${grnNumber || 'MANUAL'}`,
        createdAt: timestamp
      });
    }

    await recordAuditLog({
      userId,
      action: 'SERIAL_NUMBERS_REGISTERED',
      entity: 'serial_items',
      entityId: product.id,
      details: { count: registered.length, sku: product.sku }
    });

    return {
      success: true,
      count: registered.length,
      product: { id: product.id, sku: product.sku, name: product.name },
      items: registered
    };
  },

  /**
   * 360-degree traceability lookup by serial number
   */
  async getSerialTraceability(serialNumber) {
    if (!serialNumber) {
      throw { status: 400, message: 'serialNumber is required' };
    }

    const cleanSn = String(serialNumber).trim();
    const store = OperationsDb.getStore();
    const item = store.serialItems.get(cleanSn);

    if (!item) {
      throw {
        status: 404,
        code: 'SERIAL_NOT_FOUND',
        message: `Serial number '${cleanSn}' is not registered in the system.`
      };
    }

    // Trace audit history
    const auditHistory = store.serialAudit
      .filter(a => a.serialNumber === cleanSn)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Trace dispatch order
    let dispatch = null;
    if (item.dispatchOrderId) {
      dispatch = store.dispatchOrders.get(item.dispatchOrderId) || null;
    }

    // Trace warranty
    const warranty = store.warrantyRecords.get(cleanSn) || null;

    // Trace installation job
    let installation = null;
    if (item.installationJobId) {
      installation = store.installationJobs.get(item.installationJobId) || null;
    }

    return {
      serialItem: item,
      dispatchManifest: dispatch ? {
        id: dispatch.id,
        manifestNumber: dispatch.manifestNumber,
        status: dispatch.status,
        dispatchedAt: dispatch.dispatchedAt,
        deliveredAt: dispatch.deliveredAt
      } : null,
      installation: installation ? {
        id: installation.id,
        status: installation.status,
        scheduledDate: installation.scheduledDate,
        completedAt: installation.completedAt
      } : null,
      warranty: warranty ? {
        status: warranty.status,
        startDate: warranty.startDate,
        endDate: warranty.endDate,
        termsMonths: warranty.termsMonths
      } : null,
      history: auditHistory
    };
  },

  /**
   * Scan barcode / QR to verify serial against dispatch order
   */
  async verifySerialForDispatch({ dispatchOrderId, serialNumber, userId = 'system' }) {
    const cleanSn = String(serialNumber).trim();
    const store = OperationsDb.getStore();

    const dispatch = store.dispatchOrders.get(dispatchOrderId);
    if (!dispatch) {
      throw { status: 404, message: `Dispatch order '${dispatchOrderId}' not found.` };
    }

    if (dispatch.status !== 'PACKING' && dispatch.status !== 'PENDING') {
      throw {
        status: 400,
        message: `Cannot scan serials for dispatch order in status '${dispatch.status}'.`
      };
    }

    const item = store.serialItems.get(cleanSn);
    if (!item) {
      throw {
        status: 404,
        code: 'SERIAL_NOT_FOUND',
        message: `Scanned serial number '${cleanSn}' does not exist in inventory.`
      };
    }

    if (item.status !== 'IN_WAREHOUSE' && item.status !== 'RESERVED') {
      throw {
        status: 400,
        code: 'INVALID_SERIAL_STATUS',
        message: `Serial '${cleanSn}' is currently in status '${item.status}'. Only warehouse stock can be dispatched.`
      };
    }

    // Verify serial matches one of the serialized items on the dispatch manifest
    const manifestItem = dispatch.items.find(i => i.productId === item.productId || (i.sku && item.sku && i.sku.toUpperCase() === item.sku.toUpperCase()));
    if (!manifestItem) {
      throw {
        status: 422,
        code: 'SERIAL_NOT_ON_MANIFEST',
        message: `Scanned component '${item.productName}' (${item.sku}) is not part of dispatch order ${dispatch.manifestNumber}.`
      };
    }

    // Check if already scanned on this manifest
    if (dispatch.scannedSerials.includes(cleanSn)) {
      return {
        verified: true,
        alreadyScanned: true,
        message: `Serial '${cleanSn}' was already scanned for this dispatch order.`,
        serialItem: item
      };
    }

    // Check if required quantity for this product has already been fully scanned
    const alreadyScannedForProd = dispatch.scannedSerials.filter(sn => {
      const sItem = store.serialItems.get(sn);
      return sItem && (sItem.productId === manifestItem.productId || (sItem.sku && manifestItem.sku && sItem.sku.toUpperCase() === manifestItem.sku.toUpperCase()));
    }).length;

    if (alreadyScannedForProd >= manifestItem.quantity) {
      throw {
        status: 400,
        code: 'SCAN_QUOTA_EXCEEDED',
        message: `All ${manifestItem.quantity} required units for SKU '${item.sku}' have already been scanned.`
      };
    }

    // Add to scanned list
    dispatch.scannedSerials.push(cleanSn);

    // Update serial status to RESERVED / PENDING_DISPATCH
    const oldStatus = item.status;
    item.status = 'RESERVED';
    item.dispatchOrderId = dispatchOrderId;
    item.projectId = dispatch.projectId;

    store.serialAudit.push({
      id: `audit-sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serialNumber: cleanSn,
      previousStatus: oldStatus,
      newStatus: 'RESERVED',
      action: 'SCANNED_FOR_DISPATCH',
      changedBy: userId,
      notes: `Verified for Dispatch Order ${dispatch.manifestNumber}`,
      createdAt: new Date().toISOString()
    });

    return {
      verified: true,
      alreadyScanned: false,
      serialNumber: cleanSn,
      productName: item.productName,
      sku: item.sku,
      totalScanned: dispatch.scannedSerials.length,
      scannedForProduct: alreadyScannedForProd + 1,
      requiredForProduct: manifestItem.quantity
    };
  },

  /**
   * Quarantine a damaged or returned serial item
   */
  async quarantineSerial({ serialNumber, reason, newStatus = 'QUARANTINED', userId = 'system' }) {
    const cleanSn = String(serialNumber).trim();
    const store = OperationsDb.getStore();
    const item = store.serialItems.get(cleanSn);

    if (!item) {
      throw { status: 404, message: `Serial item '${cleanSn}' not found.` };
    }

    const validQuarantineStatuses = ['QUARANTINED', 'RETURNED_DEFECTIVE', 'DECOMMISSIONED'];
    if (!validQuarantineStatuses.includes(newStatus)) {
      throw { status: 400, message: `Invalid quarantine status: ${newStatus}` };
    }

    const oldStatus = item.status;
    item.status = newStatus;
    item.quarantineReason = reason || 'Damaged in transit / field inspection failure';
    item.updatedAt = new Date().toISOString();

    // Log serial audit
    store.serialAudit.push({
      id: `audit-sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serialNumber: cleanSn,
      previousStatus: oldStatus,
      newStatus,
      action: 'SERIAL_QUARANTINED',
      changedBy: userId,
      notes: item.quarantineReason,
      createdAt: new Date().toISOString()
    });

    await recordAuditLog({
      userId,
      action: 'SERIAL_QUARANTINED',
      entity: 'serial_items',
      entityId: cleanSn,
      details: { previousStatus: oldStatus, newStatus, reason: item.quarantineReason }
    });

    return {
      success: true,
      serialNumber: cleanSn,
      status: newStatus,
      reason: item.quarantineReason,
      message: `Serial item ${cleanSn} transitioned to ${newStatus}.`
    };
  },

  /**
   * Search / filter serial items
   */
  async listSerials(filters = {}) {
    const store = OperationsDb.getStore();
    let items = Array.from(store.serialItems.values());

    if (filters.status) {
      items = items.filter(i => i.status === filters.status);
    }
    if (filters.productId) {
      items = items.filter(i => i.productId === filters.productId);
    }
    if (filters.sku) {
      items = items.filter(i => i.sku === filters.sku);
    }
    if (filters.projectId) {
      items = items.filter(i => i.projectId === filters.projectId);
    }

    return items;
  }
};
