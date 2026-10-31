/**
 * Central Role Definitions & Permission Matrix
 * Solar Installation Management System (SunPower Solutions)
 */

export const ROLES = {
  ADMIN: 'Admin/Owner',
  SALES: 'Sales',
  WAREHOUSE: 'Warehouse',
  TECHNICIAN: 'Technician',
  SUPPORT: 'Support',
};

export const ALL_ROLES = Object.values(ROLES);

/**
 * Granular Permission Constants
 */
export const PERMISSIONS = {
  // Leads & CRM (Member 2)
  LEADS_VIEW: 'leads:view',
  LEADS_VIEW_ALL: 'leads:view_all',
  LEADS_CREATE: 'leads:create',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',

  // Site Surveys & Engineering (Member 2)
  SURVEY_SCHEDULE: 'survey:schedule',
  SURVEY_CONDUCT: 'survey:conduct',
  SURVEY_APPROVE: 'survey:approve',

  // Quotations & Packages (Member 2)
  QUOTES_VIEW: 'quotes:view',
  QUOTES_CREATE: 'quotes:create',
  QUOTES_APPROVE_DISCOUNT: 'quotes:approve_discount',

  // Operations & Installation (Member 3)
  JOBS_VIEW: 'jobs:view',
  JOBS_VIEW_ALL: 'jobs:view_all',
  JOBS_SCHEDULE: 'jobs:schedule',
  JOBS_EXECUTE: 'jobs:execute',
  JOBS_SIGN_OFF: 'jobs:sign_off',

  // Inventory & Warehouse (Member 3)
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',
  INVENTORY_DISPATCH: 'inventory:dispatch',
  INVENTORY_AUDIT: 'inventory:audit',
  SERIAL_SCAN: 'serial:scan',

  // Support & Helpdesk (Member 4)
  TICKETS_VIEW: 'tickets:view',
  TICKETS_VIEW_ALL: 'tickets:view_all',
  TICKETS_MANAGE: 'tickets:manage',
  TICKETS_ASSIGN: 'tickets:assign',

  // Finance, Margins & Payments (Member 4)
  FINANCE_VIEW_REVENUE: 'finance:view_revenue',
  FINANCE_VIEW_PROFIT_MARGINS: 'finance:view_profit_margins', // CONFIDENTIAL (Admin-only)
  FINANCE_VIEW_TECH_PAYROLL: 'finance:view_tech_payroll',     // CONFIDENTIAL (Admin-only)
  FINANCE_RECORD_PAYMENT: 'finance:record_payment',
  FINANCE_GENERATE_INVOICE: 'finance:generate_invoice',

  // Platform & Users (Member 1)
  USERS_MANAGE: 'users:manage',
  AUDIT_LOGS_VIEW: 'audit_logs:view',
};

/**
 * Role to Permission Mappings
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // Admin/Owner has all permissions

  [ROLES.SALES]: [
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.SURVEY_SCHEDULE,
    PERMISSIONS.QUOTES_VIEW,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.JOBS_VIEW,
  ],

  [ROLES.WAREHOUSE]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.INVENTORY_DISPATCH,
    PERMISSIONS.INVENTORY_AUDIT,
    PERMISSIONS.SERIAL_SCAN,
    PERMISSIONS.JOBS_VIEW,
  ],

  [ROLES.TECHNICIAN]: [
    PERMISSIONS.SURVEY_CONDUCT,
    PERMISSIONS.JOBS_VIEW,
    PERMISSIONS.JOBS_EXECUTE,
    PERMISSIONS.JOBS_SIGN_OFF,
    PERMISSIONS.SERIAL_SCAN,
  ],

  [ROLES.SUPPORT]: [
    PERMISSIONS.TICKETS_VIEW,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.JOBS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
  ],
};

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role, permission) {
  if (role === ROLES.ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
