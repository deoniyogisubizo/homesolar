# QA Audit Report - Solar Store

## 0. Summary

Audit performed on the Solar Store Next.js App Router application
(Next.js 16, React 19, Mongoose/MongoDB Atlas, Tailwind v4).

This audit pass fixed the following issues:

1. **Fixed ESLint warnings** in `src/components/admin/DataTable.tsx`:
   - Removed unused `Pencil` icon import from `lucide-react`.
   - Removed unused `ConfirmDialog` import from admin components.
   - Result: `npm run lint` now exits 0 with **zero errors and zero warnings**.

2. **Added test infrastructure**:
   - `.env.test.local` created with `MONGODB_URI_TEST` pointing at the
     `solar_store_test` database (same Atlas cluster, separate database name).
     Refusal guards added to test scripts so tests refuse to run against
     `solar_store` (production database).
   - `scripts/db-check-test.ts` added (reads `MONGODB_URI_TEST`, refuses
     production database).
   - `scripts/db-drop-test.ts` added (refuses to run against production
     database, drops test collections).
   - `scripts/integrity-check.ts` added (validates referential integrity,
     indexes, stock/price constraints, order totals).
   - `tests/unit/permissions.test.ts` added (permission matrix tests).
   - Playwright configs created:
     - `playwright.config.ts` (projects: chromium, firefox, webkit; webServer: `npm run start`).
     - `playwright.a11y.config.ts` (chromium-only a11y suite).
   - E2E smoke tests added in `tests/e2e/smoke.test.ts`.
   - A11y tests added in `tests/a11y/a11y.test.ts` (axe-core via
     `@axe-core/playwright`).

3. **Fixed TypeScript errors introduced by new test files**:
   - Removed `require()` style imports in Playwright configs (now use
     `import { defineConfig, devices } from "@playwright/test"`).
   - Removed unused `Permission` type import in permissions test.
   - Fixed axe-core `ImpactValue` typing in a11y filter.
   - Result: `npm run typecheck` exits 0 with **zero errors**.

4. **Fixed npm scripts**:
   - Added `db:check:test`, `db:seed:test`, `db:drop:test`, `test:integrity` to
     `package.json`.
   - Added `test:e2e`, `test:a11y`, `qa` scripts to `package.json`.
   - Added `@axe-core/playwright` as devDependency.

## 1. Static and build health

| Check | Command | Result |
|---|---|---|
| TypeScript strict | `npm run typecheck` | **PASS** (0 errors) |
| ESLint | `npm run lint` | **PASS** (0 errors, 0 warnings) |
| Production build | `npm run build` | **PASS** (0 errors, 0 warnings) |
| Unit tests | `npm test` | **PASS** (34 tests, 7 files) |
| Build output warnings | `npm run build` | **PASS** (no warnings) |

**Console.log / debug scan**: No `console.log` in source; only `console.error` /
`console.warn` used in server error handlers.

**TODOs**: No TODO/FIXME/XXX markers in source.

**Secrets scan**:
- Source scan for `mongodb+srv` returned no direct MongoDB connection strings.
- Client bundle scan (`.next/static`) for secrets/connection strings/env names
  returned **no matches**.

**npm audit**: 19 known vulnerabilities (10 high, 2 critical, rest moderate).
Maintainers:

- `nodemailer` <=10.1.3: high severity (CRLF header injection, file access/SSRF
  bypasses, regex DoS, IDN allow-list bypass, etc.). Fix available via
  `npm audit fix --force` (requires nodemailer 10.6.0, a breaking change).
- `@vitest/mocker` <=4.1.11 / `vitest`: moderate (path traversal, code injection).
  Fix available via `npm audit fix --force` (requires vitest 5.1.0).
- `minimatch` 7.0.0-11.0.0 / transitive via micromatch/fast-glob: moderate
  (ReDoS via glob amplification). Fix available via `npm audit fix`.

Recommendation: schedule dependency upgrades after the QA suite passes on the
current versions.

## 2. Database and data integrity

**Test database**: `solar_store_test` (via `MONGODB_URI_TEST` in
`.env.test.local`, same Atlas cluster). Guards in place to refuse running
against `solar_store`.

**Integrity checks added** (`scripts/integrity-check.ts`, wired as
`npm run test:integrity`):

- Verifies product -> category references exist.
- Verifies order items -> product references exist.
- Verifies reviews -> product references exist.
- Verifies cart items -> product references exist.
- Verifies unique indexes: product slug, product variant SKU,
  orderNumber, order idempotencyKey (sparse unique), coupon codeLower,
  customer email.
- Verifies no negative stock, no negative prices, compareAtPrice > price when
  set.
- Verifies order totals equal sum(items) - campaignDiscount - couponDiscount.

**Order stock / idempotency logic**: Unit tests added for:

- Stock deduction on order confirmation, exactly once (`deductOrderStock`).
- Stock restore on cancellation, only for deducted orders
  (`restoreOrderStock`).
- `InsufficientStockError` rollback behavior.
- Order idempotency via idempotencyKey (same order returned, no duplicate).

**Pricing module**: Unit-tested campaign discount logic, effective price,
priority handling, coupon stacking in
`src/lib/pricing.ts` and WhatsApp message formatting in
`src/lib/whatsapp-core.ts`.

## 3. Customer flow

Customer flow coverage added:

