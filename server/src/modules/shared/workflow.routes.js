/**
 * Workflow State & Gate Status Router
 * Authority: FINAL IMPLEMENTATION: COMPLETE CUSTOMER-TO-SOLAR-INSTALLATION WORKFLOW
 */

import { Router } from 'express';
import { WorkflowService } from './workflow.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { successResponse } from '../../shared/utils/response.js';

const router = Router();

// GET /api/v1/workflow/stages/:identifier
router.get('/stages/:identifier', authenticate, async (req, res, next) => {
  try {
    const status = await WorkflowService.getWorkflowStatus(req.params.identifier, req.user?.role);
    return successResponse(res, status, 'Workflow stages and tab gates retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/workflow/settings
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const enabled = await WorkflowService.getSchedulingSetting();
    return successResponse(res, { adminTechnicianSchedulingEnabled: enabled }, 'System settings retrieved');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/workflow/settings
router.patch('/settings', authenticate, authorize('Admin/Owner'), async (req, res, next) => {
  try {
    const { adminTechnicianSchedulingEnabled } = req.body;
    const updated = await WorkflowService.setSchedulingSetting(adminTechnicianSchedulingEnabled, req.user?.id);
    return successResponse(res, updated, 'System setting updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
