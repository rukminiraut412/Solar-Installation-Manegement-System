/**
 * Deterministic Pre-Model Safety Interceptor
 * Specification Authority: SOLAR_MANAGEMENT_SYSTEM.md (§9.3, §20.2 AC-8)
 * 
 * Runs BEFORE any AI or routing logic.
 * Screens text for fire, smoke, electrical shock, sparking, or hazardous battery conditions.
 */

const SAFETY_PATTERNS = [
  /smoke/i,
  /burning/i,
  /fire/i,
  /spark/i,
  /sparking/i,
  /shock/i,
  /electrocute/i,
  /live wire/i,
  /exposed wire/i,
  /swollen battery/i,
  /leaking battery/i,
  /hot battery/i,
  /water ingress/i,
  /melted/i,
  /flame/i,
  /explosion/i
];

export const FIXED_SAFETY_NOTICE = 
  "EMERGENCY SAFETY NOTICE: Please keep completely away from the solar equipment. " +
  "If there is active smoke, fire, or immediate risk of electrical shock, move to a safe location " +
  "and contact local emergency services immediately. Our senior support engineering team and admin " +
  "have been alerted with highest priority (P1 Critical). Do NOT attempt to touch, open, or service the equipment.";

export function evaluateSafety(text = '') {
  if (!text || typeof text !== 'string') {
    return { isHazard: false, matchedPatterns: [] };
  }

  const matched = SAFETY_PATTERNS.filter(pattern => pattern.test(text));
  const isHazard = matched.length > 0;

  return {
    isHazard,
    matchedPatterns: matched.map(p => p.source),
    recommendedPriority: isHazard ? 'P1' : null,
    safetyNotice: isHazard ? FIXED_SAFETY_NOTICE : null
  };
}
