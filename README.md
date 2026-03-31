# Daily Encounter Tracking Mobile Companion

Phase 1 local-first mobile companion for the existing Daily Encounter Tracking desktop/laptop workflow.

This app is intentionally narrow:

- `Capture Mode` for fast encounter entry on the floor
- `Week View Mode` for importing and viewing a single desktop-generated week snapshot at a time

It is not a full mobile port of the desktop app. There is no auth, cloud backend, real-time sync, analytics, admin area, or desktop navigation clone.

## Stack

- React 18
- TypeScript
- Vite
- Native IndexedDB
- Manual PWA manifest + service worker

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

## Deployment

This project is ready for simple static hosting on Netlify or Vercel.

Hosting notes:

- The app stays local-first when hosted. Captures and imported snapshots are still stored in the phone browser via IndexedDB.
- No backend, cloud sync, auth, or server database is required.
- The app is a single-page app, so Netlify and Vercel config files are included for safe root routing and fresh `index.html` / service worker fetches.
- Because the storage is browser-local, data stays tied to the specific phone/browser/origin you use.

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
5. Deploy the site.
6. Open the Netlify URL on your phone.

This repo includes [netlify.toml](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/netlify.toml), so Netlify will pick up the expected build settings automatically.

### Vercel Deploy

1. Push the project to GitHub.
2. In Vercel, choose `Add New...` -> `Project`.
3. Import the GitHub repo.
4. Confirm the project settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy the project.
6. Open the Vercel URL on your phone.

This repo includes [vercel.json](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/vercel.json), so Vercel has explicit build, output, cache, and SPA rewrite settings.

## App Structure

```text
src/
  components/
    ModeSwitcher.tsx
    SectionCard.tsx
    StatusPill.tsx
  contracts/
    mobileContracts.ts
    validators.ts
  features/
    capture/
      CaptureForm.tsx
      CaptureList.tsx
      CaptureMode.tsx
      captureRecordFactory.ts
    utilities/
      UtilitiesPanel.tsx
    week-view/
      DayBreakdownCard.tsx
      WeekSummaryCard.tsx
      WeekViewMode.tsx
      weekSnapshotHelpers.ts
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
    weekSnapshotStore.ts
```

## Local Storage Model

The app uses one IndexedDB database with two separate object stores to keep the two domains isolated:

- `mobileEncounterCaptures`
  Stores `MobileEncounterCapture` records created on the phone.
- `storedMobileWeekSnapshots`
  Stores `StoredMobileWeekSnapshot` records imported from desktop-generated week snapshot packages.

This separation is deliberate. Mobile capture records and desktop week snapshot packages are not merged into a shared ambiguous store.

## Data Directions

The app intentionally supports two separate transfer directions:

- `Mobile -> Desktop`
  Mobile-authored capture records are exported as a versioned JSON package for later desktop import.
- `Desktop -> Mobile`
  Desktop-authored weekly read models are imported as a versioned JSON package for local mobile viewing.

The mobile app does not attempt to merge these flows into one record system, and it does not do real-time sync in Phase 1.

## Package Contracts

All package contracts live in [src/contracts/mobileContracts.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/mobileContracts.ts) and are validated in [src/contracts/validators.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/validators.ts).

## Encounter Types

The canonical encounter type list now lives in [src/contracts/encounterTypes.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/encounterTypes.ts).

New form entry, validation, export, and imported week snapshot handling use only that canonical list.

Temporary legacy compatibility mapping is also defined there for older local records and older imported packages that still use the retired labels:

- `Check-in` -> `Relationship Development`
- `Coaching` -> `Job-Specific Coaching`
- `Recognition` -> `Relationship Development`
- `Follow-up` -> `PA Follow-Ups`
- `Incident` -> `Safety Coaching`
- `Support` -> `General Medical Coaching`

That mapping is only used to normalize legacy data at the service/import layer so the current UI and exported data stay on the new encounter type set.

### A. `MobileEncounterCapture`

Created locally from `Capture Mode`. Required UI entry points in Phase 1:

- `employeeDisplayName`
- `encounterType`
- `summaryShort`
- `tags`
- `followUpNeeded`
- optional `followUpSuggestedDate`

The app auto-fills timestamps and default workflow fields when saving.

### B. `MobileCaptureExportPackage`

Created locally when the user selects ready/exportable capture records and downloads one JSON package. Export validation runs before download.

### C. `MobileWeekSnapshotPackage`

Imported from the desktop app. The package is validated before it is accepted into IndexedDB.

### D. `StoredMobileWeekSnapshot`

Wraps each imported desktop week package with mobile-specific import metadata:

- `localWeekSnapshotId`
- `importedToMobileAt`
- `snapshotStatus`
- `selectedForDisplay`

`snapshotStatus` tracks local package lineage, not whether the package represents the current calendar week:

- `current` = latest retained local package for that week
- `superseded` = older local copy replaced by a newer import for the same week
- `archived` = intentionally retired from normal display

Calendar-current behavior continues to come from `package.isCurrentWeek`.

## Key Behaviors

### Capture Mode

- Single-column mobile form
- Auto timestamps on save
- Save as `draft` or `ready_for_export`
- Grouped local capture list by status
- Promote drafts to ready
- Select and export multiple captures as one versioned JSON file

### Week View Mode

- Import desktop-generated week snapshot JSON
- Validate before saving
- Default to the currently selected week, then current week if present
- View only one week at a time
- Switch between imported week snapshots
- Weekly totals summary card
- Compact read-only daily breakdown
- Overdue reminders are visually emphasized

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

Phase 1 keeps future desktop integration isolated at explicit boundaries:

- capture export package creation in [src/features/capture/captureRecordFactory.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/features/capture/captureRecordFactory.ts)
- week snapshot import validation in [src/contracts/validators.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/contracts/validators.ts)
- week snapshot persistence in [src/storage/weekSnapshotStore.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/storage/weekSnapshotStore.ts)
- app-level orchestration in [src/app/useCompanionData.ts](/C:/Users/dlee5/OneDrive/Desktop/ATI/Mobile%20Encounter%20Tracker%20Companion/src/app/useCompanionData.ts)

If the desktop import/export contract changes later, those files are the intended update points rather than the view components.
