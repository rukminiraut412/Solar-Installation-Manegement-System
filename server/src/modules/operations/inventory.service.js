/**
 * Operations Inventory Service (Phase 1)
 * Invariants: available_quantity = on_hand_quantity - reserved_quantity (non-negative)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.3) & docs/contracts/operations.md (§3, §6)
 */

import { OperationsDb } from './db.adapter.js';
import { ProductsService } from './products.service.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

export const InventoryService = {
  /**
   * Get warehouse stock balances for all products
   */
  async getInventorySummary() {
    const sql = `
      SELECT 
        p.id AS product_id,
        p.sku,
        p.name,
        p.category,
        p.unit,
        p.min_safety_stock,
        COALESCE(i.warehouse_location, 'Main Central Warehouse') AS warehouse_location,
        COALESCE(i.storage_bin, 'BIN-A1') AS storage_bin,
        COALESCE(i.on_hand_quantity, 0) AS on_hand_quantity,
        COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
        (COALESCE(i.on_hand_quantity, 0) - COALESCE(i.reserved_quantity, 0)) AS available_quantity
      FROM products p
      LEFT JOIN inventory_items i ON p.id = i.product_id
      WHERE p.is_active = true
      ORDER BY p.category, p.name;
    `;
    const sqlRes = await OperationsDb.execute(sql);
    if (sqlRes && sqlRes.rows) return sqlRes.rows;

    const store = OperationsDb.getStore();
    const result = [];
    for (const prod of store.products) {
      const inv = store.inventory.get(prod.id) || { onHandQuantity: 0, reservedQuantity: 0 };
      const onHand = inv.onHandQuantity || 0;
      const reserved = inv.reservedQuantity || 0;
      const available = Math.max(0, onHand - reserved);
      result.push({
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        minSafetyStock: prod.minSafetyStock,
        warehouseLocation: inv.warehouseLocation || 'Main Central Warehouse',
        storageBin: inv.storageBin || 'BIN-A1',
        onHandQuantity: onHand,
        reservedQuantity: reserved,
        availableQuantity: available,
        isLowStock: available <= prod.minSafetyStock
      });
    }
    return result;
  },

  /**
   * Get immutable stock ledger transaction history
   */
  async getLedgerHistory(filters = {}) {
    let sql = `
      SELECT l.*, p.sku, p.name AS product_name
      FROM inventory_ledger l
      JOIN products p ON l.product_id = p.id
    `;
    const params = [];
    if (filters.productId) {
      params.push(filters.productId);
      sql += ` WHERE l.product_id = $${params.length}`;
    }
    sql += ' ORDER BY l.created_at DESC LIMIT 100;';

    const sqlRes = await OperationsDb.execute(sql, params);
    if (sqlRes && sqlRes.rows) return sqlRes.rows;

    return OperationsDb.getStore().ledger;
  },

  /**
   * Record Goods Received Note (GRN) and update stock
   */
  async recordStockReceipt(receiptData, actorId) {
    const vendor = receiptData.vendorName || receiptData.supplierName;
    if (!vendor || !receiptData.invoiceNumber || !receiptData.items?.length) {
      const err = new Error('Vendor/Supplier name, invoice number, and at least one item are required.');
      err.status = 400;
      err.code = 'INVALID_GRN_PAYLOAD';
      throw err;
    }

    const store = OperationsDb.getStore();
    const grnId = `grn-${Date.now()}`;
    const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const grnRecord = {
      id: grnId,
      grnNumber,
      vendorName: vendor,
      invoiceNumber: receiptData.invoiceNumber,
      receiptDate: receiptData.receiptDate || new Date().toISOString().split('T')[0],
      notes: receiptData.notes || '',
      receivedBy: actorId,
      items: []
    };

    for (const item of receiptData.items) {
      const product = await ProductsService.getProductByIdOrSku(item.productId || item.sku);
      if (!product) {
        const err = new Error(`Product '${item.productId || item.sku}' not found.`);
        err.status = 404;
        err.code = 'PRODUCT_NOT_FOUND';
        throw err;
      }

      const qty = Number(item.quantity);
      if (qty <= 0) {
        const err = new Error('Receipt quantity must be greater than zero.');
        err.status = 400;
        err.code = 'INVALID_QUANTITY';
        throw err;
      }

      // Update in-memory inventory
      let inv = store.inventory.get(product.id);
      if (!inv) {
        inv = {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          warehouseLocation: 'Main Central Warehouse',
          storageBin: 'BIN-A1',
          onHandQuantity: 0,
          reservedQuantity: 0
        };
        store.inventory.set(product.id, inv);
      }

      inv.onHandQuantity += qty;
      const onHand = inv.onHandQuantity;
      const reserved = inv.reservedQuantity;
      const available = onHand - reserved;

      // Append immutable ledger entry
      const ledgerEntry = {
        id: `led-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        transactionType: 'PURCHASE_RECEIPT',
        quantityChange: qty,
        balanceOnHand: onHand,
        balanceReserved: reserved,
        balanceAvailable: available,
        referenceType: 'GRN',
        referenceId: grnNumber,
        notes: `Inbound receipt from ${receiptData.vendorName} (Inv: ${receiptData.invoiceNumber})`,
        createdBy: actorId,
        createdAt: new Date().toISOString()
      };
      store.ledger.unshift(ledgerEntry);

      // Register serial numbers if provided
      if (product.isSerialized && Array.isArray(item.serialNumbers)) {
        for (const serialNum of item.serialNumbers) {
          if (!store.serialItems.has(serialNum)) {
            store.serialItems.set(serialNum, {
              id: `ser-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              serialNumber: serialNum,
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              status: 'IN_WAREHOUSE',
              unitCostPaise: Math.round(Number(item.unitCost || product.unitCost) * 100),
              projectId: null,
              customerId: null,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      grnRecord.items.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: qty,
        unitCost: item.unitCost || product.unitCost,
        newOnHand: inv.onHandQuantity,
        serialsCount: item.serialNumbers?.length || 0
      });
    }

    store.grns.unshift(grnRecord);

    await recordAuditLog({
      userId: actorId,
      action: 'STOCK_RECEIPT_RECORDED',
      entity: 'STOCK_RECEIPT',
      entityId: grnId,
      newValues: { grnNumber, vendorName: grnRecord.vendorName, invoiceNumber: receiptData.invoiceNumber, itemsCount: receiptData.items.length }
    }).catch(() => {});

    return grnRecord;
  },

  async receiveGoods(receiptData) {
    return this.recordStockReceipt(receiptData, receiptData.userId || 'system');
  },

  /**
   * Submit physical inventory count adjustment (gated for Admin approval if > ₹2,000 [NC-23])
   */
  async submitStockAdjustment(data, actorUser) {
    const product = await ProductsService.getProductByIdOrSku(data.productId || data.sku);
    if (!product) {
      const err = new Error('Product not found for adjustment.');
      err.status = 404;
      err.code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const store = OperationsDb.getStore();
    const inv = store.inventory.get(product.id) || { onHandQuantity: 0, reservedQuantity: 0 };
    const systemQty = inv.onHandQuantity;

    let countedQty = data.countedQty;
    if (countedQty === undefined && data.adjustmentQuantity !== undefined) {
      countedQty = systemQty + Number(data.adjustmentQuantity);
    }
    countedQty = Number(countedQty);

    if (isNaN(countedQty) || countedQty < 0) {
      const err = new Error('Counted quantity must be a non-negative number.');
      err.status = 400;
      err.code = 'INVALID_COUNT_QTY';
      throw err;
    }

    const variance = countedQty - systemQty;
    const varianceCost = Math.abs(variance * Number(product.unitCost || 0));

    // Governance: Variance > ₹2,000 requires Admin digital approval ([NC-23])
    const requiresAdminApproval = varianceCost > 2000.00;
    const isAdmin = actorUser.role === 'Admin/Owner' || actorUser.role === 'Admin' || actorUser.role === 'ADMIN';

    if (requiresAdminApproval && !isAdmin && !data.isApprovedByAdmin) {
      const err = new Error('Inventory variance exceeds ₹2,000 threshold. Admin digital approval is required.');
      err.status = 403;
      err.code = 'ADMIN_APPROVAL_REQUIRED';
      throw err;
    }

    const correction = {
      id: `corr-${Date.now()}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      systemQty,
      countedQty,
      variance,
      varianceCost,
      reasonCode: data.reasonCode || 'AUDIT_CORRECTION',
      notes: data.notes || '',
      requiresAdminApproval,
      status: (!requiresAdminApproval || isAdmin) ? 'APPROVED' : 'PENDING',
      requestedBy: actorUser.id,
      approvedBy: (!requiresAdminApproval || isAdmin) ? actorUser.id : null,
      approvedAt: (!requiresAdminApproval || isAdmin) ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    };

    // If auto-approved, apply immediately
    if (correction.status === 'APPROVED') {
      inv.onHandQuantity = countedQty;
      const onHand = inv.onHandQuantity;
      const reserved = inv.reservedQuantity;
      const available = Math.max(0, onHand - reserved);

      store.ledger.unshift({
        id: `led-${Date.now()}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        transactionType: 'AUDIT_CORRECTION',
        quantityChange: variance,
        balanceOnHand: onHand,
        balanceReserved: reserved,
        balanceAvailable: available,
        referenceType: 'INVENTORY_CORRECTION',
        referenceId: correction.id,
        notes: `Physical count adjustment (${correction.reasonCode}) by ${actorUser.email || actorUser.id}`,
        createdBy: actorUser.id,
        createdAt: new Date().toISOString()
      });
    }

    store.corrections.unshift(correction);

    await recordAuditLog({
      userId: actorUser.id,
      action: correction.status === 'APPROVED' ? 'INVENTORY_CORRECTION_APPLIED' : 'INVENTORY_CORRECTION_PENDING_APPROVAL',
      entity: 'INVENTORY_CORRECTION',
      entityId: correction.id,
      newValues: { productId: product.id, variance, varianceCost, status: correction.status }
    }).catch(() => {});

    return correction;
  },

  async adjustStock(data) {
    const actorUser = data.user || { id: data.userId || 'system', role: data.isApprovedByAdmin ? 'Admin/Owner' : 'Warehouse' };
    return this.submitStockAdjustment(data, actorUser);
  }
};
