# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Read **`AGENTS.md`** before making any decisions. It is the primary onboarding document and contains: full project overview, authentication flow, external API details, data structures, email feature architecture, table features, environment variables, and important constraints. Keep it up to date whenever a new feature is added.

## Testing rule

**Every new feature or bug fix must include Vitest unit tests.** Place them in `src/lib/__tests__/`. If new logic lives in a file that isn't directly testable (e.g. a Next.js route), extract it into a utility module under `src/lib/` first (as was done with `src/lib/phoneUtils.ts`), then test the utility. Run the full suite before committing — all tests must pass.

**After adding any feature**, always:
1. Run the full test suite and confirm all tests pass.
2. Check that the new functionality has test coverage. If tests are missing, add them. If existing tests are broken by the change, fix them before moving on.
3. Do not consider a feature done until the full suite is green.

## Commands

```bash
# Development server (requires Node 24.13.0 via NVS)
nvs exec node/24.13.0/x64 npm run dev

# Build for production (always run before pushing to catch TypeScript errors)
nvs exec node/24.13.0/x64 npm run build

# Lint
npm run lint

# Run all tests
nvs exec node/24.13.0/x64 npx.cmd vitest run

# Run a single test file
nvs exec node/24.13.0/x64 npx.cmd vitest run src/lib/__tests__/auth.test.ts
```

> On Windows PowerShell, use `;` not `&&` to chain commands. When invoking from Claude Code (bash shell), prefix with `powershell.exe -Command "cd 'C:\Users\CoCo Dev\Documents\Workspace\AndrecoProject'; nvs exec node/24.13.0/x64 npx.cmd vitest run"`.

## Architecture

**CRM Task Manager** — A Next.js 16 (App Router) app that proxies requests to an external CRM API, with internal JWT auth and admin user management backed by Upstash Redis.

### Key Architectural Decisions

- **API proxy pattern**: All external CRM calls go through Next.js API routes (`src/app/api/users/`). The frontend never calls the CRM directly. The external API uses `Bear ` (not `Bearer `) as the auth prefix.
- **Dual user store**: Users are stored in Redis first, with `USERS_CONFIG` env var as a fallback. Sessions are Redis-first with in-memory fallback. Redis is auto-detected from `KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL`.
- **Single-session enforcement**: A new login invalidates the previous session. The dashboard polls `/api/auth/session` every 30s to detect forced logouts.
- **Role in JWT**: The `role` field (`admin` | `user`) is embedded in the JWT cookie (`auth_token`, httpOnly). Middleware checks the cookie on every protected route.
- **MUI Table over DataGrid**: MUI X DataGrid has React 19 compatibility issues — use standard MUI Table instead.
- **Email abstraction**: `EmailProvider` interface in `src/lib/email/` allows swapping providers. Current implementation is Gmail SMTP via Nodemailer.
- **Client-side config**: The external CRM Bearer token and email credentials (Gmail address, app password) are stored in `localStorage`, not server-side. Users configure these via the Settings dialog.

### `UserData` Interface — Keep in Sync

This interface exists in three places and must stay compatible:
1. `UserListTable.tsx`
2. `EmailDialog.tsx` (uses optional fields)
3. `EmailService.ts`

### Rate Limits / Delays (don't remove these)

| Operation | Delay |
|-----------|-------|
| Follow-up submissions | 500ms between API calls |
| Email fetching (taskinfo) | 100ms, batches of 5 |
| Email sending | 200ms between sends |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs JWT tokens (32+ chars) |
| `USERS_CONFIG` | JSON array of `{username, passwordHash}` (fallback) |
| `KV_REST_API_URL` | Upstash/Vercel KV REST URL |
| `KV_REST_API_TOKEN` | Upstash/Vercel KV REST token |
| `SEED_SECRET` | Optional secret for `/api/admin/seed` |

### Deployment

Vercel auto-deploys from the `master` branch of `eduSpinouza/crm-task-manager`. Always run `npm run build` locally before pushing.

## Commit style

Do **not** add `Co-Authored-By` trailers to commits.

### Test Coverage

| File | Tests | Covers |
|------|-------|--------|
| `src/lib/__tests__/auth.test.ts` | 39 | Password hashing, JWT sign/verify, session lifecycle, single-session enforcement, user store |
| `src/lib/__tests__/phoneUtils.test.ts` | 30 | Country config inference from base URL, `cleanPhoneNumber` for all 4 countries (mx/pe/co/cl), edge cases |
| `src/lib/__tests__/emailService.test.ts` | 6 | `EmailService` placeholder replacement including `{{extensionAmount}}`, edge cases (undefined, 0, multiple occurrences, subject line) |
| `src/lib/__tests__/templateUtils.test.ts` | 22 | Shared `replacePlaceholders` — text mode (all tokens, edge cases) and html mode (img tags, br conversion) |
