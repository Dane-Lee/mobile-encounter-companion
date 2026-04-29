# Responsible-Use Safeguards

This document defines the minimum product and governance safeguards for the Mobile Encounter Tracker Companion. It is implementation guidance, not legal advice. Legal/privacy review must approve production wording, retention periods, and employment-law applicability before rollout.

## Current Data Inventory

| Data area | Examples | Sensitivity | Current storage |
| --- | --- | --- | --- |
| Mobile encounter captures | Employee display name, department, location, station, encounter type, summary, tags, follow-up flag, timestamps | Employee-identifiable encounter notes; may become health-adjacent if users enter medical details | IndexedDB `mobileEncounterCaptures` |
| Weekly snapshots | Completed encounters, reminders, employee names, overdue/follow-up counts | Employee-identifiable read-only reference data | IndexedDB `storedMobileWeekSnapshots` |
| Prioritization settings/state | Station risk settings, roster names, item overrides, execution records, notes | Employee-identifiable workflow state and worksite risk setup | IndexedDB `prioritizationSettings` and `dailyPrioritizationState` |
| Sync settings | Desktop/server URL, user ID, worksite ID, device ID | Configuration data; not an authentication secret | `localStorage` |
| Local options | Department, location, station option overrides | Worksite setup data | `localStorage` |
| Responsible-use acceptance | Notice version and acceptance timestamp | Governance metadata | `localStorage` |

## Client-Side Safeguards Implemented

- First-use responsible-use notice with versioned local acceptance.
- Header and guide access to the responsible-use notice after first use.
- Capture-form note warnings that block clearly prohibited family medical history/genetic-information patterns.
- Capture-form warning flow for diagnosis, medication, treatment, mental-health, procedure, or medical-restriction language.
- Local data inventory download that reports storage categories, counts, sensitivity, and retention review status.
- User-confirmed local clearing actions for captures, week snapshots, retention-eligible captures, and all local app data.
- Sync setup copy clarifying that QR/manual pairing is configuration only and not production authentication.

## Retention Defaults

- Draft, local-only, and sync-error captures stay until explicit user action.
- Exported, uploaded, desktop-imported, or resolved captures become locally retention-review eligible after 90 days.
- The client does not silently delete employee records. Users must confirm local clearing actions.
- Production deployments should replace these defaults with counsel-approved retention schedules and legal-hold procedures.

## Prohibited Uses And Entry Rules

- Do not enter family medical history, genetic information, diagnoses, medication details, unrelated medical history, or protected-activity labels.
- Do not use mobile notes as a hidden discipline, performance-management, medical-record, or workplace-surveillance system.
- Do not infer employment consequences from prioritization, tags, follow-up flags, or encounter counts without approved human review, auditability, and adverse-impact review.
- Do not add audio, photos, GPS, biometrics, analytics, or AI recommendations without a new privacy/legal review and updated notice.

## Production Backend Requirements

Before production sync, the backend must provide:

- Authenticated user identity with MFA/SSO where required.
- Worksite/tenant authorization enforced server-side for every request.
- Device registration, device revocation, and short-lived pairing tokens.
- HTTPS/TLS only, strict CORS allowlists, rate limiting, and server-side validation.
- Append-only audit events for view, upload, import, export, delete, sync, admin, and auth/device actions.
- Retention jobs, legal-hold support, backup handling, and breach-response logging.
- Role-based access so employee-identifiable and health-adjacent records are visible only to approved users.
- Vendor/privacy contracts and BAAs/DPAs where applicable.

## Legal Review Checkpoints

- Employee notice wording and timing.
- Consent model for optional features, especially audio, photos, GPS, wellness/health screening, and analytics.
- ADA/GINA handling of medical, disability, family-history, and genetic information.
- OSHA/workplace safety record separation and anti-retaliation concerns.
- NLRA risk if encounter, location, or prioritization data could be used as surveillance or discipline.
- State privacy-law obligations for employee personal information and sensitive personal information.
