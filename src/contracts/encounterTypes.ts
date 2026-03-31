export const ENCOUNTER_TYPE_OPTIONS = [
  'Job-Specific Coaching',
  'Job-Specific Mobility / Stretching',
  'Safety Coaching',
  'Ergonomic Adjustments',
  'Physical Assessments (PWC or NWC)',
  'PA Follow-Ups',
  'Human Movement Assessments',
  'HMA Follow-Ups',
  'HMA Reassessments',
  'Office Assessments',
  'Task Assessments',
  'Relationship Development',
  'Health and Wellness Coaching',
  'General Medical Coaching',
  'Group Class',
  'Fitness Center Visit',
  'Near Miss Education',
  'Friend/Family Consultation',
] as const;

export type EncounterType = (typeof ENCOUNTER_TYPE_OPTIONS)[number];

// Temporary compatibility mapping for pre-update local captures and older desktop/mobile
// snapshot packages that still use the retired encounter type labels.
export const LEGACY_ENCOUNTER_TYPE_COMPATIBILITY_MAP = {
  'Check-in': 'Relationship Development',
  Coaching: 'Job-Specific Coaching',
  Recognition: 'Relationship Development',
  'Follow-up': 'PA Follow-Ups',
  Incident: 'Safety Coaching',
  Support: 'General Medical Coaching',
} as const satisfies Record<string, EncounterType>;

export type LegacyEncounterType = keyof typeof LEGACY_ENCOUNTER_TYPE_COMPATIBILITY_MAP;

export const isEncounterType = (value: unknown): value is EncounterType =>
  typeof value === 'string' &&
  ENCOUNTER_TYPE_OPTIONS.includes(value as EncounterType);

export const isLegacyEncounterType = (value: unknown): value is LegacyEncounterType =>
  typeof value === 'string' && value in LEGACY_ENCOUNTER_TYPE_COMPATIBILITY_MAP;

export const normalizeEncounterType = (value: string): EncounterType | null => {
  if (isEncounterType(value)) {
    return value;
  }

  if (isLegacyEncounterType(value)) {
    return LEGACY_ENCOUNTER_TYPE_COMPATIBILITY_MAP[value];
  }

  return null;
};
