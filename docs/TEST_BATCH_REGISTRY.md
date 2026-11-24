# Test batch registry — ordering-app-business-v26

Living inventory for incremental test + coverage work on app-owned code.

## Coverage gate — interim vs final

| Stage | What 70% means |
|-------|----------------|
| **During batches** | ≥70% average on whatever is currently in Jest `collectCoverageFrom` / coverage include. |
| **At issue completion (ship)** | ≥70% average with **all** testable units from this registry in the gate (or explicitly `skipped` with reason). |

**Ship criterion:** full inventory in gate + ≥70% on that full set. **Not acceptable:** 70% on a partial include only.

**Excluded from this issue:** `src/@/components` submodule — covered by implementation notes .

## Counting convention

| Unit type | Rule |
|-----------|------|
| **Wired UI export** | Every folder under `src/ui/src/components/**` with `index.tsx` or `index.js` — nested layouts included. |
| **Page** | Every screen file in `src/pages/*.tsx`. |
| **Shared primitives** | `src/ui/src/components/shared/**` (OButton, OModal, OToast, etc.). |
| **App utils** | `src/ui/src/utils/index.tsx`. |

## Test file convention (required)

**One test file per gated unit.** Batch IDs (P1, B3, S0, …) are **planning groups only** — not file names.

| Unit type | Test path |
|-----------|-----------|
| Page `src/pages/Login.tsx` | `src/pages/__tests__/Login.test.tsx` |
| UI `src/ui/src/components/LoginForm/` | `src/ui/src/components/LoginForm/__tests__/LoginForm.test.tsx` |
| Nested UI `LoginForm/Otp/` | `src/ui/src/components/LoginForm/Otp/__tests__/Otp.test.tsx` |
| Shared `shared/OButton.tsx` | `src/ui/src/components/shared/__tests__/OButton.test.tsx` |
| Utils `src/ui/src/utils/index.tsx` | `src/ui/src/utils/__tests__/index.test.tsx` |

**Do not** combine multiple pages or components in one file (e.g. `p1-auth.test.tsx`, `shared.test.tsx`, `m1-auth.test.tsx`). Shared mocks belong in `jest/helpers/`, not mega batch files.

## Rules per batch (every session)

1. Pick the **next pending batch** below.
2. Add **one test file per unit** (see convention above).
3. Expand Jest `collectCoverageFrom` for every new path in the batch.
4. Run verify commands — gate must stay ≥70%.
5. Mark batch `done` here + update `docs/ci-coverage-plan.md`.
6. Stop after one batch unless explicitly asked.


## Inventory at ship

| Surface | Units | Batches |
|---------|-------|---------|
| Foundation harness | scaffold | F0, F1 |
| Shared primitives | 18 files | S0 |
| App utils | 1 (`src/ui/src/utils/index.tsx`) | U1 |
| Pages (`src/pages`) | 20 | P1, P2, P3, P4 |
| UI wired exports | 51 | B1, B2, B3, B4, B5, B6, B7 |
| **Total gated units** | **72** | **13 batches** |

**Gate today:** 89 files (S0 + U1 + pages + B1–B7) — **~70.6% avg**, **90 suites**, **348 tests**. Inventory complete — remaining ship work is CI branch protection / review.

## Shared primitives batch

### S0 — `src/ui/src/components/shared/**`

| Unit | Status |
|------|--------|
| `shared/OButton.tsx` | done |
| `shared/OModal.tsx` | done |
| `shared/OToast.tsx` | done |
| `shared/OInput.tsx` | done |
| `shared/OAlert.tsx` | done |
| `shared/OAlertOriginal.tsx` | done |
| `shared/OText.tsx` | done |
| `shared/ODropDown.tsx` | done |
| `shared/ODropDownCalendar.tsx` | done |
| `shared/OBottomPopup.tsx` | done |
| `shared/OIcon.tsx` | done |
| `shared/OIconButton.tsx` | done |
| `shared/OTextarea.tsx` | done |
| `shared/OFab.tsx` | done |
| `shared/OLink.tsx` | done |
| `shared/ONavbar.tsx` | done |
| `shared/OSegment.tsx` | done |
| `shared/OChatBubble.tsx` | done |
| `shared/index.tsx` | skipped (re-exports only) |

B7 contains UI folders shared with driver app template — still require smoke tests for coverage completeness.

---

## Foundation

### F0 — Prerequisite (before F1)

| Work item | Status |
|-----------|--------|
| Add missing `jest/setup.js` (copy from marketplace app) | done |


### F1 — Jest harness + CI scaffold

| Work item | Status |
|-----------|--------|
| Jest + RN preset + Testing Library RN | done |
| `jest/setup.js` + `renderWithProviders` | done |
| Coverage scripts + `collectCoverageFrom` | done |
| `.github/workflows/ci.yml` + `tsc --noEmit` | done |

---

### U1 — App utils

| Unit | Status |
|------|--------|
| `src/ui/src/utils/index.tsx` | done |

---

## Page batches

### P1 — Auth & splash

| Unit | Status |
|------|--------|
| `src/pages/Splash.tsx` | done |
| `src/pages/IntroductoryTutorial.tsx` | done |
| `src/pages/Login.tsx` | done |
| `src/pages/Signup.tsx` | done |
| `src/pages/ForgotPassword.tsx` | done |
| `src/pages/Sessions.tsx` | done |
| `src/pages/NetworkError.tsx` | done |
| `src/pages/NotFound.tsx` | done |
### P2 — Orders core

