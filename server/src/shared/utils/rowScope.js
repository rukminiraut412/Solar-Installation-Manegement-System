import { ROLES } from '../constants/roles.js';
import { ForbiddenError } from '../errors/AppError.js';

/**
 * Confidential financial and payroll fields restricted strictly to Admin/Owner
 */
const CONFIDENTIAL_FINANCIAL_FIELDS = [
  'profit_margin',
  'profitMargin',
  'net_profit',
  'netProfit',
  'gross_margin',
  'grossMargin',
  'cost_price',
  'costPrice',
  'internal_cost',
  'internalCost',
  'technician_cost',
  'technicianCost',
  'technician_payout',
  'technicianPayout',
  'hourly_rate',
  'hourlyRate',
  'commission_amount',
  'commissionAmount',
];

/**
 * Internal fields that must NEVER be exposed to customer-facing views
 */
const INTERNAL_ONLY_FIELDS = [
  ...CONFIDENTIAL_FINANCIAL_FIELDS,
  'internal_notes',
  'internalNotes',
  'risk_score',
  'riskScore',
  'fraud_check_flags',
  'audit_metadata',
];

/**
 * Filter object or array to strip confidential financial data for non-admin users
 */
export function filterConfidentialData(data, userRole) {
  if (userRole === ROLES.ADMIN) {
    return data;
  }
  return stripFields(data, CONFIDENTIAL_FINANCIAL_FIELDS);
}

/**
 * Filter object or array to strip all internal notes and financial figures for customer views
 */
export function filterCustomerFacingData(data) {
  return stripFields(data, INTERNAL_ONLY_FIELDS);
}

function stripFields(item, fieldsToStrip) {
  if (!item || typeof item !== 'object') return item;

  if (Array.isArray(item)) {
    return item.map(i => stripFields(i, fieldsToStrip));
  }

  const sanitized = { ...item };
  for (const field of fieldsToStrip) {
    delete sanitized[field];
  }

  // Recursively sanitize nested objects
  for (const key of Object.keys(sanitized)) {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = stripFields(sanitized[key], fieldsToStrip);
    }
  }

  return sanitized;
}

/**
 * Generate role-scoped SQL WHERE clause fragment and parameters
 * @param {Object} user - Authenticated user { id, role }
 * @param {string} resource - 'leads' | 'jobs' | 'tickets' | 'surveys'
 * @param {number} startingParamIndex - Parameter offset for $1, $2, etc.
 * @returns {{ clause: string, params: any[] }}
 */
export function getRowScope(user, resource, startingParamIndex = 1) {
  // Admin/Owner has unrestricted row-level visibility
  if (user.role === ROLES.ADMIN) {
    return { clause: '1=1', params: [] };
  }

  switch (resource) {
    case 'leads':
      if (user.role === ROLES.SALES) {
        return {
          clause: `(assigned_sales_id = $${startingParamIndex} OR assigned_sales_id IS NULL)`,
          params: [user.id],
        };
      }
      if (user.role === ROLES.SUPPORT) {
        return { clause: '1=1', params: [] }; // Support can look up customer enquiries
      }
      throw new ForbiddenError('Access to leads is not permitted for your role');

    case 'jobs':
    case 'installations':
      if (user.role === ROLES.TECHNICIAN) {
        return {
          clause: `(technician_id = $${startingParamIndex} OR $${startingParamIndex} = ANY(crew_ids))`,
          params: [user.id],
        };
      }
      if ([ROLES.WAREHOUSE, ROLES.SUPPORT, ROLES.SALES].includes(user.role)) {
        return { clause: '1=1', params: [] };
      }
      throw new ForbiddenError('Access to jobs is not permitted for your role');

    case 'tickets':
      if (user.role === ROLES.SUPPORT) {
        return { clause: '1=1', params: [] }; // Support queue visibility
      }
      if (user.role === ROLES.TECHNICIAN) {
        return {
          clause: `assigned_technician_id = $${startingParamIndex}`,
          params: [user.id],
        };
      }
      throw new ForbiddenError('Access to tickets is not permitted for your role');

    default:
      return { clause: '1=1', params: [] };
  }
}
