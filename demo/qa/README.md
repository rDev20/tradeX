# tradeX QA Module

Standalone QA harness. **Each MVP phase has its own check file.** Each check is a small, named assertion against:

- **Static state** — files, schema, env vars, code conventions
- **HTTP behavior** — the running production server
- **Database integrity** — Prisma's SQLite, queried directly
- **Security** — secrets, hashes, encryption presence

Output: a Markdown report at `reports/<phase>.md` plus a console summary.

## How to use

```bash
# from demo/qa/
npm install                # one-time, installs tsx
npm run qa:m0.1            # run M0.1 phase checks
# or
npm run qa -- m0.2         # any phase
```

Pre-requisites for HTTP checks:
- The web app must be running on `http://localhost:3000` (or set `QA_BASE_URL`)
- DB must be at `demo/demo.db` (or set `QA_DB_PATH`)

## Layout

```
qa/
├── package.json            # tsx + ts as the only deps
├── run.ts                  # entry — picks phase by arg
├── lib/
│   ├── check.ts            # check runner + assert helpers
│   ├── http.ts             # cookie-aware fetch wrapper
│   ├── db.ts               # SQLite reader (node:sqlite, built-in)
│   └── report.ts           # console + markdown formatter
├── phases/
│   ├── m0_1.ts             # auth + register
│   └── m0_2.ts             # onboarding wizard (when built)
└── reports/
    └── m0_1.md             # latest run output
```

## Adding a new phase

1. Copy `phases/m0_1.ts` → `phases/m0_x.ts`
2. Replace the checks, register in `run.ts`
3. Run `npm run qa -- m0.x`

## Conventions

- One check = one `await check(name, () => ...)` call.
- Throw inside the body to fail; return normally to pass.
- Use `expect()` from `lib/check.ts` for readable assertions.
- Group related checks in sections — the report formats by section.
