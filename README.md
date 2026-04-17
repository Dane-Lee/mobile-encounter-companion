# Daily Encounter Tracking Mobile Companion

Local-first mobile companion for the existing Daily Encounter Tracking desktop workflow.

This app is intentionally narrow:

- `Capture Mode` for fast floor capture
- `Week View Mode` for read-only weekly reference
- `Prioritization Mode` for a daily prioritization list derived from mobile capture data plus temporary in-app setup

It is not a full mobile port of the desktop app. There is no auth, analytics, admin area, or full desktop navigation clone.

The mobile app now supports the shared backend sync contract in addition to its local-first storage:

- mobile uploads `mobile_capture_entry` records
- mobile fetches desktop-authored `weekly_snapshot` records

If sync env vars are not configured, the app still works locally on the device.

## Stack

- React 18
- TypeScript
- Vite
- Native IndexedDB
- Manual PWA manifest + service worker
- Shared backend sync via `fetch` and Vite environment variables

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Build output:

- Build command: `npm run build`
- Output directory: `dist`
- Hosting model: static Vite single-page app
- Local-first storage: browser IndexedDB on the hosted origin
- Optional sync: shared backend API configured through `VITE_SYNC_*`

## Deployment

This project is ready for static hosting on Netlify or Vercel.

Hosting notes:

- The app stays local-first when hosted. Captures and cached week snapshots still live in the phone browser via IndexedDB.
- No server-rendered backend is required for the web app itself.
- If you want sync enabled, point the app at the shared backend API using the environment variables below.
- The app is a single-page app, so Netlify and Vercel config files are included for safe root routing and fresh `index.html` / service worker fetches.
- Because IndexedDB is browser-local, cached data stays tied to the specific phone/browser/origin you use.

### GitHub Push

If this folder is not already a Git repo:

```bash
git init
git add .
git commit -m "Prepare mobile companion app for hosting"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

If you already have a Git repo connected:

```bash
git add .
git commit -m "Prepare mobile companion app for hosting"
git push
```

### Netlify Deploy

1. Push the project to GitHub.
2. In Netlify, choose `Add new site` -> `Import an existing project`.
3. Select the GitHub repo.
4. Confirm the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add the sync env vars below if you want backend sync enabled.
6. Deploy the site.
7. Open the Netlify URL on your phone.

This repo includes [netlify.toml](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/netlify.toml).

### Vercel Deploy

1. Push the project to GitHub.
2. In Vercel, choose `Add New...` -> `Project`.
3. Import the GitHub repo.
4. Confirm the project settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add the sync env vars below if you want backend sync enabled.
6. Deploy the project.
7. Open the Vercel URL on your phone.

This repo includes [vercel.json](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/vercel.json).

## Shared Sync Layer

The sync model is backend-mediated only. Mobile and desktop do not communicate directly.

Configure the hosted mobile app with these environment variables when you want sync enabled:

```bash
VITE_SYNC_API_BASE_URL=https://your-sync-api.example.com
VITE_SYNC_USER_ID=your-user-id
VITE_SYNC_WORKSITE_ID=your-worksite-id
VITE_SYNC_DEVICE_ID=optional-device-id
VITE_SYNC_CONTRACT_VERSION=1.0.0
```

Expected mobile-side endpoints:

- `POST /mobile_capture_entries`
- `GET /weekly_snapshots?user_id=...&worksite_id=...`
- `GET /prioritization_settings?user_id=...&worksite_id=...`
- `PUT /prioritization_settings`
- `GET /daily_prioritization_state?user_id=...&worksite_id=...&date=YYYY-MM-DD`
- `PUT /daily_prioritization_state`

The mobile app validates both shared sync payload types before it writes them into local storage.

## App Structure

```text
src/
  app/
    useCompanionData.ts
  components/
    ModeSwitcher.tsx
    SectionCard.tsx
    StatusPill.tsx
  contracts/
    encounterTypes.ts
    mobileContracts.ts
    prioritizationContracts.ts
    validators.ts
  features/
    capture/
      CaptureForm.tsx
      CaptureList.tsx
      CaptureMode.tsx
      captureRecordFactory.ts
      captureService.ts
      captureSyncService.ts
    guide/
      GuideModal.tsx
    prioritization/
      PrioritizationMode.tsx
      PrioritizationList.tsx
      PrioritizationDetail.tsx
      prioritizationConfig.ts
      prioritizationDerivation.ts
      prioritizationHelpers.ts
      prioritizationStateService.ts
      prioritizationSyncService.ts
      PrioritizationSettingsPanel.tsx
      usePrioritizationWorkflow.ts
      types.ts
      README.md
    utilities/
      UtilitiesPanel.tsx
    week-view/
      DayBreakdownCard.tsx
      WeekSummaryCard.tsx
      WeekViewMode.tsx
      weekSnapshotHelpers.ts
      weekSnapshotService.ts
      weeklySnapshotSyncService.ts
  lib/
    dateTime.ts
    download.ts
    id.ts
    tags.ts
  mocks/
    generators.ts
    sampleSeed.ts
  pwa/
    registerServiceWorker.ts
  storage/
    indexedDb.ts
    captureStore.ts
    dailyPrioritizationStateStore.ts
    prioritizationSettingsStore.ts
    weekSnapshotStore.ts
  sync/
    syncApi.ts
    syncConfig.ts
    syncContracts.ts
    syncMappers.ts
    syncValidators.ts
    useMobileSyncStatus.ts
