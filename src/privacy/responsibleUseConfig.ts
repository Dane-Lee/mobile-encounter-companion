export const RESPONSIBLE_USE_NOTICE_VERSION = '2026-04-29';

export const responsibleUseNotice = {
  title: 'Responsible Use Notice',
  intro:
    'This mobile companion stores employee encounter information on this browser and may optionally send selected records to the desktop review workflow.',
  sections: [
    {
      title: 'Use Only For Approved Workflows',
      items: [
        'Use this app for floor capture, weekly reference, and daily prioritization support.',
        'Do not use mobile notes as a hidden performance, discipline, surveillance, or medical-record system.',
        'Employees need a clear path to review, correct, or dispute inaccurate encounter records.',
      ],
    },
    {
      title: 'Limit What You Enter',
      items: [
        'Enter only the minimum practical details needed for the encounter workflow.',
        'Do not enter diagnoses, medications, family medical history, genetic information, or unrelated medical details.',
        'Avoid subjective labels about attitude, productivity, protected activity, or employment decisions.',
      ],
    },
    {
      title: 'Understand Local Storage And Sync',
      items: [
        'Captures, weekly snapshots, roster data, and prioritization settings can remain in this device/browser storage.',
        'JSON export creates a local file containing selected capture records.',
        'QR/manual sync pairing only configures a destination. It is not production authentication or authorization.',
      ],
    },
    {
      title: 'Production Requirements',
      items: [
        'Before production use, backend sync needs real authentication, device revocation, worksite authorization, audit logs, and HTTPS.',
        'Retention windows, employee notices, and legal review must be approved before rollout.',
      ],
    },
  ],
} as const;

export const captureGuardrailCopy = {
  summaryHelper:
    'Keep notes factual and minimal. Do not enter diagnoses, medications, family medical history, genetic information, or unrelated medical details.',
  tagsHelper:
    'Tags should describe workflow needs only. Avoid medical, genetic, discipline, or protected-activity labels.',
  blockedTitle: 'Remove prohibited content before saving',
  sensitiveTitle: 'Sensitive note warning',
  sensitiveBody:
    'This note may include health-adjacent details. Save only if the information is necessary for the approved encounter workflow.',
} as const;

export const retentionDefaults = {
  reviewDays: 90,
  label: '90 days after export, upload, desktop import, or resolution',
} as const;
