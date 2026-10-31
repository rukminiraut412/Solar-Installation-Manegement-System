/**
 * Operations Stock Reservation & Shortage Service (Phase 2)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.2, §7.3) & docs/contracts/operations.md (§4)
 * 
 * Rules:
 * 1. Consumes Member 2's frozen commercial quotation BOM snapshot.
 * 2. Never creates competing quotation BOM tables.
 * 3. Enforces unmapped SKU rejection (422 UNMAPPED_BOM_SKU).
 * 4. Ensures idempotent re-handover (200 ALREADY_INITIALIZED).
 * 5. Invariant: available_quantity = on_hand_quantity - reserved_quantity (non-negative).
 * 6. Safely flags shortages with exact missing quantities.
 */

import { OperationsDb } from './db.adapter.js';
import { ProductsService } from './products.service.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

export const ReservationsService = {
  /**
   * Ingest frozen commercial BOM items from Member 2 (Project Handover)
   * Validates SKU mapping and prevents duplicate initialization.
   */
  async ingestProjectBom({ projectId, orderId, bomItems, userId = 'system' }) {
    if (!projectId) {
      throw { status: 400, message: 'projectId is required for BOM handover' };
    }
    if (!Array.isArray(bomItems) || bomItems.length === 0) {
      throw { status: 400, message: 'bomItems must be a non-empty array' };
    }

    const store = OperationsDb.getStore();

    // Check idempotency: If items already exist for this project, return existing
    const existingItems = await this.getProjectBom(projectId);
    if (existingItems && existingItems.length > 0) {
      return {
        status: 'ALREADY_INITIALIZED',
        message: 'BOM items for this project have already been initialized.',
        projectId,
        itemsCount: existingItems.length,
        items: existingItems
      };
    }

    // Validate SKU mapping for every item against active products
    const allProducts = await ProductsService.getAllProducts();
    const productBySku = new Map();
    for (const p of allProducts) {
      productBySku.set(p.sku, p);
    }

    const validatedItems = [];
    for (const item of bomItems) {
      const matchedProd = productBySku.get(item.sku);
      if (!matchedProd) {
        throw {
          status: 422,
          code: 'UNMAPPED_BOM_SKU',
          message: `Commercial quotation SKU '${item.sku}' cannot be mapped to an authoritative warehouse product. Operations cannot initialize fulfilment.`,
          unmappedSku: item.sku
        };
      }
      validatedItems.push({
        id: `bom-${projectId}-${item.sku}`,
        projectId,
        orderId: orderId || null,
        productId: matchedProd.id,
        category: matchedProd.category,
        sku: item.sku,
        name: matchedProd.name,
        quantityRequired: Number(item.quantity) || 1,
        quantityReserved: 0,
        quantityDispatched: 0,
        unit: item.unit || matchedProd.unit,
        isSerialized: matchedProd.isSerialized,
        unitCost: matchedProd.unitCost,
        unitPrice: matchedProd.unitPrice
      });
    }

    // Persist validated items
    for (const vItem of validatedItems) {
      store.projectBomItems.set(vItem.id, vItem);
    }

    await recordAuditLog({
      userId,
      action: 'BOM_HANDOVER_INITIALIZED',
      entity: 'project_bom_items',
      entityId: projectId,
      details: { itemsCount: validatedItems.length, orderId }
    });

    return {
      status: 'INITIALIZED',
      message: 'Project BOM items successfully initialized for fulfilment.',
      projectId,
      itemsCount: validatedItems.length,
      items: validatedItems
    };
  },

  /**
   * Get project BOM items
   */
  async getProjectBom(projectId) {
    const store = OperationsDb.getStore();
    const items = [];
    for (const [_, item] of store.projectBomItems.entries()) {
      if (item.projectId === projectId) {
        items.push(item);
      }
    }
    return items;
  },

  /**
   * Reserve warehouse stock for accepted project
   * Checks available quantity (on_hand - reserved) for each BOM line.
   * If any shortage exists, flags SHORTAGE_FLAGGED with exact deficit.
   */
  async reserveStock({ projectId, orderId, userId = 'system' }) {
    const store = OperationsDb.getStore();
    const bomItems = await this.getProjectBom(projectId);

    if (bomItems.length === 0) {
      throw {
        status: 404,
        message: `No BOM items found for project ${projectId}. Perform handover first.`
      };
    }

    // Check if already fully reserved
    const allReserved = bomItems.every(i => i.quantityReserved >= i.quantityRequired);
    if (allReserved) {
      return {
        success: true,
        status: 'ALREADY_RESERVED',
        projectId,
        message: 'Stock is already fully reserved for this project.'
      };
    }

    // Evaluate availability and shortage per SKU
    const shortages = [];
    const reservationsToMake = [];

    for (const item of bomItems) {
      const remainingNeeded = item.quantityRequired - item.quantityReserved;
      if (remainingNeeded <= 0) continue;

      const inv = store.inventory.get(item.productId) || { onHandQuantity: 0, reservedQuantity: 0 };
      const onHand = inv.onHandQuantity || 0;
      const reserved = inv.reservedQuantity || 0;
      const available = Math.max(0, onHand - reserved);

      if (available < remainingNeeded) {
        shortages.push({
          sku: item.sku,
          name: item.name,
          productId: item.productId,
          required: item.quantityRequired,
          alreadyReserved: item.quantityReserved,
          deficit: remainingNeeded - available,
          onHand,
          totalReserved: reserved,
          currentlyAvailable: available
        });
      } else {
        reservationsToMake.push({
          item,
          quantityToReserve: remainingNeeded
        });
      }
    }

    // If there are shortages, flag shortage and do not execute partial commit unless configured
    if (shortages.length > 0) {
      await recordAuditLog({
        userId,
        action: 'STOCK_RESERVATION_SHORTAGE',
        entity: 'projects',
        entityId: projectId,
        details: { shortages }
      });

      return {
        success: false,
        status: 'SHORTAGE_FLAGGED',
        projectId,
        message: `Stock reservation cannot be completed due to component shortages on ${shortages.length} item(s).`,
        shortages,
        timestamp: new Date().toISOString()
      };
    }

    // All items available: Execute reservation atomically
    for (const { item, quantityToReserve } of reservationsToMake) {
      const inv = store.inventory.get(item.productId);
      inv.reservedQuantity += quantityToReserve;

      item.quantityReserved += quantityToReserve;

      // Log reservation ledger movement
      const ledgerEntry = {
        id: `led-${Date.now()}-${item.sku}`,
        productId: item.productId,
        movementType: 'RESERVATION',
        quantity: quantityToReserve,
        referenceType: 'PROJECT_BOM',
        referenceId: projectId,
        notes: `Stock reserved for project ${projectId}`,
        createdAt: new Date().toISOString()
      };
      store.ledger.push(ledgerEntry);
    }

    const resRecord = {
      id: `res-${projectId}-${Date.now()}`,
      projectId,
      orderId,
      status: 'RESERVED',
      reservedBy: userId,
      reservedAt: new Date().toISOString()
    };
    store.reservations.set(projectId, resRecord);

    await recordAuditLog({
      userId,
      action: 'STOCK_RESERVED_FOR_PROJECT',
      entity: 'projects',
      entityId: projectId,
      details: { itemsReserved: reservationsToMake.length }
    });

    return {
      success: true,
      status: 'RESERVED',
      projectId,
      message: 'All required project materials successfully reserved from warehouse stock.',
      reservedAt: resRecord.reservedAt
    };
  },

  /**
   * Release reserved stock back to warehouse available pool (e.g. project cancellation)
   */
  async releaseReservation({ projectId, userId = 'system' }) {
    const store = OperationsDb.getStore();
    const bomItems = await this.getProjectBom(projectId);

    let releasedCount = 0;
    for (const item of bomItems) {
      if (item.quantityReserved > 0) {
        const inv = store.inventory.get(item.productId);
        if (inv) {
          inv.reservedQuantity = Math.max(0, inv.reservedQuantity - item.quantityReserved);
        }
        releasedCount += item.quantityReserved;
        item.quantityReserved = 0;
      }
    }

    store.reservations.delete(projectId);

    await recordAuditLog({
      userId,
      action: 'STOCK_RESERVATION_RELEASED',
      entity: 'projects',
      entityId: projectId,
      details: { releasedUnits: releasedCount }
    });

    return {
      success: true,
      projectId,
      releasedUnits: releasedCount,
      message: 'Stock reservation successfully released back to available inventory.'
    };
  },

  /**
   * Shortage Dashboard query: View all unfulfilled BOM requirements across active projects
   */
  async getShortagesSummary() {
    const store = OperationsDb.getStore();
    const shortageMap = new Map();

    for (const [_, item] of store.projectBomItems.entries()) {
      const deficit = item.quantityRequired - item.quantityReserved;
      if (deficit > 0) {
        const inv = store.inventory.get(item.productId) || { onHandQuantity: 0, reservedQuantity: 0 };
        const available = Math.max(0, inv.onHandQuantity - inv.reservedQuantity);

        if (!shortageMap.has(item.sku)) {
          shortageMap.set(item.sku, {
            sku: item.sku,
            name: item.name,
            category: item.category,
            productId: item.productId,
            totalDeficit: 0,
            onHand: inv.onHandQuantity,
            available,
            affectedProjects: []
          });
        }

        const summary = shortageMap.get(item.sku);
        summary.totalDeficit += deficit;
        summary.affectedProjects.push({
          projectId: item.projectId,
          required: item.quantityRequired,
          reserved: item.quantityReserved,
          missing: deficit
        });
      }
    }

    return Array.from(shortageMap.values());
  }
};
