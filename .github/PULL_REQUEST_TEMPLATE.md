## Summary

<!-- One sentence: what changed and why. -->

## Context

<!-- Link issue / spec section / ADR if relevant. -->
- Related to: #
- Spec section: [PRODUCT_SPEC.md](../docs/PRODUCT_SPEC.md) §
- ADR: [docs/architecture/adr/](../docs/architecture/adr/)

## Change type

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Test
- [ ] Infra / DevOps
- [ ] Chore

## Checklist

- [ ] Tests added/updated
- [ ] Docs updated (if user-facing)
- [ ] No new `TODO` without a linked issue
- [ ] Nothing deleted that's still in use (`ts-unused-exports` / `vulture` clean)
- [ ] No secrets committed (`gitleaks` will block otherwise)
- [ ] If prompt changed: golden-set regression passes
- [ ] If schema changed: migration reviewed + forward-compatible
- [ ] If risk rail changed: rail list updated in [PRODUCT_SPEC §8.7](../docs/PRODUCT_SPEC.md)
- [ ] If broker adapter changed: Kite + paper both tested
- [ ] If deploys needed during market hours: SEV-1 hotfix approval obtained

## Test plan

<!-- How did you verify? Include steps, screenshots, logs. -->

## Risk assessment

<!-- What could break? What's the blast radius? How do we roll back? -->
