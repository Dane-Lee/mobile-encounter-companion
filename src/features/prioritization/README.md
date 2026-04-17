# Prioritization Extension

This folder contains the Mobile Companion prioritization extension for a Daily Encounter Prioritization List.

## Implemented

- Fixed seven-bucket prioritization order with employee-based and station-based item support
- Live derivation from:
  - mobile captures
  - daily pasted roster
  - local station risk settings
- Structured temporary tags:
  - `uncertain-pain`
  - `uncertain-mobility`
- IndexedDB persistence for:
  - prioritization settings
  - daily prioritization state
  - item overrides
  - execution records
- Rebuild-with-overlays behavior so manual status and execution state survive refreshes
- Optional sync contract/client support for:
  - `prioritization_settings`
  - `daily_prioritization_state`
- Capture handoff that can open the capture form with safe prioritization-prefill values
- Station scan scaffolding for:
  - High-Risk Behaviors
  - High-Risk Sustained / Repetitive Postures
  - Task / Work Risk

## Placeholder / intentionally not built yet

- No ETS integration
- No automated heat-map or scan engine
- No final business-rule automation for physical inefficiency decisions
- No analytics or reporting layer
- No multi-user conflict resolution beyond last-write-wins

## Intended later

- ETS becomes the source of truth for prioritization inputs, status, and recommendation outputs
- Mobile Companion can eventually read ETS-authored prioritization items instead of deriving them locally
- Execution records can later bridge into encounter creation and follow-up workflows once the source-of-truth boundaries are approved
