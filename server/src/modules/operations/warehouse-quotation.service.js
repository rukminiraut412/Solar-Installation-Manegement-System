/**
 * Warehouse & Admin Quotation Engine Service
 * Authority: FINAL IMPLEMENTATION: COMPLETE CUSTOMER-TO-SOLAR-INSTALLATION WORKFLOW
 * 
 * Rules:
 * 1. Warehouse prepares itemized BOM based on actual customer requirements & project.
 * 2. Panels, inverter, mounting structures, wiring, protection, earthing, installation charges.
 * 3. Save draft and submit for Admin approval.
 * 4. Admin reviews, approves, requests changes, or rejects. Version history maintained.
 * 5. Customer accepts, requests revision, or declines.
 * 6. On Customer acceptance: frozen BOM items are created in project_bom_items,
 *    and stock reservation is automatically executed against inventory!
 */

import { pool } from '../../db/index.js';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';
import { ReservationsService } from './reservations.service.js';
import { ProductsService } from './products.service.js';

export const WarehouseQuotationService = {
  /**
   * List approved customer requirements and projects needing quotation preparation
   * Scoped to assigned warehouse if warehouseUserId is provided
   */
  async getProjectsNeedingQuotes(warehouseUserId = null) {
    let sql = `
      SELECT 
        p.id AS project_id,
        p.project_code,
        p.capacity_kw,
        p.grid_type,
        p.workflow_stage,
        p.current_stage,
        p.created_at AS project_created_at,
        c.id AS customer_id,
        c.customer_code,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address_street,
        c.address_city,
        c.address_state,
        c.address_pincode,
        c.assigned_warehouse_id,
        o.id AS order_id,
        o.order_number,
        r.id AS requirements_id,
        r.roof_type,
        r.roof_area_sqft,
        r.floors_count,
        r.roof_restrictions,
        r.roof_accessibility,
        r.parking_access,
        r.nearby_obstacles,
        r.avg_monthly_bill,
        r.monthly_units,
        r.connection_type,
        r.battery_required,
        r.preferred_timeline,
        r.installation_purpose,
        r.special_requirements,
        r.documents_json,
        r.preferred_system_type,
        r.full_installation_address,
        r.property_type,
        r.ownership_status,
        r.electricity_consumer_number,
        r.discom_name,
        q.id AS quotation_id,
        q.quotation_number,
        q.version AS quotation_version,
        q.status AS quotation_status,
        q.total_amount AS quotation_total,
        q.hardware_subtotal,
        q.installation_labor_cost,
        q.tax_amount,
        q.admin_notes,
        q.customer_notes,
        q.warehouse_id
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN customer_installation_requirements r ON p.requirements_id = r.id
      LEFT JOIN warehouse_quotations q ON p.id = q.project_id
    `;
    const params = [];
    if (warehouseUserId) {
      params.push(warehouseUserId);
      sql += ` WHERE (c.assigned_warehouse_id = $${params.length} OR q.warehouse_id = $${params.length})`;
    }
    sql += ` ORDER BY p.created_at DESC;`;

    const res = await pool.query(sql, params);
    return res.rows;
  },

  /**
   * Auto-generate a suggested itemized BOM for a given capacity (kW) and grid type
   */
  async getSuggestedBom(capacityKw = 3.0, gridType = 'On-Grid') {
    const kw = Number(capacityKw) || 3.0;
    const isOffGrid = String(gridType).toLowerCase().includes('off');

    // Calculate component quantities based on engineering specs
    const panelCount = Math.max(2, Math.ceil((kw * 1000) / 540)); // 540W Waaree panels
    const invSku = kw <= 3.3 
      ? (isOffGrid ? 'INV-HYBR-3K-48' : 'INV-GROW-3K-26')
      : (isOffGrid ? 'INV-HYBR-5K-48' : 'INV-GROW-5K-26');

    // Retrieve live catalog prices
    const catalog = await ProductsService.getAllProducts();
    const productBySku = new Map();
    for (const p of catalog) {
      productBySku.set(p.sku, p);
    }

    const panelProd = productBySku.get('PNL-MONO-540W') || {
      name: '540W Monocrystalline PERC Solar Panel',
      unitCost: 11500,
      unitPrice: 14200,
      unit: 'PCS',
      isSerialized: true
    };

    const invProd = productBySku.get(invSku) || {
      name: `${kw}kW Solar Inverter`,
      unitCost: 24500,
      unitPrice: 31000,
      unit: 'PCS',
      isSerialized: true
    };

    const items = [
      {
        category: 'PANEL',
        sku: 'PNL-MONO-540W',
        name: panelProd.name,
        quantity: panelCount,
        unit: 'PCS',
        unitCost: panelProd.unitCost || 11500,
        unitPrice: panelProd.unitPrice || 14200,
        totalPrice: panelCount * (panelProd.unitPrice || 14200),
        isSerialized: true
      },
      {
        category: 'INVERTER',
        sku: invSku,
        name: invProd.name,
        quantity: 1,
        unit: 'PCS',
        unitCost: invProd.unitCost || 24500,
        unitPrice: invProd.unitPrice || 31000,
        totalPrice: invProd.unitPrice || 31000,
        isSerialized: true
      },
      {
        category: 'STRUCTURE',
        sku: 'STR-ALUM-RAIL',
        name: 'Elevated GI & Aluminium Solar Mounting Structure',
        quantity: Math.ceil(kw * 2),
        unit: 'SET',
        unitCost: 4500,
        unitPrice: 6200,
        totalPrice: Math.ceil(kw * 2) * 6200,
        isSerialized: false
      },
      {
        category: 'ELECTRICAL',
        sku: 'CAB-DC-4SQMM',
        name: '4 sq.mm UV Resistant Solar DC Cable (Red & Black)',
        quantity: Math.max(30, Math.ceil(kw * 15)),
        unit: 'MTR',
        unitCost: 65,
        unitPrice: 90,
        totalPrice: Math.max(30, Math.ceil(kw * 15)) * 90,
        isSerialized: false
      },
      {
        category: 'ELECTRICAL',
        sku: 'ELC-ACDB-1PH',
        name: 'AC & DC Distribution Protection Box with SPD & MCB',
        quantity: 1,
        unit: 'SET',
        unitCost: 3500,
        unitPrice: 5200,
        totalPrice: 5200,
        isSerialized: false
      },
      {
        category: 'SAFETY',
        sku: 'SAF-EARTH-PIT',
        name: 'Chemical Earthing Electrode with BFC Compound & Pit Cover',
        quantity: 2,
        unit: 'SET',
        unitCost: 2800,
        unitPrice: 3900,
        totalPrice: 7800,
        isSerialized: false
      },
      {
        category: 'SAFETY',
        sku: 'SAF-LIGHT-ARR',
        name: 'Copper Lightning Arrestor with 10ft Mast & Clamps',
        quantity: 1,
        unit: 'SET',
        unitCost: 2200,
        unitPrice: 3200,
        totalPrice: 3200,
        isSerialized: false
      },
      {
        category: 'CONSUMABLE',
        sku: 'CON-FAST-SS304',
        name: 'SS304 Fasteners, MC4 Connectors & UV Conduit Hardware',
        quantity: 1,
        unit: 'LOT',
        unitCost: 2000,
        unitPrice: 2800,
        totalPrice: 2800,
        isSerialized: false
      }
    ];

    if (isOffGrid) {
      items.push({
        category: 'BATTERY',
        sku: 'BAT-LFP-48V-100',
        name: '48V 100Ah Lithium Ferro-Phosphate (LFP) Solar Battery Bank',
        quantity: 1,
        unit: 'SET',
        unitCost: 65000,
        unitPrice: 82000,
        totalPrice: 82000,
        isSerialized: true
      });
    }

    const hardwareSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const installationLaborCost = Math.round(kw * 4500);
    const preTaxTotal = hardwareSubtotal + installationLaborCost;
    const taxPercent = 12.0;
    const taxAmount = Math.round(preTaxTotal * (taxPercent / 100));
    const totalAmount = preTaxTotal + taxAmount;

    return {
      capacityKw: kw,
      gridType,
      items,
      hardwareSubtotal,
      installationLaborCost,
      taxPercent,
      taxAmount,
      totalAmount
    };
  },

  /**
   * Get single quotation by ID with itemized line items
   */
  async getQuotationById(quotationId) {
    const qRes = await pool.query(`
      SELECT 
        q.*,
        p.project_code,
        o.order_number,
        c.customer_code,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address_city,
        r.full_installation_address,
        r.property_type,
        r.discom_name,
        r.electricity_consumer_number
      FROM warehouse_quotations q
      JOIN customers c ON q.customer_id = c.id
      LEFT JOIN projects p ON q.project_id = p.id
      LEFT JOIN orders o ON q.order_id = o.id
      LEFT JOIN customer_installation_requirements r ON q.requirements_id = r.id
      WHERE q.id = $1;
    `, [quotationId]);

    if (qRes.rows.length === 0) {
      throw new NotFoundError('Quotation not found');
    }

    const quotation = qRes.rows[0];
    const itemsRes = await pool.query(`
      SELECT * FROM warehouse_quotation_items
      WHERE quotation_id = $1
      ORDER BY id ASC;
    `, [quotationId]);

    quotation.items = itemsRes.rows;
    return quotation;
  },

  /**
   * List quotations with optional status filter for Admin/Warehouse
   */
  async listQuotations({ status = null, search = '' } = {}) {
    let sql = `
      SELECT 
        q.*,
        p.project_code,
        p.project_number,
        o.order_number,
        c.customer_code,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        (SELECT COUNT(*) FROM warehouse_quotation_items WHERE quotation_id = q.id) AS item_count
      FROM warehouse_quotations q
      JOIN customers c ON q.customer_id = c.id
      LEFT JOIN projects p ON q.project_id = p.id
      LEFT JOIN orders o ON q.order_id = o.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND q.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.full_name ILIKE $${params.length} OR q.quotation_number ILIKE $${params.length} OR p.project_code ILIKE $${params.length})`;
    }
    sql += ` ORDER BY q.updated_at DESC;`;
    const res = await pool.query(sql, params);
    return res.rows;
  },

  /**
   * Get active quotation for customer dashboard
   */
  async getCustomerActiveQuotation(customerId) {
    const res = await pool.query(`
      SELECT 
        q.*,
        p.project_code,
        o.order_number
      FROM warehouse_quotations q
      LEFT JOIN projects p ON q.project_id = p.id
      LEFT JOIN orders o ON q.order_id = o.id
      WHERE q.customer_id = $1
      ORDER BY q.created_at DESC
      LIMIT 1;
    `, [customerId]);

    if (res.rows.length === 0) return null;

    const quotation = res.rows[0];
    const itemsRes = await pool.query(`
      SELECT * FROM warehouse_quotation_items
      WHERE quotation_id = $1
      ORDER BY id ASC;
    `, [quotation.id]);

    quotation.items = itemsRes.rows;
    return quotation;
  },

  /**
   * Warehouse creates or updates draft quotation with itemized BOM
   */
  async saveDraftQuotation(data, user) {
    const {
      projectId,
      customerId,
      requirementsId,
      orderId,
      capacityKw = 3.0,
      gridType = 'On-Grid',
      items = [],
      installationLaborCost = 0,
      taxPercent = 12.0,
      customerNotes = null
    } = data;

    if (!projectId || !customerId) {
      throw new AppError('projectId and customerId are required to create a quotation', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one BOM line item is required', 400);
    }

    // Calculate totals
    const hardwareSubtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const labor = Number(installationLaborCost) || 0;
    const tax = Math.round((hardwareSubtotal + labor) * (Number(taxPercent) / 100));
    const total = hardwareSubtotal + labor + tax;

    // Check if an existing quotation exists for this project
    const existingQ = await pool.query(
      'SELECT * FROM warehouse_quotations WHERE project_id = $1 LIMIT 1;',
      [projectId]
    );

    let quotation;

    if (existingQ.rows.length > 0) {
      const current = existingQ.rows[0];
      const nextVersion = current.status === 'CHANGES_REQUESTED' ? current.version + 1 : current.version;

      const updateRes = await pool.query(`
        UPDATE warehouse_quotations
        SET 
          version = $1,
          capacity_kw = $2,
          grid_type = $3,
          status = 'DRAFT',
          hardware_subtotal = $4,
          installation_labor_cost = $5,
          tax_percent = $6,
          tax_amount = $7,
          total_amount = $8,
          customer_notes = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *;
      `, [
        nextVersion,
        capacityKw,
        gridType,
        hardwareSubtotal,
        labor,
        taxPercent,
        tax,
        total,
        customerNotes,
        current.id
      ]);

      quotation = updateRes.rows[0];

      // Replace items
      await pool.query('DELETE FROM warehouse_quotation_items WHERE quotation_id = $1;', [quotation.id]);
    } else {
      // Create new quotation
      const qNum = 'QTE-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const insertRes = await pool.query(`
        INSERT INTO warehouse_quotations (
          quotation_number, version, customer_id, requirements_id, project_id, order_id,
          capacity_kw, grid_type, status, hardware_subtotal, installation_labor_cost,
          tax_percent, tax_amount, total_amount, customer_notes, created_by
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `, [
        qNum,
        customerId,
        requirementsId || null,
        projectId,
        orderId || null,
        capacityKw,
        gridType,
        hardwareSubtotal,
        labor,
        taxPercent,
        tax,
        total,
        customerNotes,
        user?.id || null
      ]);

      quotation = insertRes.rows[0];

      // Update project linkage
      await pool.query(
        'UPDATE projects SET quotation_id = $1, workflow_stage = $2 WHERE id = $3;',
        [quotation.id, 'QUOTATION_DRAFT', projectId]
      );
    }

    // Insert items
    for (const itm of items) {
      await pool.query(`
        INSERT INTO warehouse_quotation_items (
          quotation_id, product_id, category, sku, name, quantity, unit, unit_cost, unit_price, total_price, is_serialized
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [
        quotation.id,
        itm.productId || null,
        itm.category,
        itm.sku,
        itm.name,
        Number(itm.quantity) || 1,
        itm.unit || 'PCS',
        Number(itm.unitCost) || 0,
        Number(itm.unitPrice) || 0,
        (Number(itm.quantity) || 1) * (Number(itm.unitPrice) || 0),
        Boolean(itm.isSerialized)
      ]);
    }

    return this.getQuotationById(quotation.id);
  },

  /**
   * Auto-generate a draft quotation based on actual customer requirements
   * Linked to Customer ID, Project ID, Order ID, and Warehouse ID.
   * If any technical/price info is missing, flags for Warehouse review.
   * Prevents duplicate quotation generation.
   */
  async autoGenerateDraftQuotation({ requirement, customerId, projectId, orderId, warehouseId, userId = null }) {
    if (!customerId || !projectId) {
      return null;
    }

    // 1. Prevent duplicate quotation generation on refresh or repeated form submission
    const existingQ = await pool.query(`
      SELECT * FROM warehouse_quotations 
      WHERE project_id = $1 
         OR requirements_id = $2 
         OR (customer_id = $3 AND status NOT IN ('REJECTED', 'CUSTOMER_DECLINED'))
      LIMIT 1;
    `, [projectId, requirement.id, customerId]);

    if (existingQ.rows.length > 0) {
      return existingQ.rows[0];
    }

    const capacityKw = Number(requirement.required_capacity_kw) || 3.0;
    const gridType = requirement.preferred_system_type || 'On-Grid';

    // 2. Calculate suggested BOM with catalogue prices
    let bom;
    let flaggedForReview = false;
    let reviewNotes = null;

    try {
      bom = await this.getSuggestedBom(capacityKw, gridType);
      
      // Check if any product, price, or technical information is missing
      if (!bom.items || bom.items.length === 0) {
        flaggedForReview = true;
        reviewNotes = 'FLAGGED FOR WAREHOUSE REVIEW: No catalogue components matched system capacity. Please configure engineering BOM manually.';
      } else {
        const hasUnpriced = bom.items.some(i => !i.unitPrice || Number(i.unitPrice) <= 0);
        if (hasUnpriced) {
          flaggedForReview = true;
          reviewNotes = 'FLAGGED FOR WAREHOUSE REVIEW: Missing or zero unit pricing in database catalogue. Please review and update item rates before submitting to Admin.';
        }
      }
    } catch (bomErr) {
      flaggedForReview = true;
      reviewNotes = `FLAGGED FOR WAREHOUSE REVIEW: Error compiling BOM (${bomErr.message}). Warehouse review required.`;
      bom = {
        items: [],
        hardwareSubtotal: 0,
        installationLaborCost: Math.round(capacityKw * 4500),
        taxPercent: 12.0,
        taxAmount: Math.round(Math.round(capacityKw * 4500) * 0.12),
        totalAmount: Math.round(Math.round(capacityKw * 4500) * 1.12)
      };
    }

    const hardwareSubtotal = Number(bom.hardwareSubtotal) || 0;
    const installationLaborCost = Number(bom.installationLaborCost) || Math.round(capacityKw * 4500);
    const taxPercent = Number(bom.taxPercent) || 12.0;
    const taxAmount = Number(bom.taxAmount) || Math.round((hardwareSubtotal + installationLaborCost) * (taxPercent / 100));
    const totalAmount = Number(bom.totalAmount) || (hardwareSubtotal + installationLaborCost + taxAmount);

    const qNum = 'QTE-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    // 3. Insert draft quotation linked to Customer, Project, Order, and Warehouse
    const insertRes = await pool.query(`
      INSERT INTO warehouse_quotations (
        quotation_number, version, customer_id, requirements_id, project_id, order_id, warehouse_id,
        capacity_kw, grid_type, status, hardware_subtotal, installation_labor_cost,
        tax_percent, tax_amount, total_amount, admin_notes, customer_notes, created_by
      ) VALUES (
        $1, 1, $2, $3, $4, $5, $6,
        $7, $8, 'DRAFT', $9, $10,
        $11, $12, $13, $14, $15, $16
      ) RETURNING *;
    `, [
      qNum,
      customerId,
      requirement.id || null,
      projectId,
      orderId || null,
      warehouseId || null,
      capacityKw,
      gridType,
      hardwareSubtotal,
      installationLaborCost,
      taxPercent,
      taxAmount,
      totalAmount,
      reviewNotes,
      `Standard ${capacityKw} kW ${gridType} Rooftop Solar System. Comprehensive warranty, tier-1 mono PERC panels, grid-tie inverter, and earthing protection.`,
      userId || warehouseId || null
    ]);

    const quotation = insertRes.rows[0];

    // 4. Insert items
    if (bom.items && bom.items.length > 0) {
      for (const itm of bom.items) {
        await pool.query(`
          INSERT INTO warehouse_quotation_items (
            quotation_id, product_id, category, sku, name, quantity, unit, unit_cost, unit_price, total_price, is_serialized
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
        `, [
          quotation.id,
          itm.productId || null,
          itm.category,
          itm.sku,
          itm.name,
          Number(itm.quantity) || 1,
          itm.unit || 'PCS',
          Number(itm.unitCost) || 0,
          Number(itm.unitPrice) || 0,
          Number(itm.totalPrice) || ((Number(itm.quantity) || 1) * (Number(itm.unitPrice) || 0)),
          Boolean(itm.isSerialized)
        ]);
      }
    }

    // 5. Link quotation back to project
    await pool.query(
      'UPDATE projects SET quotation_id = $1, workflow_stage = $2 WHERE id = $3;',
      [quotation.id, 'QUOTATION_DRAFT', projectId]
    );

    // 6. Notify Warehouse
    if (warehouseId) {
      await pool.query(`
        INSERT INTO notifications (user_id, role, title, message, type, link)
        VALUES ($1, 'Warehouse', 'New Draft Quotation Ready', $2, 'INFO', 'inventory');
      `, [
        warehouseId,
        `Draft quotation ${quotation.quotation_number} generated for ${capacityKw} kW system. Available under Quotation Preparation.`
      ]);
    }

    // 7. Timeline record
    await pool.query(`
      INSERT INTO customer_timeline (customer_id, event_type, title, description, metadata, created_by)
      VALUES ($1, 'QUOTATION_DRAFTED', 'Draft Quotation Auto-Generated', $2, $3, $4);
    `, [
      customerId,
      `Draft Quotation ${quotation.quotation_number} (₹${totalAmount.toLocaleString('en-IN')}) auto-generated for warehouse review.`,
      JSON.stringify({ quotationId: quotation.id, quotationNumber: quotation.quotation_number, totalAmount, flaggedForReview }),
      userId || null
    ]);

    return quotation;
  },

  /**
   * Warehouse submits quotation for Admin Approval
   */
  async submitToAdmin(quotationId, user) {
    const q = await this.getQuotationById(quotationId);
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(q.status)) {
      throw new AppError(`Cannot submit quotation in '${q.status}' status to Admin`, 400);
    }

    const updatedRes = await pool.query(`
      UPDATE warehouse_quotations
      SET status = 'SUBMITTED_TO_ADMIN', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `, [quotationId]);

    const updated = updatedRes.rows[0];

    // Update project stage
    await pool.query(
      `UPDATE projects SET workflow_stage = 'QUOTATION_ADMIN_APPROVAL' WHERE id = $1;`,
      [q.project_id]
    );

    // Timeline event
    await pool.query(`
      INSERT INTO customer_timeline (customer_id, event_type, title, description, metadata, created_by)
      VALUES ($1, 'QUOTATION_SUBMITTED', 'Quotation Submitted for Admin Review', $2, $3, $4);
    `, [
      q.customer_id,
      `Warehouse prepared itemized BOM quotation ${q.quotation_number} (₹${Number(q.total_amount).toLocaleString('en-IN')}) and submitted to Admin for approval.`,
      JSON.stringify({ quotationId, quotationNumber: q.quotation_number, totalAmount: q.total_amount }),
      user?.id || null
    ]);

    // Admin Notification
    await pool.query(`
      INSERT INTO notifications (role, title, message, type, link)
      VALUES ('Admin/Owner', 'Quotation Awaiting Admin Approval', $1, 'WARNING', 'customers');
    `, [
      `Quotation ${q.quotation_number} for Project ${q.project_code || ''} (Customer: ${q.customer_name}, ₹${q.total_amount}) submitted by Warehouse. Action required.`
    ]);

    await recordAuditLog({
      userId: user?.id || 'warehouse',
      action: 'QUOTATION_SUBMITTED_TO_ADMIN',
      entity: 'warehouse_quotations',
      entityId: quotationId,
      details: { quotationNumber: q.quotation_number, totalAmount: q.total_amount }
    });

    return updated;
  },

  /**
   * Admin Reviews Quotation (Approve, Request Changes, Reject)
   */
  async adminReview(quotationId, { decision, adminNotes = null }, adminUser) {
    if (!['APPROVE', 'REQUEST_CHANGES', 'REJECT'].includes(decision)) {
      throw new AppError(`Invalid decision '${decision}'. Must be APPROVE, REQUEST_CHANGES, or REJECT`, 400);
    }

    const q = await this.getQuotationById(quotationId);
    let newStatus;
    let projectStage;

    if (decision === 'APPROVE') {
      newStatus = 'ADMIN_APPROVED';
      projectStage = 'QUOTATION_CUSTOMER_ACCEPTANCE';
    } else if (decision === 'REQUEST_CHANGES') {
      newStatus = 'CHANGES_REQUESTED';
      projectStage = 'QUOTATION_PREPARATION';
    } else {
      newStatus = 'REJECTED';
      projectStage = 'QUOTATION_PREPARATION';
    }

    const updateRes = await pool.query(`
      UPDATE warehouse_quotations
      SET 
        status = $1,
        admin_notes = $2,
        reviewed_by = $3,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [newStatus, adminNotes, adminUser?.id || null, quotationId]);

    const updated = updateRes.rows[0];

    // Update project stage
    await pool.query(
      `UPDATE projects SET workflow_stage = $1 WHERE id = $2;`,
      [projectStage, q.project_id]
    );

    // Notifications and Timeline based on decision
    if (decision === 'APPROVE') {
      // Notify Customer
      if (q.customer_id) {
        const custUserRes = await pool.query('SELECT user_id FROM customers WHERE id = $1;', [q.customer_id]);
        const custUserId = custUserRes.rows[0]?.user_id;

        if (custUserId) {
          await pool.query(`
            INSERT INTO notifications (user_id, role, title, message, type, link)
            VALUES ($1, 'Customer', 'Official Solar Quotation Ready!', $2, 'SUCCESS', 'dashboard');
          `, [
            custUserId,
            `Your customized solar installation quotation ${q.quotation_number} (₹${Number(q.total_amount).toLocaleString('en-IN')}) has been verified and published! Please review and accept.`
          ]);
        }
      }

      // Notify Warehouse
      await pool.query(`
        INSERT INTO notifications (role, title, message, type, link)
        VALUES ('Warehouse', 'Quotation Approved by Admin', $1, 'SUCCESS', 'inventory');
      `, [
        `Quotation ${q.quotation_number} for Project ${q.project_code} has been approved by Admin and sent to Customer.`
      ]);

      // Timeline event
      await pool.query(`
        INSERT INTO customer_timeline (customer_id, event_type, title, description, metadata, created_by)
        VALUES ($1, 'QUOTATION_ADMIN_APPROVED', 'Quotation Approved & Published to Customer', $2, $3, $4);
      `, [
        q.customer_id,
        `Admin approved quotation ${q.quotation_number} for ₹${Number(q.total_amount).toLocaleString('en-IN')}. Published for customer acceptance.`,
        JSON.stringify({ quotationId, quotationNumber: q.quotation_number, totalAmount: q.total_amount }),
        adminUser?.id || null
      ]);
    } else {
      // Notify Warehouse of feedback/rejection
      await pool.query(`
        INSERT INTO notifications (role, title, message, type, link)
        VALUES ('Warehouse', 'Quotation Review: Action Required', $1, 'WARNING', 'inventory');
      `, [
        `Admin review for Quotation ${q.quotation_number} (Project: ${q.project_code}): ${decision}. Note: ${adminNotes || 'None'}`
      ]);
    }

    await recordAuditLog({
      userId: adminUser?.id || 'admin',
      action: `QUOTATION_ADMIN_${decision}`,
      entity: 'warehouse_quotations',
      entityId: quotationId,
      details: { decision, adminNotes }
    });

    return updated;
  },

  /**
   * Customer Action on Quotation (Accept, Request Revision, Decline)
   */
  async customerAction(quotationId, { action, customerNotes = null, declinedReason = null }, user) {
    if (!['ACCEPT', 'REQUEST_REVISION', 'DECLINE'].includes(action)) {
      throw new AppError(`Invalid action '${action}'. Must be ACCEPT, REQUEST_REVISION, or DECLINE`, 400);
    }

    const q = await this.getQuotationById(quotationId);
    let newStatus;
    let projectStage;

    if (action === 'ACCEPT') {
      newStatus = 'CUSTOMER_ACCEPTED';
      projectStage = 'STOCK_RESERVED';
    } else if (action === 'REQUEST_REVISION') {
      newStatus = 'CUSTOMER_REVISION_REQUESTED';
      projectStage = 'QUOTATION_PREPARATION';
    } else {
      newStatus = 'CUSTOMER_DECLINED';
      projectStage = 'QUOTATION_PREPARATION';
    }

    const updateRes = await pool.query(`
      UPDATE warehouse_quotations
      SET 
        status = $1::varchar,
        customer_notes = COALESCE($2, customer_notes),
        declined_reason = $3,
        accepted_at = CASE WHEN $1::varchar = 'CUSTOMER_ACCEPTED' THEN CURRENT_TIMESTAMP ELSE accepted_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [newStatus, customerNotes, declinedReason, quotationId]);

    const updated = updateRes.rows[0];

    // If accepted: CRITICAL AUTOMATIC INTEGRATION
    if (action === 'ACCEPT') {
      // 1. Ingest frozen BOM items into project_bom_items
      const bomItems = q.items.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unit_cost,
        unitPrice: item.unit_price,
        isSerialized: item.is_serialized,
        category: item.category
      }));

      // Ingest BOM
      try {
        await ReservationsService.ingestProjectBom({
          projectId: q.project_id,
          orderId: q.order_id,
          bomItems,
          userId: user?.id || 'customer'
        });
      } catch (err) {
        console.warn('[BOM Ingest Notice]:', err?.message || err);
      }

      // Also persist directly into postgres project_bom_items for SQL consistency
      await pool.query('DELETE FROM project_bom_items WHERE project_id = $1;', [q.project_id]);
      for (const item of q.items) {
        await pool.query(`
          INSERT INTO project_bom_items (
            project_id, order_id, product_id, category, sku, name, quantity, quantity_required, unit, is_serialized, unit_cost, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12);
        `, [
          q.project_id,
          q.order_id,
          item.product_id,
          item.category,
          item.sku,
          item.name,
          item.quantity,
          item.unit,
          item.is_serialized,
          item.unit_cost,
          item.unit_price,
          item.total_price
        ]);
      }

      // 2. Execute Stock Reservation
      let reservationResult = null;
      try {
        reservationResult = await ReservationsService.reserveStock({
          projectId: q.project_id,
          orderId: q.order_id,
          userId: user?.id || 'customer'
        });
      } catch (err) {
        console.warn('[Stock Reservation Notice]:', err?.message || err);
      }

      // 3. Update Project Workflow Flags
      await pool.query(`
        UPDATE projects
        SET 
          workflow_stage = 'STOCK_RESERVED',
          current_stage = 'DISPATCH_READY',
          is_stock_reserved = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `, [q.project_id]);

      // 4. Update Order Status
      if (q.order_id) {
        await pool.query(`
          UPDATE orders
          SET 
            order_status = 'IN_FULFILMENT',
            payment_status = 'ADVANCE_PAID',
            advance_paid_amount = advance_required_amount,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [q.order_id]);
      }

      // 5. Notifications
      await pool.query(`
        INSERT INTO notifications (role, title, message, type, link)
        VALUES ('Warehouse', 'Quotation Accepted - Stock Reserved', $1, 'SUCCESS', 'dispatch');
      `, [
        `Customer accepted quotation ${q.quotation_number} for Project ${q.project_code}! BOM frozen, stock reserved, Dispatch is UNLOCKED.`
      ]);

      await pool.query(`
        INSERT INTO notifications (role, title, message, type, link)
        VALUES ('Admin/Owner', 'Customer Accepted Quotation', $1, 'SUCCESS', 'customers');
      `, [
        `Customer accepted quotation ${q.quotation_number} for Project ${q.project_code}. Order transitioned to IN_FULFILMENT.`
      ]);

      // Timeline event
      await pool.query(`
        INSERT INTO customer_timeline (customer_id, event_type, title, description, metadata, created_by)
        VALUES ($1, 'QUOTATION_ACCEPTED', 'Quotation Accepted by Customer', $2, $3, $4);
      `, [
        q.customer_id,
        `Customer accepted quotation ${q.quotation_number}. Commercial BOM frozen, materials reserved in warehouse, and project cleared for dispatch.`,
        JSON.stringify({ quotationId, quotationNumber: q.quotation_number, reservation: reservationResult?.status }),
        user?.id || null
      ]);
    } else {
      // Revert/Hold Project stage
      await pool.query(
        `UPDATE projects SET workflow_stage = $1 WHERE id = $2;`,
        [projectStage, q.project_id]
      );

      // Notify Warehouse
      await pool.query(`
        INSERT INTO notifications (role, title, message, type, link)
        VALUES ('Warehouse', 'Customer Responded to Quotation', $1, 'INFO', 'inventory');
      `, [
        `Customer response on ${q.quotation_number}: ${action}. Feedback: ${customerNotes || declinedReason || 'None'}`
      ]);
    }

    await recordAuditLog({
      userId: user?.id || 'customer',
      action: `QUOTATION_CUSTOMER_${action}`,
      entity: 'warehouse_quotations',
      entityId: quotationId,
      details: { action, customerNotes, declinedReason }
    });

    return updated;
  }
};
