# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (requires Node 24.13.0 via NVS)
nvs exec node/24.13.0/x64 npm run dev

# Build for production (always run before pushing to catch TypeScript errors)
nvs exec node/24.13.0/x64 npm run build

# Lint
npm run lint

# Run all tests
nvs exec node/24.13.0/x64 npx vitest run

# Run a single test file
nvs exec node/24.13.0/x64 npx vitest run src/lib/__tests__/auth.test.ts
```

> On Windows PowerShell, use `;` not `&&` to chain commands.

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

### Test Coverage

Vitest tests in `src/lib/__tests__/auth.test.ts` cover: password hashing, JWT sign/verify, session lifecycle, single-session enforcement, and user store loading from env vars (26 tests total).
