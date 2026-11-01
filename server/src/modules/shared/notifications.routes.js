/**
 * Notifications Router
 * Authority: FINAL IMPLEMENTATION: COMPLETE CUSTOMER-TO-SOLAR-INSTALLATION WORKFLOW
 */

import { Router } from 'express';
import { NotificationsService } from './notifications.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { successResponse } from '../../shared/utils/response.js';

const router = Router();

// GET /api/v1/notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await NotificationsService.getUserNotifications(req.user);
    return successResponse(res, notifications, 'Notifications retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const updated = await NotificationsService.markAsRead(req.params.id, req.user);
    return successResponse(res, updated, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/notifications/read-all
router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const result = await NotificationsService.markAllAsRead(req.user);
    return successResponse(res, result, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
});

export default router;
