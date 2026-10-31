/**
 * Authoritative Bill of Materials (BOM) Derivation Engine
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§2, §3, §7.3) & docs/contracts/customer-sales.md
 *
 * Automatically derives standard 1 kW to 5 kW On-Grid and Off-Grid Bill of Materials,
 * computes dynamic cable line items from survey measurements, flags serialized hardware,
 * and snapshots commercial pricing.
 */

// Base cost benchmarks (in INR)
const PRICING = {
  PANEL_540W: { cost: 10500, price: 13500 },
  INV_ONGRID_1KW: { cost: 18000, price: 24000 },
  INV_ONGRID_2KW: { cost: 24000, price: 32000 },
  INV_ONGRID_3KW: { cost: 30000, price: 40000 },
  INV_ONGRID_4KW: { cost: 38000, price: 49000 },
  INV_ONGRID_5KW: { cost: 44000, price: 58000 },
  INV_OFFGRID_1KW: { cost: 26000, price: 34000 },
  INV_OFFGRID_2KW: { cost: 34000, price: 45000 },
  INV_OFFGRID_3KW: { cost: 45000, price: 59000 },
  INV_OFFGRID_4KW: { cost: 55000, price: 72000 },
  INV_OFFGRID_5KW: { cost: 65000, price: 84000 },
  BATTERY_150AH: { cost: 22000, price: 29000 },
  STRUCTURE_PER_PANEL: { cost: 1600, price: 2200 },
  DCDB: { cost: 3200, price: 4500 },
  ACDB: { cost: 3500, price: 4800 },
  EARTHING_KIT: { cost: 2800, price: 3800 },
  LIGHTNING_ARRESTOR: { cost: 2200, price: 3100 },
  DC_CABLE_PER_MTR: { cost: 75, price: 110 },
  AC_CABLE_PER_MTR: { cost: 95, price: 140 },
};

/**
 * Standard Solar Ready Packages Catalog
 */
export const SOLAR_PACKAGES = [
  {
    id: 'pkg-001',
    code: 'PKG-1KW-ONGRID',
    name: '1 kW Residential On-Grid System',
    capacity_kw: 1,
    grid_type: 'On-Grid',
    base_price: 75000,
    description: 'Entry-level rooftop solar system for small homes. 2 x 540W Mono PERC panels with 1kW On-Grid string inverter.',
  },
  {
    id: 'pkg-002',
    code: 'PKG-2KW-ONGRID',
    name: '2 kW Residential On-Grid System',
    capacity_kw: 2,
    grid_type: 'On-Grid',
    base_price: 135000,
    description: 'Optimal for 2-3 BHK homes. 4 x 540W Mono PERC panels with 2kW On-Grid inverter.',
  },
  {
    id: 'pkg-003',
    code: 'PKG-3KW-ONGRID',
    name: '3 kW Residential On-Grid System (Most Popular)',
    capacity_kw: 3,
    grid_type: 'On-Grid',
    base_price: 185000,
    description: 'High efficiency PM Surya Ghar subsidy favorite. 6 x 540W panels with 3kW single-phase On-Grid inverter.',
  },
  {
    id: 'pkg-004',
    code: 'PKG-4KW-ONGRID',
    name: '4 kW Residential On-Grid System',
    capacity_kw: 4,
    grid_type: 'On-Grid',
    base_price: 240000,
    description: '4 kW system with 8 panels, ideal for bungalows with heavy daylight AC usage.',
  },
  {
    id: 'pkg-005',
    code: 'PKG-5KW-ONGRID',
    name: '5 kW Commercial/Residential On-Grid System',
    capacity_kw: 5,
    grid_type: 'On-Grid',
    base_price: 295000,
    description: '5 kW high-output system with 10 panels and three-phase On-Grid inverter.',
  },
  {
    id: 'pkg-006',
    code: 'PKG-1KW-OFFGRID',
    name: '1 kW Off-Grid System with Battery Storage',
    capacity_kw: 1,
    grid_type: 'Off-Grid',
    base_price: 110000,
    description: '1 kW self-sustaining backup system with 1 x 48V 150Ah solar battery.',
  },
  {
    id: 'pkg-007',
    code: 'PKG-2KW-OFFGRID',
    name: '2 kW Off-Grid System with Battery Storage',
    capacity_kw: 2,
    grid_type: 'Off-Grid',
    base_price: 195000,
    description: '2 kW emergency blackout protection with 2 x 48V 150Ah battery bank.',
  },
  {
    id: 'pkg-008',
    code: 'PKG-3KW-OFFGRID',
    name: '3 kW Off-Grid System with Battery Storage',
    capacity_kw: 3,
    grid_type: 'Off-Grid',
    base_price: 285000,
    description: '3 kW standalone complete solar system with 3 x 48V 150Ah battery pack.',
  },
  {
    id: 'pkg-009',
    code: 'PKG-4KW-OFFGRID',
    name: '4 kW Off-Grid System with Battery Storage',
    capacity_kw: 4,
    grid_type: 'Off-Grid',
    base_price: 365000,
    description: '4 kW off-grid powerhouse for farmhouses with 4 battery banks.',
  },
  {
    id: 'pkg-010',
    code: 'PKG-5KW-OFFGRID',
    name: '5 kW Off-Grid System with Battery Storage',
    capacity_kw: 5,
    grid_type: 'Off-Grid',
    base_price: 435000,
    description: '5 kW heavy off-grid industrial/residential installation with 4 heavy-duty batteries.',
  },
];

