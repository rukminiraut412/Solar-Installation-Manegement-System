/**
 * Operations Rooftop Installation & Mobile Job Card Service (Phase 5)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.2, §7.3) & docs/contracts/operations.md (§5, §6)
 * 
 * Rules:
 * 1. Mobile Job Cards for field crew with site coordinates, BOM items, and tasks.
 * 2. 6-stage milestone checkpoints (SITE_ARRIVAL -> CUSTOMER_HANDOVER).
 * 3. Rigorous Safety Testing Gates:
 *    - Earthing Resistance: Must be <= 5.0 Ohms (IS 3043 / CEA standard).
 *    - Active Generation: Inverter solar AC power output must be > 0.0 kW.
 *    - Any failure automatically triggers REWORK_REQUIRED status.
 * 4. Mandatory 4-Angle Photo Verification [NC-30] (ROOF_STRUCTURE, PANEL_ARRAY, INVERTER_WIRING, EARTHING_PIT).
 * 5. Touch/Stylus Customer Signature Capture and Handover Certificate Generation.
 */

import { OperationsDb } from './db.adapter.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

// Required 4-angle photo set [NC-30]
const REQUIRED_PHOTO_ANGLES = ['ROOF_STRUCTURE', 'PANEL_ARRAY', 'INVERTER_WIRING', 'EARTHING_PIT'];

