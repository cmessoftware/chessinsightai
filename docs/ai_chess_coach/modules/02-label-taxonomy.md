# Label Taxonomy for Gitea

## Domain Labels

```text
domain:core-engine
domain:ml
domain:orchestration
domain:rag
domain:llm
domain:api
domain:ui
domain:data
domain:testing
domain:devops
domain:research
domain:observability
```

## Type Labels

```text
type:feature
type:bug
type:refactor
type:research
type:test
type:spike
type:documentation
```

## Priority Labels

```text
priority:p0
priority:p1
priority:p2
priority:p3
```

## Status Labels

```text
status:blocked
status:in-progress
status:review
status:done
status:deprecated
```

## Cross-Cutting Labels

```text
cross-cutting
hallucination-control
evaluation-grounding
explainability
caching
performance
```

## Usage Rule

Every issue must include at least:
- one `domain:*` label
- one `type:*` label
- one `priority:*` label
- one `status:*` label
