import { db } from '../../db/index.js';

/**
 * Record an audit log entry in PostgreSQL
 * @param {Object} params
 * @param {string|null} params.userId - Performing user's ID
 * @param {string} params.action - e.g. 'USER_LOGIN', 'USER_LOGOUT', 'TOKEN_REFRESH'
 * @param {string} params.entity - e.g. 'AUTH', 'USER', 'LEAD'
 * @param {string|null} params.entityId - ID of affected record
 * @param {Object|null} params.oldValues - State before change
 * @param {Object|null} params.newValues - State after change
 * @param {string|null} params.ipAddress - Client IP
 * @param {string|null} params.userAgent - Client User-Agent
 */
export async function recordAuditLog({
  userId = null,
  action,
  entity,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (
        user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        userId,
        action,
        entity,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (err) {
    // Log error but do not crash the primary operational request
    console.error('[Audit Log Error] Failed to write audit log:', err.message);
  }
}
