/**
 * Operations Dispatch & Delivery Challan Service (Phase 2)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.3) & docs/contracts/operations.md (§4, §6)
 * 
 * Rules:
 * 1. Advance Payment Gate: Checks order payment status or financial ledger before dispatch.
 * 2. Admin Override: Permitted only with ADMIN role and audit logging (DISPATCH_PAYMENT_OVERRIDE).
 * 3. Configurable Bypass: If payment gate disabled via [NC-05], logs DISPATCH_GATE_BYPASSED_BY_CONFIG.
 * 4. Duplicate Manifest Prevention: Blocks multiple active manifests for the same project.
 * 5. 100% Serial Verification Gate: Prevents dispatch if serialized items lack verified scans.
 * 6. Atomic Inventory Decrement: Decrements both on_hand and reserved quantities, updates stock ledger.
 * 7. Delivery Challan: Generates full structured delivery challan with transporter/materials details.
 */

import { OperationsDb } from './db.adapter.js';
import { ReservationsService } from './reservations.service.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

// Configurable advance payment policy [NC-05]
const CONFIG = {
  REQUIRE_ADVANCE_PAYMENT: process.env.DISPATCH_REQUIRE_ADVANCE_PAYMENT !== 'false',
  DEFAULT_ADVANCE_PERCENT: 25.0
};

