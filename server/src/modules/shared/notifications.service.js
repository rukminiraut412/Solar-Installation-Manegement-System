/**
 * Database-backed Real-time System Notifications Service
 * Authority: FINAL IMPLEMENTATION: COMPLETE CUSTOMER-TO-SOLAR-INSTALLATION WORKFLOW
 */

import { pool } from '../../db/index.js';

export const NotificationsService = {
  /**
   * Fetch unread and recent notifications for a user & role
   */
  async getUserNotifications(user) {
    if (!user) return [];

    const res = await pool.query(`
      SELECT * FROM notifications
      WHERE user_id = $1 OR (user_id IS NULL AND (role = $2 OR role = 'ALL'))
      ORDER BY created_at DESC
      LIMIT 30;
    `, [user.id, user.role]);

    return res.rows;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId, user) {
    const res = await pool.query(`
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
      RETURNING *;
    `, [notificationId, user.id]);

    return res.rows[0];
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(user) {
    await pool.query(`
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 OR (user_id IS NULL AND role = $2);
    `, [user.id, user.role]);

    return { success: true };
  },

  /**
   * Dispatch a notification
   */
  async createNotification({ userId = null, role = null, title, message, type = 'INFO', link = null, metadata = {} }) {
    const res = await pool.query(`
      INSERT INTO notifications (user_id, role, title, message, type, link, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [userId, role, title, message, type, link, JSON.stringify(metadata)]);

    return res.rows[0];
  }
};
