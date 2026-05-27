# scripts/

Developer utilities and one-off CLIs. Everything in here should be runnable with
a single command and safe to execute locally.

## Existing

- `validate-local.ps1` - Windows-friendly pre-push validation for the live demo.
  It installs demo dependencies, generates Prisma, typechecks, builds the
  Next.js app, starts it on `http://localhost:3000`, and runs localhost smoke
  checks.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1
```

Useful options:

```powershell
# Use another port
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1 -Port 3001

# Build/typecheck only
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1 -SkipQa

# Match CI's clean install behavior
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1 -CleanInstall

# Also run selected QA phases
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1 -QaPhases m0.2,m0.3
```

## Planned

- `seed-local.ts` - create 5 dev users with realistic data
- `import-legacy-signals.ts` - ingest legacy parsed signals into the local dev DB as fixtures
- `rotate-keys.ts` - rotate KMS data keys for all tenants
- `export-scorecards.ts` - dump all channel scorecards as CSV for analysis
- `smoke-test-prod.ts` - quick production smoke check after deploy
