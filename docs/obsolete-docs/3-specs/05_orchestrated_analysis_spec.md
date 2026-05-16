# Spec 05 — Orchestrated Analysis

## Purpose
Generate structured insights through controlled orchestration.

## Components
- Planner
- Executor
- Critic
- Memory

## Flow
input → planner → executor → critic → memory → insights

## Responsibilities

### Planner
- define analysis focus
- prioritize critical segments

### Executor
- run:
  - engine deep analysis
  - pattern detection
  - ML enrichment
- produce evidence packs

### Critic
- validate insights against evidence
- detect contradictions
- assign status

### Memory
- persist patterns
- build player profile

## Invariants
1. No insight bypasses Critic
2. All insights must reference evidence
3. Executor produces structured outputs only (no final text)

## Evidence
- analysis_plan
- evidence_pack
- critic_decision