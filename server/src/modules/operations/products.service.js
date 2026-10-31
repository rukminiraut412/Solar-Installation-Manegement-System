/**
 * Operations Products Service (Phase 1)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §7.3) & docs/contracts/operations.md
 */

import { OperationsDb } from './db.adapter.js';

export const ProductsService = {
  /**
   * List all product categories
   */
  async getCategories() {
    const sqlRes = await OperationsDb.execute('SELECT * FROM product_categories ORDER BY code ASC;');
    if (sqlRes && sqlRes.rows) return sqlRes.rows;
    return OperationsDb.getStore().categories;
  },

  /**
   * List all products with category filter
   */
  async getProducts(filters = {}) {
    let sql = 'SELECT * FROM products WHERE is_active = true';
    const params = [];
    if (filters.category) {
      params.push(filters.category.toUpperCase());
      sql += ` AND UPPER(category) = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC;';

    const sqlRes = await OperationsDb.execute(sql, params);
    if (sqlRes && sqlRes.rows) return sqlRes.rows;

    let products = OperationsDb.getStore().products;
    if (filters.category) {
      products = products.filter(p => p.category.toUpperCase() === filters.category.toUpperCase());
    }
    return products;
  },

  async getAllProducts(filters = {}) {
    return this.getProducts(filters);
  },

  /**
   * Get single product by ID or SKU
   */
  async getProductByIdOrSku(identifier) {
    const sql = 'SELECT * FROM products WHERE id::text = $1 OR UPPER(sku) = UPPER($1) LIMIT 1;';
    const sqlRes = await OperationsDb.execute(sql, [identifier]);
    if (sqlRes && sqlRes.rows && sqlRes.rows.length > 0) return sqlRes.rows[0];

    const store = OperationsDb.getStore();
    return store.products.find(p => p.id === identifier || p.sku.toUpperCase() === identifier.toUpperCase()) || null;
  },

  async getProductById(id) {
    return this.getProductByIdOrSku(id);
  },

  async getProductBySku(sku) {
    return this.getProductByIdOrSku(sku);
  },

  /**
   * Create a new product in master catalog
   */
  async createProduct(data, actorId) {
    const existing = await this.getProductByIdOrSku(data.sku);
    if (existing) {
      const err = new Error(`Product with SKU '${data.sku}' already exists.`);
      err.status = 409;
      err.code = 'SKU_ALREADY_EXISTS';
      throw err;
    }

    const validCategories = ['PANEL', 'INVERTER', 'BATTERY', 'STRUCTURE', 'ELECTRICAL', 'SAFETY', 'CONSUMABLE'];
    if (!validCategories.includes(data.category.toUpperCase())) {
      const err = new Error(`Invalid category '${data.category}'. Must be one of: ${validCategories.join(', ')}`);
      err.status = 422;
      err.code = 'INVALID_CATEGORY';
      throw err;
    }

    const newProd = {
      id: `prod-${Date.now()}`,
      sku: data.sku.toUpperCase(),
      category: data.category.toUpperCase(),
      brand: data.brand,
      model: data.model,
      name: data.name,
      description: data.description || '',
      specifications: data.specifications || {},
      unitCost: Number(data.unitCost || 0),
      unitPrice: Number(data.unitPrice || 0),
      isSerialized: Boolean(data.isSerialized),
      minSafetyStock: Number(data.minSafetyStock || 5),
      unit: data.unit || 'PCS',
      warrantyMonths: Number(data.warrantyMonths || 24),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const sql = `
      INSERT INTO products (sku, category, brand, model, name, description, unit_cost, unit_price, is_serialized, min_safety_stock, unit, warranty_months)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const sqlRes = await OperationsDb.execute(sql, [
      newProd.sku, newProd.category, newProd.brand, newProd.model, newProd.name,
      newProd.description, newProd.unitCost, newProd.unitPrice, newProd.isSerialized,
      newProd.minSafetyStock, newProd.unit, newProd.warrantyMonths
    ]);

    if (sqlRes && sqlRes.rows && sqlRes.rows.length > 0) {
      return sqlRes.rows[0];
    }

    // Fallback store
    OperationsDb.getStore().products.push(newProd);
    OperationsDb.getStore().inventory.set(newProd.id, {
      productId: newProd.id,
      sku: newProd.sku,
      name: newProd.name,
      category: newProd.category,
      warehouseLocation: 'Main Central Warehouse',
      storageBin: 'BIN-A1',
      onHandQuantity: 0,
      reservedQuantity: 0,
      lastCountedAt: new Date().toISOString()
    });

    return newProd;
  }
};