```

## Local Storage Model

The app uses one IndexedDB database with four separate object stores:

- `mobileEncounterCaptures`
  Stores `MobileEncounterCapture` records created on the phone.
- `storedMobileWeekSnapshots`
  Stores `StoredMobileWeekSnapshot` records cached on the phone.
- `prioritizationSettings`
  Stores local station-risk settings for prioritization.
- `dailyPrioritizationState`
  Stores today’s roster, item overrides, and execution records for prioritization.

This separation is deliberate. Mobile-authored captures and desktop-authored week snapshots are not merged into one ambiguous store.

## Data Directions

The app intentionally supports two distinct directions:

- `Mobile -> Backend -> Desktop`
  Mobile-authored capture records are uploaded as `mobile_capture_entry` records for later desktop review/import flow.
- `Desktop -> Backend -> Mobile`
  Desktop-authored weekly read models are published as `weekly_snapshot` records for mobile viewing.

The app does not do real-time sync.

Local JSON import/export utilities still exist for local testing and fallback workflows, but they are not the shared sync path.

## Contracts

Local package contracts live in [src/contracts/mobileContracts.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/mobileContracts.ts) and are validated in [src/contracts/validators.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/validators.ts).

Shared backend sync contracts live in [src/sync/syncContracts.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/sync/syncContracts.ts) and are validated in [src/sync/syncValidators.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/sync/syncValidators.ts).

### `MobileEncounterCapture`

Created locally from `Capture Mode`.

Primary UI fields:

- `employeeDisplayName`
- `encounterType`
- `summaryShort`
- `tags`
- `followUpNeeded`
- optional `followUpSuggestedDate`

Each record also carries local sync metadata so the phone can show whether it is still local-only, uploaded, resolved, or in sync error.

### `MobileCaptureExportPackage`

Created locally when the user downloads a JSON package. This is a local utility boundary, not the shared backend sync contract.

### `MobileWeekSnapshotPackage`

Used for manual local JSON import. The package is validated before it is accepted into IndexedDB.

### `StoredMobileWeekSnapshot`

Wraps each cached week package with mobile-specific metadata:

- `localWeekSnapshotId`
- `importedToMobileAt`
- `snapshotStatus`
- `selectedForDisplay`
- sync origin/status fields for backend-fetched snapshots

`snapshotStatus` tracks local package lineage, not whether the represented week is the current calendar week:

- `current` = latest retained local package for that week
- `superseded` = older local copy replaced by a newer version
- `archived` = intentionally retired from normal display

Calendar-current behavior still comes from `package.isCurrentWeek`.

## Encounter Types

The canonical encounter type list lives in [src/contracts/encounterTypes.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/encounterTypes.ts).

Temporary legacy compatibility mapping is also defined there for older local records and older imported packages that still use the retired labels:

- `Check-in` -> `Relationship Development`
- `Coaching` -> `Job-Specific Coaching`
- `Recognition` -> `Relationship Development`
- `Follow-up` -> `PA Follow-Ups`
- `Incident` -> `Safety Coaching`
- `Support` -> `General Medical Coaching`

That mapping is only used to normalize legacy data at the service/import layer.

## Key Behaviors

### Capture Mode

- Single-column mobile form
- Auto timestamps on save
- Save as `draft` or `ready_for_export`
- Grouped local capture list by status
- Promote drafts to ready
- Show local sync status for each capture
- Select and upload multiple captures as shared `mobile_capture_entry` records
- Optional local JSON download remains available as a local utility

### Week View Mode

- Fetch backend `weekly_snapshot` records for the configured user/worksite
- Validate before saving
- Default to the currently selected week, then current week if present
- View only one week at a time
- Switch between cached week snapshots
- Weekly totals summary card
- Compact read-only daily breakdown
- Overdue reminders are visually emphasized
- Optional local JSON import remains available as a local utility

### Prioritization Mode

- Uses a fixed seven-bucket prioritization order
- Keeps employee-based and station-based items distinct
- Derives live items from mobile captures, a daily roster, and station risk settings
- Supports lightweight execution records for floor-action tracking
- Persists prioritization settings and daily state locally in IndexedDB
- Supports optional backend sync for prioritization settings and daily state
- Scaffolds station scan sections without building a full scan engine
- Stays isolated from capture creation and week-view data flows while supporting an “Open in Capture” handoff

### Utilities

- Load sample data into IndexedDB
- Clear only sample data
- Display schema versions
- Download sample JSON files

## Mock Data

Runtime mock generators live in [src/mocks/generators.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/mocks/generators.ts).

Static sample JSON files live in `public/samples/`:

- `mobile-capture-export.sample.json`
- `mobile-week-current.sample.json`
- `mobile-week-previous.sample.json`

## Integration Notes

The mobile-side sync implementation is isolated at explicit boundaries:

- local capture creation in [src/features/capture/captureRecordFactory.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/capture/captureRecordFactory.ts)
- local capture workflow in [src/features/capture/captureService.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/capture/captureService.ts)
- mobile capture upload orchestration in [src/features/capture/captureSyncService.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/capture/captureSyncService.ts)
- shared backend API access in [src/sync/syncApi.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/sync/syncApi.ts)
- shared sync contract validation in [src/sync/syncValidators.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/sync/syncValidators.ts)
- local week snapshot workflow in [src/features/week-view/weekSnapshotService.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/week-view/weekSnapshotService.ts)
- backend weekly snapshot fetch orchestration in [src/features/week-view/weeklySnapshotSyncService.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/week-view/weeklySnapshotSyncService.ts)
- app-level orchestration in [src/app/useCompanionData.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/app/useCompanionData.ts)

If the shared sync spec changes later, those files are the intended update points rather than the view components.

The prioritization extension is intentionally separate from the existing mobile capture/week-view flows. ETS is still the intended future source of truth for prioritization inputs, status, and recommendations, but today’s implementation lives in [src/features/prioritization/](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/prioritization/) and is operational using mobile-derived data plus temporary in-app settings and optional backend sync.