| Unit | Status |
|------|--------|
| `src/pages/Home.tsx` | done |
| `src/pages/MyOrders.tsx` | done |
| `src/pages/AcceptOrRejectOrder.tsx` | done |
| `src/pages/OrderDetails.tsx` | done |
| `src/pages/OrderSummary.tsx` | done |
| `src/pages/OrderMessage.tsx` | done |
| `src/pages/Messages.tsx` | done |
### P3 — Stores & products

| Unit | Status |
|------|--------|
| `src/pages/Stores.tsx` | done |
| `src/pages/BusinessProductListing.tsx` | done |
### P4 — Printer & profile

| Unit | Status |
|------|--------|
| `src/pages/PrinterSetup.tsx` | done |
| `src/pages/TicketPreview.tsx` | done |
| `src/pages/Profile.tsx` | done |

---

## UI component batches

### B1 — Shell

| Unit | Status |
|------|--------|
| `src/ui/src/components/shared` | done (S0) |
| `src/ui/src/components/Home` | done |
| `src/ui/src/components/LanguageSelector` | done |
| `src/ui/src/components/LogoutButton` | done |
| `src/ui/src/components/FloatingButton` | done |
| `src/ui/src/components/NetworkError` | done |
| `src/ui/src/components/NotFoundSource` | done |
| `src/ui/src/components/WebsocketStatus` | done |
| `src/ui/src/components/NotificationSetting` | done |
| `src/ui/src/components/SearchBar` | done |
### B2 — Auth

| Unit | Status |
|------|--------|
| `src/ui/src/components/LoginForm` | done |
| `src/ui/src/components/LoginForm/Otp` | done |
| `src/ui/src/components/ForgotPasswordForm` | done |
| `src/ui/src/components/SignupForm` | done |
| `src/ui/src/components/VerifyPhone` | done |
| `src/ui/src/components/Sessions` | done |
| `src/ui/src/components/UserFormDetails` | done |
| `src/ui/src/components/UserProfileForm` | done |
### B3 — Orders

| Unit | Status |
|------|--------|
| `src/ui/src/components/OrdersListManager` | done |
| `src/ui/src/components/OrdersOption` | done |
| `src/ui/src/components/OrdersOptionBusiness` | done |
| `src/ui/src/components/OrdersOptionCity` | done |
| `src/ui/src/components/OrdersOptionDate` | done |
| `src/ui/src/components/OrdersOptionDelivery` | done |
| `src/ui/src/components/OrdersOptionDriver` | done |
| `src/ui/src/components/OrdersOptionPaymethod` | done |
| `src/ui/src/components/OrdersOptionStatus` | done |
| `src/ui/src/components/PreviousOrders` | done |
| `src/ui/src/components/AcceptOrRejectOrder` | done |
| `src/ui/src/components/NewOrderNotification` | done |
| `src/ui/src/components/OrderSummary` | done |
| `src/ui/src/components/ProductItemAccordion` | done |
### B4 — Messages & details

| Unit | Status |
|------|--------|
| `src/ui/src/components/OrderDetailsLogistic` | done |
| `src/ui/src/components/OrderMessage` | done |
| `src/ui/src/components/MessagesOption` | done |
| `src/ui/src/components/PreviousMessages` | done |
| `src/ui/src/components/Chat` | done |
| `src/ui/src/components/Contacts` | done |
| `src/ui/src/components/ReviewCustomer` | done |
### B5 — Stores & map

| Unit | Status |
|------|--------|
| `src/ui/src/components/StoresList` | done |
| `src/ui/src/components/BusinessController` | done |
| `src/ui/src/components/BusinessProductList` | done |
| `src/ui/src/components/MapView` | done |
| `src/ui/src/components/GoogleMap` | done |
### B6 — Printer

| Unit | Status |
|------|--------|
| `src/ui/src/components/PrinterSettings` | done |
| `src/ui/src/components/PrinterEdition` | done |
| `src/ui/src/components/TicketPreview` | done |
### B7 — Legacy/shared driver UI copies

| Unit | Status |
|------|--------|
| `src/ui/src/components/DriverMap` | done |
| `src/ui/src/components/DriverSchedule` | done |
| `src/ui/src/components/ScheduleBlocked` | done |
| `src/ui/src/components/PhoneInputNumber` | done |

## Completion checklist

- [x] F1 harness green
- [x] S0 shared primitives tested
- [x] U1 utils done
- [x] P1 auth & splash pages done
- [x] P2 orders core pages done
- [x] P3 stores & products pages done
- [x] P4 printer & profile pages done
- [x] All page batches done (20/20)
- [x] B1 shell UI components done
- [x] B2 auth UI done
- [x] B3 orders UI done
- [x] B4 messages & details UI done
- [x] B5 stores & map UI done
- [x] B6 printer UI done
- [x] All UI batches B7 done
- [x] `collectCoverageFrom` = full inventory
- [x] `pnpm test:coverage` ≥70% on full include
- [ ] CI Quality Gate green on `main` + `production`

## Verify locally

```bash
pnpm install
pnpm test
npx tsc --noEmit
pnpm lint
pnpm test:coverage
```
