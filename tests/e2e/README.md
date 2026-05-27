# E2E Tests (Playwright)

Target: the top 20 user journeys from [PRODUCT_SPEC §7](../../docs/PRODUCT_SPEC.md).

Run against `preview` (per-PR) or `staging`. Never production.

```bash
pnpm --filter @tradex/tests-e2e test:e2e
```

## Critical journeys covered

1. Signup → onboarding → first paper trade
2. Signal arrives → parsed → paper-executed → scorecard updates
3. Manual live execution
4. Channel graduation flow
5. Kite daily reauth
6. Panic button
7. Risk rail blocks over-size trade
8. DPDP data export
9. Refund flow
10. Subscription upgrade