/**
 * Generate itemized Bill of Materials (BOM) for given capacity, grid type and site survey
 *
 * @param {Object} params
 * @param {number} params.capacityKw - 1 to 5 kW
 * @param {'On-Grid'|'Off-Grid'} params.gridType - On-Grid or Off-Grid
 * @param {Object} [params.survey] - Site survey measurements
 * @param {number} [params.survey.cable_run_meters=15] - Measured cable run distance
 * @returns {Array<Object>} Itemized BOM items ready for quotation and project persistence
 */
export function generateBOM({ capacityKw, gridType, survey = {} }) {
  const cap = Number(capacityKw);
  if (![1, 2, 3, 4, 5].includes(cap)) {
    throw new Error(`Unsupported capacity ${capacityKw} kW. Ready packages support 1, 2, 3, 4, 5 kW.`);
  }

  const isOffGrid = gridType === 'Off-Grid';
  const cableRun = Math.max(15, Number(survey.cable_run_meters || 15));
  const panelCount = Math.ceil((cap * 1000) / 540); // 540W Mono PERC
  const batteryCount = isOffGrid ? (cap <= 1 ? 1 : cap <= 2 ? 2 : cap <= 3 ? 3 : 4) : 0;

  const items = [];

  // 1. Solar PV Panels
  items.push({
    category: 'Solar Panels',
    sku: 'PANEL-540W-MONO',
    name: '540W Mono PERC Half-Cut Solar Panel',
    quantity: panelCount,
    unit: 'NOS',
    unit_cost: PRICING.PANEL_540W.cost,
    unit_price: PRICING.PANEL_540W.price,
    total_price: panelCount * PRICING.PANEL_540W.price,
    is_serialized: false, // [NC-017]
  });

  // 2. Solar Inverter (Mandatory Serialized)
  const invKey = `${isOffGrid ? 'INV_OFFGRID' : 'INV_ONGRID'}_${cap}KW`;
  const invPricing = PRICING[invKey] || PRICING.INV_ONGRID_3KW;
  items.push({
    category: 'Inverter',
    sku: `INV-${cap}KW-${isOffGrid ? 'OFFGRID' : 'ONGRID'}`,
    name: `${cap} kW ${isOffGrid ? 'Hybrid Off-Grid MPPT' : 'String On-Grid'} Solar Inverter`,
    quantity: 1,
    unit: 'SET',
    unit_cost: invPricing.cost,
    unit_price: invPricing.price,
    total_price: invPricing.price,
    is_serialized: true, // Mandatory serialized per spec §7.3
  });

  // 3. Storage Batteries (Off-Grid Only, Mandatory Serialized)
  if (isOffGrid) {
    items.push({
      category: 'Battery',
      sku: 'BAT-48V-150AH-LFP',
      name: '48V 150Ah Solar Energy Storage Battery',
      quantity: batteryCount,
      unit: 'NOS',
      unit_cost: PRICING.BATTERY_150AH.cost,
      unit_price: PRICING.BATTERY_150AH.price,
      total_price: batteryCount * PRICING.BATTERY_150AH.price,
      is_serialized: true, // Mandatory serialized per spec §7.3
    });
  }

  // 4. Rooftop Mounting Structure (GI Pre-galvanized)
  items.push({
    category: 'Structure',
    sku: 'STRUCT-GI-ROOF-KIT',
    name: 'Elevated GI Rooftop Mounting Module Rails & Clamps',
    quantity: panelCount,
    unit: 'SETS',
    unit_cost: PRICING.STRUCTURE_PER_PANEL.cost,
    unit_price: PRICING.STRUCTURE_PER_PANEL.price,
    total_price: panelCount * PRICING.STRUCTURE_PER_PANEL.price,
    is_serialized: false,
  });

  // 5. Electrical Safety Distribution Boxes (DCDB + ACDB)
  items.push({
    category: 'Electrical Protection',
    sku: 'DB-DCDB-1000V-SPD',
    name: 'DC Distribution Box (DCDB) with 1000V SPD & Fuse',
    quantity: 1,
    unit: 'SET',
    unit_cost: PRICING.DCDB.cost,
    unit_price: PRICING.DCDB.price,
    total_price: PRICING.DCDB.price,
    is_serialized: false,
  });

  items.push({
    category: 'Electrical Protection',
    sku: `DB-ACDB-${cap >= 5 ? '3PH' : '1PH'}`,
    name: `AC Distribution Box (ACDB) ${cap >= 5 ? 'Three-Phase' : 'Single-Phase'} with MCB & SPD`,
    quantity: 1,
    unit: 'SET',
    unit_cost: PRICING.ACDB.cost,
    unit_price: PRICING.ACDB.price,
    total_price: PRICING.ACDB.price,
    is_serialized: false,
  });

  // 6. Earthing & Lightning Protection System
  const earthingKits = isOffGrid ? 3 : 2;
  items.push({
    category: 'Earthing & Lightning',
    sku: 'EARTH-KIT-CHEM-100',
    name: 'Chemical Gel Earthing Electrode with Bentonite Compound',
    quantity: earthingKits,
    unit: 'SETS',
    unit_cost: PRICING.EARTHING_KIT.cost,
    unit_price: PRICING.EARTHING_KIT.price,
    total_price: earthingKits * PRICING.EARTHING_KIT.price,
    is_serialized: false,
  });

  items.push({
    category: 'Earthing & Lightning',
    sku: 'LA-COPPER-LIGHTNING',
    name: 'Pure Copper Bonded Lightning Arrestor 1-Meter',
    quantity: 1,
    unit: 'SET',
    unit_cost: PRICING.LIGHTNING_ARRESTOR.cost,
    unit_price: PRICING.LIGHTNING_ARRESTOR.price,
    total_price: PRICING.LIGHTNING_ARRESTOR.price,
    is_serialized: false,
  });

  // 7. Dynamic DC & AC Cables (Survey Driven)
  const dcCableMeters = cableRun * 2; // Positive & negative run
  items.push({
    category: 'Cables & Wiring',
    sku: 'CBL-SOLAR-DC-4SQMM',
    name: 'UV Resistant 4 sq mm Twin-Core Solar DC Cable',
    quantity: dcCableMeters,
    unit: 'MTRS',
    unit_cost: PRICING.DC_CABLE_PER_MTR.cost,
    unit_price: PRICING.DC_CABLE_PER_MTR.price,
    total_price: dcCableMeters * PRICING.DC_CABLE_PER_MTR.price,
    is_serialized: false,
  });

  items.push({
    category: 'Cables & Wiring',
    sku: 'CBL-AC-3CORE-4SQMM',
    name: 'Armoured 3-Core AC Power Cable',
    quantity: 15,
    unit: 'MTRS',
    unit_cost: PRICING.AC_CABLE_PER_MTR.cost,
    unit_price: PRICING.AC_CABLE_PER_MTR.price,
    total_price: 15 * PRICING.AC_CABLE_PER_MTR.price,
    is_serialized: false,
  });

  return items;
}

/**
 * Calculate financial totals with configurable tax and discount policies
 */
export function calculateQuotationTotals({
  bomItems,
  laborCost = 15000,
  discountAmount = 0,
  taxPercent = 12.0, // [NC-006]
  capacityKw = 3,
}) {
  const hardwareSubtotal = bomItems.reduce((sum, item) => sum + Number(item.total_price), 0);
  const labor = Number(laborCost);
  const discount = Math.max(0, Number(discountAmount));
  const preTax = Math.max(0, hardwareSubtotal + labor - discount);
  const tax = Number(((preTax * Number(taxPercent)) / 100).toFixed(2));
  const totalAmount = Number((preTax + tax).toFixed(2));

  // Informational PM Surya Ghar subsidy estimate [NC-007]
  let subsidyEstimate = 0;
  if (capacityKw <= 1) {
    subsidyEstimate = 30000;
  } else if (capacityKw <= 2) {
    subsidyEstimate = 60000;
  } else {
    subsidyEstimate = 78000;
  }

  return {
    hardwareSubtotal,
    installationLaborCost: labor,
    discountAmount: discount,
    taxPercent: Number(taxPercent),
    taxAmount: tax,
    totalAmount,
    subsidyEstimatedAmount: subsidyEstimate,
  };
}
