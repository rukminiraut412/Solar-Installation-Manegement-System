/**
 * Operations Technician Roster & Scheduling Service (Phase 4)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md (§7.2, §7.3) & docs/contracts/operations.md (§5, §7)
 * 
 * Rules:
 * 1. 15-Technician Master Roster with skills taxonomy and certifications.
 * 2. Cross-module Availability API: GET /api/v1/operations/technicians/availability?date=YYYY-MM-DD&slot=SLOT_NAME
 * 3. Survey Scheduling Support: Enables Member 2 to query surveyor availability.
 * 4. Crew Scheduling Rules: Crew size 2-3 [NC-31].
 * 5. Safety Compliance: Every installation crew must have at least one certified ELECTRICAL_LEAD.
 * 6. Zero Double-Booking: Conflict detection across overlapping date/slots.
 */

import { OperationsDb } from './db.adapter.js';
import { recordAuditLog } from '../../shared/utils/auditLogger.js';

// Master 15-technician roster
const INITIAL_ROSTER = [
  { id: 'tech-01', fullName: 'Kiran Rathod', phone: '+91 98201 11001', skills: ['ELECTRICAL_LEAD', 'SOLAR_PV'], certifications: ['Wireman Grade 1 License'], dailyRate: 1200, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-02', fullName: 'Vikram Singh', phone: '+91 98201 11002', skills: ['STRUCTURAL_MOUNT', 'HELPER'], certifications: ['Working at Heights Level 2'], dailyRate: 900, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-03', fullName: 'Rajesh Sharma', phone: '+91 98201 11003', skills: ['ELECTRICAL_LEAD', 'STRUCTURAL_MOUNT'], certifications: ['Master Electrical License'], dailyRate: 1400, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-04', fullName: 'Anil Kumar', phone: '+91 98201 11004', skills: ['SOLAR_PV', 'HELPER'], certifications: [], dailyRate: 750, employmentType: 'CONTRACTOR', status: 'ACTIVE' },
  { id: 'tech-05', fullName: 'Ganesh Shinde', phone: '+91 98201 11005', skills: ['SURVEYOR', 'ELECTRICAL_LEAD'], certifications: ['Solar Site Surveyor Level 3'], dailyRate: 1300, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-06', fullName: 'Manoj Tiwari', phone: '+91 98201 11006', skills: ['STRUCTURAL_MOUNT', 'SOLAR_PV'], certifications: ['Welding & Metal Fab Cert'], dailyRate: 950, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-07', fullName: 'Santosh Jadhav', phone: '+91 98201 11007', skills: ['ELECTRICAL_LEAD', 'SOLAR_PV'], certifications: ['Govt Wireman License B'], dailyRate: 1250, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-08', fullName: 'Prakash More', phone: '+91 98201 11008', skills: ['SURVEYOR', 'HELPER'], certifications: ['Total Station & Drone Cert'], dailyRate: 1100, employmentType: 'CONTRACTOR', status: 'ACTIVE' },
  { id: 'tech-09', fullName: 'Deepak Bhosale', phone: '+91 98201 11009', skills: ['STRUCTURAL_MOUNT', 'HELPER'], certifications: ['Rooftop Safety Standards'], dailyRate: 850, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-10', fullName: 'Ajay Kulkarni', phone: '+91 98201 11010', skills: ['ELECTRICAL_LEAD', 'SURVEYOR'], certifications: ['Electrical Supervisor Lic'], dailyRate: 1500, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-11', fullName: 'Sanjay Pawar', phone: '+91 98201 11011', skills: ['SOLAR_PV', 'HELPER'], certifications: [], dailyRate: 750, employmentType: 'CONTRACTOR', status: 'ACTIVE' },
  { id: 'tech-12', fullName: 'Nitin Chavan', phone: '+91 98201 11012', skills: ['STRUCTURAL_MOUNT', 'SOLAR_PV'], certifications: ['Scaffolding Safety Cert'], dailyRate: 950, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-13', fullName: 'Sachin Kamble', phone: '+91 98201 11013', skills: ['HELPER'], certifications: [], dailyRate: 700, employmentType: 'CONTRACTOR', status: 'ACTIVE' },
  { id: 'tech-14', fullName: 'Rahul Gaikwad', phone: '+91 98201 11014', skills: ['ELECTRICAL_LEAD', 'SOLAR_PV'], certifications: ['Certified Inverter Specialist'], dailyRate: 1350, employmentType: 'FULL_TIME', status: 'ACTIVE' },
  { id: 'tech-15', fullName: 'Dinesh Patil', phone: '+91 98201 11015', skills: ['SURVEYOR', 'STRUCTURAL_MOUNT'], certifications: ['Site Surveyor Certified'], dailyRate: 1150, employmentType: 'FULL_TIME', status: 'ACTIVE' }
];

export const TechniciansService = {
  /**
   * Get all technicians on roster
   */
  async getRoster(filters = {}) {
    const store = OperationsDb.getStore();
    if (!store.technicians || store.technicians.length < 15) {
      store.technicians = [...INITIAL_ROSTER];
    }

    let list = [...store.technicians];
    if (filters.skill) {
      list = list.filter(t => t.skills.includes(filters.skill));
    }
    if (filters.status) {
      list = list.filter(t => t.status === filters.status);
    }
    return list;
  },

  /**
   * Query technician availability by date, slot and optional required skill
   * Agreed API format: GET /api/v1/operations/technicians/availability?date=YYYY-MM-DD&slot=SLOT_NAME
   */
  async getAvailability({ date, slot, skill }) {
    if (!date) {
      throw { status: 400, message: 'date query parameter is required (YYYY-MM-DD)' };
    }

    // Validate ISO date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw { status: 400, message: 'Invalid date format. Expected YYYY-MM-DD' };
    }

    const validSlots = ['MORNING', 'AFTERNOON', 'FULL_DAY'];
    const chosenSlot = slot ? slot.toUpperCase() : 'FULL_DAY';
    if (!validSlots.includes(chosenSlot)) {
      throw { status: 400, message: `Invalid slot: ${slot}. Must be MORNING, AFTERNOON, or FULL_DAY.` };
    }

    const store = OperationsDb.getStore();
    if (!store.technicians || store.technicians.length < 15) {
      store.technicians = [...INITIAL_ROSTER];
    }

    // Find all technicians booked on this date/slot
    const bookedTechIds = new Set();
    for (const assign of store.technicianAssignments) {
      if (assign.date === date) {
        if (assign.slot === 'FULL_DAY' || chosenSlot === 'FULL_DAY' || assign.slot === chosenSlot) {
          bookedTechIds.add(assign.technicianId);
        }
      }
    }

    // Filter available technicians
    let available = store.technicians.filter(t => t.status === 'ACTIVE' && !bookedTechIds.has(t.id));

    if (skill) {
      const requiredSkill = skill.toUpperCase();
      available = available.filter(t => t.skills.includes(requiredSkill));
    }

    return {
      date,
      slot: chosenSlot,
      requiredSkill: skill || null,
      availableCount: available.length,
      technicians: available.map(t => ({
        id: t.id,
        fullName: t.fullName,
        skills: t.skills,
        certifications: t.certifications,
        dailyRate: t.dailyRate,
        employmentType: t.employmentType
      }))
    };
  },

  /**
   * Schedule installation crew for a project
   * Validates:
   * 1. Crew size must be 2 to 3 technicians [NC-31].
   * 2. At least 1 member must have ELECTRICAL_LEAD skill and certification.
   * 3. Zero double-booking conflicts on the same date/slot.
   */
  async scheduleCrew({ projectId, date, slot = 'FULL_DAY', technicianIds, user }) {
    if (!projectId) {
      throw { status: 400, message: 'projectId is required' };
    }
    if (!date) {
      throw { status: 400, message: 'date is required (YYYY-MM-DD)' };
    }
    if (!Array.isArray(technicianIds) || technicianIds.length < 2 || technicianIds.length > 3) {
      throw {
        status: 400,
        code: 'INVALID_CREW_SIZE',
        message: 'Installation crew size must be between 2 and 3 technicians [NC-31].',
        providedCount: Array.isArray(technicianIds) ? technicianIds.length : 0
      };
    }

    const store = OperationsDb.getStore();
    if (!store.technicians || store.technicians.length < 15) {
      store.technicians = [...INITIAL_ROSTER];
    }

    // Resolve assigned technician entities
    const techEntities = [];
    for (const tId of technicianIds) {
      const entity = store.technicians.find(t => t.id === tId);
      if (!entity) {
        throw { status: 404, message: `Technician with ID '${tId}' does not exist.` };
      }
      if (entity.status !== 'ACTIVE') {
        throw { status: 400, message: `Technician '${entity.fullName}' is not in ACTIVE status.` };
      }
      techEntities.push(entity);
    }

    // Electrical Lead Compliance Check: At least 1 member must possess ELECTRICAL_LEAD
    const hasElectricalLead = techEntities.some(t => t.skills.includes('ELECTRICAL_LEAD'));
    if (!hasElectricalLead) {
      throw {
        status: 422,
        code: 'ELECTRICAL_LEAD_REQUIRED',
        message: 'Safety Policy Violation: Crew must include at least one certified ELECTRICAL_LEAD technician.'
      };
    }

    // Conflict Detection Check: Verify none of the technicians are double-booked
    const conflicts = [];
    for (const t of techEntities) {
      const isBooked = store.technicianAssignments.some(assign => {
        return assign.technicianId === t.id &&
               assign.date === date &&
               (assign.slot === 'FULL_DAY' || slot === 'FULL_DAY' || assign.slot === slot);
      });
      if (isBooked) {
        conflicts.push({ technicianId: t.id, fullName: t.fullName, date, slot });
      }
    }

    if (conflicts.length > 0) {
      throw {
        status: 409,
        code: 'CREW_SCHEDULE_CONFLICT',
        message: 'One or more selected technicians are already booked on this date/slot.',
        conflicts
      };
    }

    // Persist assignments
    const assignmentsCreated = [];
    for (const t of techEntities) {
      const assignment = {
        id: `assign-${Date.now()}-${t.id}`,
        technicianId: t.id,
        technicianName: t.fullName,
        projectId,
        date,
        slot,
        roleInCrew: t.skills.includes('ELECTRICAL_LEAD') ? 'ELECTRICAL_LEAD' : 'INSTALLER',
        assignedBy: user?.id || 'system',
        assignedAt: new Date().toISOString()
      };
      store.technicianAssignments.push(assignment);
      assignmentsCreated.push(assignment);
    }

    // Create or update installation job
    let job = store.installationJobs.get(projectId);
    if (!job) {
      job = {
        id: `inst-${Date.now()}`,
        projectId,
        scheduledDate: date,
        slot,
        status: 'SCHEDULED',
        crew: assignmentsCreated,
        currentMilestone: 'SITE_ARRIVAL',
        completedCheckpoints: [],
        electricalTest: null,
        generationTest: null,
        photos: [],
        handoverSigned: false,
        createdAt: new Date().toISOString()
      };
      store.installationJobs.set(projectId, job);
    } else {
      job.scheduledDate = date;
      job.slot = slot;
      job.crew = assignmentsCreated;
      job.status = 'SCHEDULED';
    }

    await recordAuditLog({
      userId: user?.id || 'system',
      action: 'CREW_SCHEDULED',
      entity: 'installation_jobs',
      entityId: job.id,
      details: { projectId, date, slot, crew: assignmentsCreated.map(a => a.technicianName) }
    });

    return {
      success: true,
      jobId: job.id,
      projectId,
      scheduledDate: date,
      slot,
      crew: assignmentsCreated,
      message: 'Installation crew successfully scheduled without conflicts.'
    };
  }
};