export const DispatchService = {
  /**
   * Create a new dispatch order manifest against a project with reserved materials
   */
  async createDispatchOrder({
    projectId,
    orderId,
    destinationAddress,
    transporterName,
    vehicleNumber,
    driverName,
    driverPhone,
    overrideAdvancePayment = false,
    overrideReason = null,
    user
  }) {
    if (!projectId) {
      throw { status: 400, message: 'projectId is required' };
    }

    const store = OperationsDb.getStore();

    // 1. Prevent duplicate active dispatch manifests for the same project
    for (const [_, existing] of store.dispatchOrders.entries()) {
      if (existing.projectId === projectId && ['PENDING', 'PACKING', 'DISPATCHED'].includes(existing.status)) {
        throw {
          status: 409,
          code: 'DISPATCH_ALREADY_EXISTS',
          message: `Active dispatch order ${existing.manifestNumber} already exists for project ${projectId}.`,
          dispatchOrderId: existing.id
        };
      }
    }

    // 2. Fetch reserved project BOM items
    const bomItems = await ReservationsService.getProjectBom(projectId);
    if (!bomItems || bomItems.length === 0) {
      throw {
        status: 400,
        message: `Project ${projectId} has no BOM items. Complete BOM handover first.`
      };
    }

    const unreservedItems = bomItems.filter(i => i.quantityReserved <= 0);
    if (unreservedItems.length === bomItems.length) {
      throw {
        status: 400,
        code: 'NO_STOCK_RESERVED',
        message: 'No stock has been reserved for this project. Perform stock reservation before dispatch.'
      };
    }

    // 3. Advance Payment Gate Check
    if (CONFIG.REQUIRE_ADVANCE_PAYMENT) {
      // Mock payment check against order payment status or financial ledger
      const isPaid = orderId ? (orderId.includes('PAID') || orderId.startsWith('ord-paid')) : false;

      if (!isPaid) {
        if (overrideAdvancePayment) {
          // Verify user is ADMIN
          const isAdmin = user?.role === 'ADMIN' || user?.role === 'Admin/Owner' || user?.role === 'Admin';
          if (!isAdmin) {
            throw {
              status: 403,
              code: 'ADMIN_OVERRIDE_REQUIRED',
              message: 'Only users with the ADMIN role can override the dispatch advance payment requirement.'
            };
          }
          if (!overrideReason || overrideReason.trim().length < 5) {
            throw {
              status: 400,
              message: 'A detailed overrideReason is required when bypassing the advance payment gate.'
            };
          }

          await recordAuditLog({
            userId: user?.id || 'admin',
            action: 'DISPATCH_PAYMENT_OVERRIDE',
            entity: 'dispatch_orders',
            entityId: projectId,
            details: { projectId, orderId, reason: overrideReason }
          });
        } else {
          throw {
            status: 403,
            code: 'ADVANCE_PAYMENT_REQUIRED',
            message: `Dispatch blocked: Project order ${orderId || projectId} has not satisfied advance payment requirements.`,
            advanceRequiredPercent: CONFIG.DEFAULT_ADVANCE_PERCENT
          };
        }
      }
    } else {
      // Payment gate disabled by config — log audit trail
      await recordAuditLog({
        userId: user?.id || 'system',
        action: 'DISPATCH_GATE_BYPASSED_BY_CONFIG',
        entity: 'dispatch_orders',
        entityId: projectId,
        details: { configKey: 'DISPATCH_REQUIRE_ADVANCE_PAYMENT', value: false }
      });
    }

    // 4. Construct dispatch items from reserved BOM items
    const dispatchItems = [];
    for (const item of bomItems) {
      if (item.quantityReserved > 0) {
        dispatchItems.push({
          id: `disp-item-${Date.now()}-${item.sku}`,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity: item.quantityReserved,
          unit: item.unit,
          isSerialized: item.isSerialized
        });
      }
    }

    const manifestNumber = `DSP-2026-${String(store.dispatchOrders.size + 1).padStart(4, '0')}`;
    const dispatchOrder = {
      id: `disp-${Date.now()}`,
      manifestNumber,
      projectId,
      orderId: orderId || null,
      status: 'PACKING',
      destinationAddress: destinationAddress || 'Customer Installation Rooftop Site',
      transporterName: transporterName || 'SunPower Logistics',
      vehicleNumber: vehicleNumber || 'MH-12-SP-2026',
      driverName: driverName || 'Suresh Patil',
      driverPhone: driverPhone || '+91 98765 43210',
      items: dispatchItems,
      scannedSerials: [],
      createdAt: new Date().toISOString(),
      dispatchedAt: null,
      deliveredAt: null
    };

    store.dispatchOrders.set(dispatchOrder.id, dispatchOrder);

    await recordAuditLog({
      userId: user?.id || 'system',
      action: 'DISPATCH_ORDER_CREATED',
      entity: 'dispatch_orders',
      entityId: dispatchOrder.id,
      details: { manifestNumber, projectId, itemCount: dispatchItems.length }
    });

    return dispatchOrder;
  },

  /**
   * Confirm packing & dispatch — Enforces 100% serial scanning gate and decrements inventory
   */
  async confirmDispatch({ dispatchOrderId, user }) {
    const store = OperationsDb.getStore();
    const dispatch = store.dispatchOrders.get(dispatchOrderId);

    if (!dispatch) {
      throw { status: 404, message: `Dispatch order ${dispatchOrderId} not found.` };
    }

    if (dispatch.status !== 'PACKING') {
      throw {
        status: 400,
        message: `Dispatch order ${dispatch.manifestNumber} is in status '${dispatch.status}', cannot confirm dispatch.`
      };
    }

    // 100% Serial Scanning Gate: Check every serialized item on manifest
    const missingSerials = [];
    for (const item of dispatch.items) {
      if (item.isSerialized) {
        const scannedCount = dispatch.scannedSerials.filter(sn => {
          const s = store.serialItems.get(sn);
          return s && s.productId === item.productId;
        }).length;

        if (scannedCount < item.quantity) {
          missingSerials.push({
            sku: item.sku,
            name: item.name,
            requiredQuantity: item.quantity,
            scannedQuantity: scannedCount,
            missingCount: item.quantity - scannedCount
          });
        }
      }
    }

    if (missingSerials.length > 0) {
      throw {
        status: 400,
        code: 'SERIAL_VERIFICATION_INCOMPLETE',
        message: 'All serialized components must be physically scanned and verified before dispatch.',
        missingSerials
      };
    }

    // Atomic Inventory Decrement
    const timestamp = new Date().toISOString();
    for (const item of dispatch.items) {
      const inv = store.inventory.get(item.productId);
      if (inv) {
        inv.onHandQuantity = Math.max(0, inv.onHandQuantity - item.quantity);
        inv.reservedQuantity = Math.max(0, inv.reservedQuantity - item.quantity);
      }

      // Update project BOM item dispatched count
      const bomItemKey = `bom-${dispatch.projectId}-${item.sku}`;
      const bomItem = store.projectBomItems.get(bomItemKey);
      if (bomItem) {
        bomItem.quantityDispatched = (bomItem.quantityDispatched || 0) + item.quantity;
      }

      // Append immutable inventory ledger entry
      store.ledger.push({
        id: `led-${Date.now()}-${item.sku}`,
        productId: item.productId,
        movementType: 'DISPATCH',
        quantity: -item.quantity,
        referenceType: 'DISPATCH_ORDER',
        referenceId: dispatch.manifestNumber,
        notes: `Dispatched for project ${dispatch.projectId}`,
        createdAt: timestamp
      });
    }

    // Update scanned serial items to DISPATCHED
    for (const sn of dispatch.scannedSerials) {
      const sItem = store.serialItems.get(sn);
      if (sItem) {
        sItem.status = 'DISPATCHED';
        sItem.updatedAt = timestamp;

        store.serialAudit.push({
          id: `audit-sn-${Date.now()}-${sn}`,
          serialNumber: sn,
          previousStatus: 'RESERVED',
          newStatus: 'DISPATCHED',
          action: 'DISPATCH_CONFIRMED',
          changedBy: user?.id || 'system',
          notes: `Dispatched under manifest ${dispatch.manifestNumber}`,
          createdAt: timestamp
        });
      }
    }

    dispatch.status = 'DISPATCHED';
    dispatch.dispatchedAt = timestamp;

    await recordAuditLog({
      userId: user?.id || 'system',
      action: 'DISPATCH_CONFIRMED',
      entity: 'dispatch_orders',
      entityId: dispatch.id,
      details: { manifestNumber: dispatch.manifestNumber, scannedSerials: dispatch.scannedSerials }
    });

    return {
      success: true,
      status: 'DISPATCHED',
      manifestNumber: dispatch.manifestNumber,
      dispatchedAt: dispatch.dispatchedAt,
      deliveryChallan: await this.generateDeliveryChallan(dispatch.id)
    };
  },

  /**
   * Confirm on-site delivery and automatically activate warranty per [NC-02]
   */
  async confirmDelivery({ dispatchOrderId, recipientName, user }) {
    const store = OperationsDb.getStore();
    const dispatch = store.dispatchOrders.get(dispatchOrderId);

    if (!dispatch) {
      throw { status: 404, message: `Dispatch order ${dispatchOrderId} not found.` };
    }

    if (dispatch.status !== 'DISPATCHED') {
      throw {
        status: 400,
        message: `Cannot confirm delivery for manifest in status '${dispatch.status}'. Must be 'DISPATCHED'.`
      };
    }

    const timestamp = new Date().toISOString();
    dispatch.status = 'DELIVERED';
    dispatch.deliveredAt = timestamp;
    dispatch.deliveredTo = recipientName || 'Site Engineer / Customer';

    // Auto-activate warranty for delivered serial items per [NC-02] default
    for (const sn of dispatch.scannedSerials) {
      const sItem = store.serialItems.get(sn);
      if (sItem) {
        sItem.status = 'INSTALLED'; // Ready for installation / installed on delivery
        sItem.updatedAt = timestamp;

        // Auto-create warranty record if product has warranty terms
        const prod = store.products.find(p => p.id === sItem.productId);
        const termsMonths = prod?.warrantyMonths || 24;

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + termsMonths);

        store.warrantyRecords.set(sn, {
          id: `war-${Date.now()}-${sn}`,
          serialNumber: sn,
          productId: sItem.productId,
          productName: sItem.productName,
          category: sItem.category,
          status: 'WITHIN_PERIOD',
          termsMonths,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          activatedOnEvent: 'DELIVERY',
          createdAt: timestamp
        });
      }
    }

    await recordAuditLog({
      userId: user?.id || 'system',
      action: 'DISPATCH_DELIVERED',
      entity: 'dispatch_orders',
      entityId: dispatch.id,
      details: { manifestNumber: dispatch.manifestNumber, recipient: dispatch.deliveredTo }
    });

    return {
      success: true,
      status: 'DELIVERED',
      manifestNumber: dispatch.manifestNumber,
      deliveredAt: dispatch.deliveredAt,
      recipient: dispatch.deliveredTo,
      warrantiesActivated: dispatch.scannedSerials.length
    };
  },

  /**
   * Generate structured Delivery Challan document
   */
  async generateDeliveryChallan(dispatchOrderId) {
    const store = OperationsDb.getStore();
    const dispatch = store.dispatchOrders.get(dispatchOrderId);

    if (!dispatch) {
      throw { status: 404, message: `Dispatch order ${dispatchOrderId} not found.` };
    }

    return {
      challanNumber: `DC-${dispatch.manifestNumber}`,
      issueDate: dispatch.dispatchedAt || dispatch.createdAt,
      company: {
        name: 'SunPower Solutions Pvt. Ltd.',
        address: 'Sector 4, Industrial Area, Pune, Maharashtra 411018',
        gstin: '27AABCS1429B1Z8',
        contact: '+91 20 2740 5000'
      },
      consignee: {
        projectId: dispatch.projectId,
        destinationAddress: dispatch.destinationAddress,
        orderId: dispatch.orderId
      },
      transport: {
        transporterName: dispatch.transporterName,
        vehicleNumber: dispatch.vehicleNumber,
        driverName: dispatch.driverName,
        driverPhone: dispatch.driverPhone
      },
      materials: dispatch.items.map(item => ({
        sku: item.sku,
        description: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        isSerialized: item.isSerialized
      })),
      verifiedSerials: dispatch.scannedSerials,
      status: dispatch.status,
      declarations: 'Goods dispatched for rooftop solar installation. Not for sale.'
    };
  },

  /**
   * List all dispatch orders
   */
  async listDispatchOrders(filters = {}) {
    const store = OperationsDb.getStore();
    let list = Array.from(store.dispatchOrders.values());

    if (filters.status) {
      list = list.filter(d => d.status === filters.status);
    }
    if (filters.projectId) {
      list = list.filter(d => d.projectId === filters.projectId);
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};
