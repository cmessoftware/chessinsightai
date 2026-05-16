# Spec 06 — Visualization

## Purpose
Present validated insights without altering analytical logic.

## Inputs
- validated insights
- metrics
- classification outputs

## Outputs
- UI (Streamlit or equivalent)

## Components
- performance charts
- error distribution by phase
- validated insights list
- recommended exercises

## Invariants
1. REJECTED insights must never be displayed
2. Every insight must be traceable
3. UI must not derive new logic

## Validation
- end-to-end tests
- UI-data consistency checks

## Evidence
- rendered outputs linked to trace_ids