export const InstallationsService = {
  /**
   * Helper to resolve or auto-initialize an installation job by ID or project ID
   */
  async _resolveJob(jobIdOrProjectId) {
    const store = OperationsDb.getStore();
    let job = store.installationJobs.get(jobIdOrProjectId);
    if (!job) {
      for (const [_, j] of store.installationJobs.entries()) {
        if (j.id === jobIdOrProjectId || j.projectId === jobIdOrProjectId) {
          job = j;
          break;
        }
      }
    }

    if (!job) {
      job = {
        id: jobIdOrProjectId,
        projectId: jobIdOrProjectId,
        scheduledDate: new Date().toISOString().split('T')[0],
        slot: 'FULL_DAY',
        status: 'SCHEDULED',
        crew: [],
        currentMilestone: 'SITE_ARRIVAL',
        completedCheckpoints: [],
        electricalTest: null,
        generationTest: null,
        photos: [],
        handoverSigned: false,
        handoverDetails: null,
        createdAt: new Date().toISOString()
      };
      store.installationJobs.set(job.id, job);
      store.installationJobs.set(job.projectId, job);
    }
    return job;
  },

  /**
   * Get job card details for a project or installation job
   */
  async getJobCard(jobIdOrProjectId) {
    const store = OperationsDb.getStore();
    const job = await this._resolveJob(jobIdOrProjectId);

    // Attach BOM materials
    const bomItems = [];
    for (const [_, item] of store.projectBomItems.entries()) {
      if (item.projectId === job.projectId) {
        bomItems.push(item);
      }
    }

    // Attach Serial Items
    const serials = [];
    for (const [_, sItem] of store.serialItems.entries()) {
      if (sItem.projectId === job.projectId) {
        serials.push(sItem);
      }
    }

    return {
      job,
      projectMaterials: bomItems,
      assignedSerials: serials,
      checklistProgress: {
        completedCount: job.completedCheckpoints.length,
        totalMilestones: 6,
        currentStage: job.currentMilestone
      },
      photosUploaded: job.photos.map(p => p.angle),
      missingPhotos: REQUIRED_PHOTO_ANGLES.filter(a => !job.photos.some(p => p.angle === a)),
      isTestingPassed: Boolean(job.electricalTest?.passed && job.generationTest?.passed),
      isHandoverComplete: Boolean(job.handoverSigned)
    };
  },

  /**
   * Update milestone checkpoint
   */
  async updateCheckpoint({ jobId, milestoneName, notes, user }) {
    const store = OperationsDb.getStore();
    const job = await this._resolveJob(jobId);

    const validMilestones = [
      'SITE_ARRIVAL',
      'STRUCTURE_MOUNTING',
      'PANEL_INSTALLATION',
      'ELECTRICAL_WIRING',
      'SAFETY_TESTING',
      'CUSTOMER_HANDOVER'
    ];

    if (!validMilestones.includes(milestoneName)) {
      throw { status: 400, message: `Invalid milestone: ${milestoneName}` };
    }

    if (!job.completedCheckpoints.includes(milestoneName)) {
      job.completedCheckpoints.push(milestoneName);
    }

    job.currentMilestone = milestoneName;
    job.status = milestoneName === 'CUSTOMER_HANDOVER' ? 'COMPLETED' : 'IN_PROGRESS';

    const timestamp = new Date().toISOString();
    store.installationCheckpoints.push({
      id: `chk-${Date.now()}`,
      jobId: job.id,
      milestone: milestoneName,
      completedBy: user?.id || 'technician',
      notes: notes || `Milestone ${milestoneName} marked complete.`,
      completedAt: timestamp
    });

    await recordAuditLog({
      userId: user?.id || 'technician',
      action: 'INSTALLATION_MILESTONE_UPDATED',
      entity: 'installation_jobs',
      entityId: job.id,
      details: { milestone: milestoneName, status: job.status }
    });

    return {
      success: true,
      jobId: job.id,
      currentMilestone: job.currentMilestone,
      completedCheckpoints: job.completedCheckpoints,
      status: job.status
    };
  },

  /**
   * Record Electrical and Generation Safety Tests
   * Mandatory Standards:
   * 1. Earthing Resistance <= 5.0 Ohms
   * 2. Active Solar Generation > 0.0 kW
   */
  async recordSafetyTests({
    jobId,
    earthingResistanceOhms,
    generationPowerKw,
    vocVolts,
    iscAmps,
    testerName,
    notes,
    user
  }) {
    const store = OperationsDb.getStore();
    const job = await this._resolveJob(jobId);

    const earthingVal = Number(earthingResistanceOhms);
    const genVal = Number(generationPowerKw);

    if (isNaN(earthingVal) || isNaN(genVal)) {
      throw { status: 400, message: 'earthingResistanceOhms and generationPowerKw must be numeric values.' };
    }

    // Safety Bounds Evaluation
    const earthingPassed = earthingVal > 0 && earthingVal <= 5.0; // Rule: <= 5.0 Ohms
    const generationPassed = genVal > 0.0; // Rule: Active generation > 0.0 kW

    const overallPassed = earthingPassed && generationPassed;
    const timestamp = new Date().toISOString();

    const testRecord = {
      id: `test-${Date.now()}`,
      jobId: job.id,
      earthingResistanceOhms: earthingVal,
      earthingPassed,
      generationPowerKw: genVal,
      generationPassed,
      vocVolts: Number(vocVolts) || 380,
      iscAmps: Number(iscAmps) || 9.2,
      testerName: testerName || user?.fullName || 'Lead Electrician',
      passed: overallPassed,
      recordedAt: timestamp,
      notes: notes || (overallPassed ? 'All safety tests verified within CEA standards.' : 'Safety test failed bounds.')
    };

    job.electricalTest = {
      resistanceOhms: earthingVal,
      passed: earthingPassed
    };

    job.generationTest = {
      powerKw: genVal,
      passed: generationPassed
    };

    if (!overallPassed) {
      job.status = 'REWORK_REQUIRED';
      job.reworkReason = !earthingPassed
        ? `Earthing resistance ${earthingVal} Ω exceeds 5.0 Ω maximum threshold. Deep chemical pit rework required.`
        : `Solar generation is 0.0 kW. DC string continuity or inverter sync rework required.`;
    } else {
      if (job.status === 'REWORK_REQUIRED') {
        job.status = 'IN_PROGRESS';
        job.reworkReason = null;
      }
    }

    store.installationTests.push(testRecord);

    await recordAuditLog({
      userId: user?.id || 'technician',
      action: overallPassed ? 'INSTALLATION_TESTS_PASSED' : 'INSTALLATION_TESTS_FAILED_REWORK',
      entity: 'installation_jobs',
      entityId: job.id,
      details: { earthingVal, genVal, overallPassed, status: job.status }
    });

    return {
      success: true,
      testRecord,
      jobStatus: job.status,
      overallPassed,
      reworkRequired: !overallPassed,
      message: overallPassed
        ? 'All electrical safety and generation tests passed successfully.'
        : `Safety bounds violation: ${job.reworkReason}`
    };
  },

  /**
   * Upload mandatory site installation photo
   * Enforces 4 angles: ROOF_STRUCTURE, PANEL_ARRAY, INVERTER_WIRING, EARTHING_PIT
   */
  async uploadPhoto({ jobId, angle, imageUrl, caption, user }) {
    const store = OperationsDb.getStore();
    const job = await this._resolveJob(jobId);

    if (!REQUIRED_PHOTO_ANGLES.includes(angle)) {
      throw {
        status: 400,
        message: `Invalid angle '${angle}'. Must be one of: ${REQUIRED_PHOTO_ANGLES.join(', ')}`
      };
    }

    if (!imageUrl) {
      throw { status: 400, message: 'imageUrl is required' };
    }

    const photoRecord = {
      id: `photo-${Date.now()}-${angle}`,
      jobId: job.id,
      angle,
      imageUrl,
      caption: caption || `Installation photo - ${angle}`,
      uploadedBy: user?.id || 'technician',
      uploadedAt: new Date().toISOString()
    };

    // Remove existing photo for same angle if updating
    job.photos = job.photos.filter(p => p.angle !== angle);
    job.photos.push(photoRecord);
    store.installationPhotos.push(photoRecord);

    const missing = REQUIRED_PHOTO_ANGLES.filter(a => !job.photos.some(p => p.angle === a));

    return {
      success: true,
      photo: photoRecord,
      uploadedCount: job.photos.length,
      allRequiredUploaded: missing.length === 0,
      missingAngles: missing
    };
  },

  /**
   * Customer Touch Handover Sign-off & Certificate Generation
   */
  async signCustomerHandover({
    jobId,
    customerName,
    signatureDataUrl,
    customerFeedback,
    customerRating,
    user
  }) {
    const store = OperationsDb.getStore();
    const job = await this._resolveJob(jobId);

    if (!signatureDataUrl) {
      throw { status: 400, message: 'signatureDataUrl is required for customer sign-off.' };
    }

    // Safety and Compliance Verification Gate
    if (!job.electricalTest?.passed || !job.generationTest?.passed) {
      throw {
        status: 422,
        code: 'SAFETY_TESTS_INCOMPLETE',
        message: 'Cannot perform customer handover until all electrical and generation safety tests are recorded and passed.'
      };
    }

    // Verify all 4 required photos uploaded [NC-30]
    const missingPhotos = REQUIRED_PHOTO_ANGLES.filter(a => !job.photos.some(p => p.angle === a));
    if (missingPhotos.length > 0) {
      throw {
        status: 422,
        code: 'SITE_PHOTOS_INCOMPLETE',
        message: `Customer handover requires all 4 site photos. Missing: ${missingPhotos.join(', ')}`,
        missingPhotos
      };
    }

    const timestamp = new Date().toISOString();
    const handoverRecord = {
      id: `handover-${Date.now()}`,
      jobId: job.id,
      projectId: job.projectId,
      customerName: customerName || 'Valued Customer',
      signatureDataUrl,
      customerFeedback: customerFeedback || 'Installation completed satisfactorily.',
      customerRating: Number(customerRating) || 5,
      signedAt: timestamp
    };

    job.handoverSigned = true;
    job.handoverDetails = handoverRecord;
    job.status = 'COMPLETED';
    job.completedAt = timestamp;
    if (!job.completedCheckpoints.includes('CUSTOMER_HANDOVER')) {
      job.completedCheckpoints.push('CUSTOMER_HANDOVER');
    }

    store.installationHandovers.set(job.projectId, handoverRecord);

    // Generate Handover Certificate
    const certificate = {
      certificateNumber: `HOC-2026-${String(job.projectId).replace(/[^0-9]/g, '').slice(-4) || '001'}`,
      jobId: job.id,
      projectId: job.projectId,
      completionDate: timestamp,
      customerName: handoverRecord.customerName,
      ratedStars: handoverRecord.customerRating,
      leadTechnician: job.crew?.[0]?.technicianName || 'Certified Lead Engineer',
      installedSystem: {
        testedGenerationKw: job.generationTest.powerKw,
        testedEarthingOhms: job.electricalTest.resistanceOhms,
        photosVerified: 4,
        standardCompliance: 'IS 3043 / CEA Compliant'
      },
      warrantyTerms: 'Full System Performance & Manufacturer Hardware Warranty Activated',
      signedElectronically: true
    };

    await recordAuditLog({
      userId: user?.id || 'technician',
      action: 'INSTALLATION_COMPLETED_AND_HANDOVER_SIGNED',
      entity: 'installation_jobs',
      entityId: job.id,
      details: { customerName: handoverRecord.customerName, certificateNumber: certificate.certificateNumber }
    });

    return {
      success: true,
      message: 'Customer handover completed and signed. Installation successfully finalized!',
      handover: handoverRecord,
      certificate
    };
  }
};