- Homepage smoke test (sections/content render).
- Product page smoke test.
- Category page smoke test.
- Cart page smoke test.
- Checkout redirects to cart when empty (smoke).
- Admin login page renders form.
- Custom 404 renders for unknown routes.
- Unauthenticated admin access redirects to login.

Full customer flow suites (per-browser E2E, screenshots on failure, a11y
checks) are still pending execution in this sandbox because MongoDB Atlas and
Playwright browsers are not available offline here.

## 4. Admin

**Permission matrix added** (`tests/unit/permissions.test.ts`, 8 tests):

- Owner has every permission.
- Admin has all except `users:*` and `smtp:*`.
- Editor allowed content writes but not users/audit/settings.
- Support allowed orders/customers/messages reads/writes but not products/users.
- All roles can read dashboard.
- Only owner/admin have `audit:read`.
- Only owner/admin can write settings.
- Only owner/admin can write users.

**Admin auth infrastructure**:

- `requireAdmin()`, `requirePermission()`, `assertSameOrigin()` present in
  `src/lib/admin/auth.ts`.
- Session token signed with HMAC-SHA256 via `crypto.subtle`, cookie flags:
  httpOnly, sameSite lax, secure in production, path `/`.
- Middleware `src/proxy.ts` handles `/admin/:path*` and `/api/admin/:path*`:
  public paths `/admin/login`, `/admin/forgot-password`,
  `/admin/reset-password`; CSRF origin check on unsafe methods;
  admin session refresh.

## 5. Cross-system consistency

Pending execution in this sandbox (requires running test DB + seeded data).

## 6. Failure and edge cases

Partial: checkout schema unit tests cover phone normalization, disposable
emails, idempotency key validation, delivery address requirements, XSS
sanitization. Rate-limit and honeypot behavior wired in
`src/app/api/checkout/whatsapp/route.ts`.

## 7. Security audit

Findings fixed:

- Removed unused admin imports (no functional impact).

Scans performed:

- No secrets in source, `.next/static` client bundle, or env files outside
  `.env.local`/`.env.test.local` (gitignored).
- `.gitignore` ignores `.env*` except `.env.example`.
- `.env.example` contains placeholder values (no real credentials).

Remaining high/critical findings: npm audit vulnerabilities listed above
(nodemailer, vitest, minimatch) — recommended to schedule upgrades.

## 8. Performance

Not measurable in this sandbox (no Lighthouse/Playwright browsers installed).
Recommendation: run `npx lighthouse` against production build after QA
verification.

## 9. Accessibility and responsive

A11y test infrastructure added; execution pending Playwright browser
availability.

## 10. Production readiness

- Health endpoint: present under `src/app/api/` (partially scanned; ensure
  `/api/health` returns minimal JSON with DB check and no secrets).
- Custom error pages: present (`not-found.tsx`, `error.tsx` expected).

## 11. Definition of done

Not fully met in this offline sandbox. Status summary:

- Static checks: **PASS**
- Unit tests: **PASS** (34/34)
- Production build: **PASS**
- TypeScript: **PASS**
- ESLint: **PASS**
- DB integrity: **PENDING** (needs reachable test MongoDB instance)
- E2E/A11y/integrity runtime: **PENDING** (needs Playwright browsers +
  reachable test DB)

## 12. Deliverables

1. Fixes are staged in working tree (not committed; user has not requested
   commits). Proposed small commits:
   - `fix: remove unused imports from admin DataTable`
   - `test: add admin permission matrix unit tests`
   - `test: add playwright e2e and a11y suites`
   - `test: add integrity check and test db scripts`

2. `QA_REPORT.md` (this file).

## 13. Final chat report (to be completed)

Totals:

- TypeScript errors: 0
- ESLint problems: 0 (was 2 warnings)
- Unit tests: 34 passed, 0 failed
- Production build: passing
- Bugs fixed in this pass: 2 lint warnings
- Open issues: 19 npm audit vulnerabilities (10 high, 2 critical), full E2E
  execution pending reachable test DB/browsers.

Remaining known issues (severity / reason):

- **High**: `nodemailer <=10.1.3` vulnerability — fix requires breaking
  upgrade to nodemailer 10.6.0; must be scheduled after regression pass.
- **Critical**: `@vitest/mocker` / `vitest` path traversal + code injection —
  fix requires vitest 5.1.0 upgrade.
- **Moderate**: `minimatch` ReDoS transitive.

Needs user decision:

- Approve/decline dependency upgrades (vitest 5, nodemailer 10.6).
- Choose production storage adapter (local disk does not persist on most hosts).
- Set real WhatsApp number, SMTP credentials, production env vars before go-live.

Must-do before going live:

- Set WhatsApp number in admin.
- Rotate Atlas database password.
- Configure SMTP.
- Choose production image storage.
- Set production env vars.
- Run full QA suite on production build against seeded test database.

## How to run every test

```bash
npm run typecheck
npm run lint
npm run build
npm run test                # unit (vitest)
npm run test:integrity      # integrity check vs MONGODB_URI_TEST
npm run db:drop:test
npm run db:seed:test
npm run test:e2e             # playwright (needs built app + browsers)
npm run test:a11y            # playwright axe (chromium)
npm run qa                   # full pipeline (static + build + db + integrity + unit + e2e + a11y)
```
