import type { PrioritizationBucketDefinition, StationScanSection } from './types';

export const PRIORITIZATION_BUCKET_DEFINITIONS: PrioritizationBucketDefinition[] = [
  {
    id: 'open_pa_follow_up',
    order: 1,
    title: 'Open Physical Assessment follow-ups',
    description: 'Employees with open physical assessment follow-up needs come first.',
    itemType: 'employee',
  },
  {
    id: 'worker_not_yet_encountered',
    order: 2,
    title: 'Workers not yet encountered',
    description: 'Workers who have not been encountered yet remain next in priority.',
    itemType: 'employee',
  },
  {
    id: 'worker_uncertain_pain_discomfort',
    order: 3,
    title: 'Workers encountered but uncertain for pain/discomfort',
    description: 'Use this bucket when pain or discomfort still needs clarification.',
    itemType: 'employee',
  },
  {
    id: 'high_risk_area',
    order: 4,
    title: 'High-risk areas/jobs',
    description: 'Station or area-based scanning starts with the highest-risk work zones.',
    itemType: 'station',
  },
  {
    id: 'worker_uncertain_stiffness_mobility',
    order: 5,
    title: 'Workers encountered but uncertain for stiffness/asymmetry/mobility issues',
    description: 'Use this bucket when movement quality still needs observational follow-up.',
    itemType: 'employee',
  },
  {
    id: 'medium_risk_area',
    order: 6,
    title: 'Medium-risk areas/jobs',
    description: 'Medium-risk stations stay separate so they can be evaluated after employee-focused work.',
    itemType: 'station',
  },
  {
    id: 'low_risk_area',
    order: 7,
    title: 'Low-risk areas/jobs',
    description: 'Lower-risk stations stay visible without competing with higher-priority work.',
    itemType: 'station',
  },
];

export const STATION_SCAN_SECTIONS: StationScanSection[] = [
  {
    id: 'high-risk-behaviors',
    title: 'High-Risk Behaviors',
    description: 'Behavioral and situational observations to scan first when opening a station item.',
    checklistItems: [
      'unsafe body mechanics',
      'proper/consistent PPE use',
      'safe work zones / situational awareness',
      'breaks / rotations',
      'poor positioning',
      'repetitive unsafe movement patterns',
    ],
  },
  {
    id: 'high-risk-sustained-repetitive-postures',
    title: 'High-Risk Sustained / Repetitive Postures',
    description: 'Focused posture review for sustained load, repetition, and movement variation.',
    checklistItems: [
      'same posture for extended periods',
      'repetitive movements continuously',
      'awkward positions',
      'limited movement variation',
      'static gripping/holding/bracing',
      'microbreaks / position changes',
    ],
  },
  {
    id: 'task-work-risk',
    title: 'Task / Work Risk',
    description: 'Task-level scan for force, positioning, and recovery demand.',
    checklistItems: [
      'high force demands',
      'repetitive demands',
      'awkward or constrained postures',
      'poor workstation/tool setup',
      'excessive reach / height mismatch / positioning issue',
      'insufficient recovery time between demands',
    ],
  },
];

export const EMPLOYEE_EXECUTION_SECTIONS = [
  'Review priority context',
  'Interact with worker',
  'Set recommended next step',
] as const;
