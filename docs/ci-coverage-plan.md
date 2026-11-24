# CI / coverage plan — ordering-app-business-v26

React Native app. Submodule `src/@/components` is **out of scope**.

Coverage gate: `(statements + branches + functions + lines) / 4 >= 70%` on scoped Jest coverage, expanded batch-by-batch until full app-owned surface is gated.

> **Ship rule (locked):** Complete only when **all** units in [TEST_BATCH_REGISTRY.md](./TEST_BATCH_REGISTRY.md) are in `collectCoverageFrom` **and** average ≥70%. Partial include is not done.

## Live progress

**Overall issue progress: 98%** (inventory + ≥70% gate met; CI branch protection / ship review remaining)

| Phase | Work | Status | Coverage avg |
|-------|------|--------|--------------|
| F0/F1 | Jest harness + CI scaffold | ✅ done | n/a (scaffold) |
| S0 | Shared primitives (18 files) | ✅ done | **77.5%** |
| U1 | App utils | ✅ done | **90.5%** |
| P1–P4 | All 20 pages | ✅ done | **~95%** |
| B1 | Shell UI (9 components) | ✅ done | **~80%** |
| B2 | Auth UI (8 components) | ✅ done | **~70%** |
| B3 | Orders UI (14 components) | ✅ done | **~70.4%** (70 files) |
| B4 | Messages & details (7 components) | ✅ done | **~70.3%** (77 files) |
| B5 | Stores & map (5 components) | ✅ done | **~70.4%** (82 files) |
| B6 | Printer (3 components) | ✅ done | **~70.4%** (85 files) |
| B7 | Legacy/shared driver UI (4) | ✅ done | **~70.6%** (89 files) |
| Gate | 70% on full include + branch protection | partial | full include ✅ / branch protection pending |
| Ship | Review → `main` + `production` | pending | — |

**Gate today:** 89 files — **70.63% avg** (348 tests, 90 suites). Full registry inventory gated. **Next:** CI branch protection + review/ship.

Required status check: **CI Quality Gate** (one job: i18n + lint + typecheck + `pnpm test:coverage` + 70% gate). PRs only; no push rerun. Coverage reporters: `text` + `json` only (no `html` / `lcov`). `test:coverage` does not use `--runInBand`.

## Surface at ship

| Surface | Units |
|---------|-------|
| Pages | 20 |
| UI wired exports | 51 |
| Shared primitives | 18 files |
| App utils | 1 (`src/ui/src/utils/index.tsx`) |
| **Total paths** | **72** + shared folder |

## Verify locally

```bash
pnpm install
pnpm test
npx tsc --noEmit
pnpm lint
pnpm test:coverage
pnpm test:coverage:summary
```

## Canonical batch list

**Read before every test session:** [TEST_BATCH_REGISTRY.md](./TEST_BATCH_REGISTRY.md)
