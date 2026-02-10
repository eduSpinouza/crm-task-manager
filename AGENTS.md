# AGENTS.md - Project Context for AI Assistants

## Project Overview
**CRM Task Manager** - A Next.js web application for managing user follow-ups via an external CRM API.

## Tech Stack
- **Framework**: Next.js 16.1.4 (App Router, Turbopack)
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI v5)
- **HTTP Client**: Axios
- **Node.js**: v24.13.0 (managed via NVS)

## Project Structure
```
src/
├── app/
│   ├── api/                    # Next.js API Routes (backend proxy)
│   │   ├── auth/login/         # Mock internal authentication
│   │   ├── email/send/         # Email sending endpoint
│   │   └── users/
│   │       ├── list/           # Proxy: fetch user list
│   │       ├── taskinfo/       # Proxy: fetch task details (email, etc.)
│   │       └── followup/       # Proxy: submit follow-up actions
│   ├── dashboard/              # Main protected dashboard page
│   ├── login/                  # Login page
│   └── layout.tsx              # Root layout with ThemeRegistry
├── components/
│   ├── ThemeRegistry/          # MUI theme provider setup
│   ├── UserListTable.tsx       # Main data table with filters
│   ├── FollowUpDialog.tsx      # Dialog for submitting follow-ups
│   ├── EmailDialog.tsx         # Dialog for composing/sending emails
│   └── TokenSettings.tsx       # Settings: API token + email config (tabbed)
├── lib/
│   ├── auth.ts                 # Auth: hashing, JWT, session store
│   └── email/
│       ├── EmailProvider.ts    # Interface for email providers
│       ├── EmailService.ts     # Email orchestration + placeholder replacement
│       └── providers/
│           └── GmailProvider.ts # Gmail SMTP via Nodemailer
├── middleware.ts               # Route protection (cookie check)
└── theme.ts                    # MUI theme configuration
```

## Authentication Flow

### Internal Auth (JWT + Single-Session)
1. **Login**: POST `/api/auth/login` with username/password
2. **Validation**: Credentials checked against `USERS_CONFIG` env var (scrypt hashes)
3. **Session**: Server creates session ID, stores in in-memory Map (one active session per user)
4. **JWT**: Signed token set as `httpOnly` cookie (`auth_token`)
5. **Middleware**: Checks cookie on every protected route
6. **Session Polling**: Dashboard polls `/api/auth/session` every 30s
7. **Single-Session**: New login invalidates previous session → old device gets kicked
8. **Logout**: DELETE `/api/auth/session` → destroys session + clears cookie

### External CRM API Token
- User manually configures the external CRM Bearer token via Settings dialog
- Stored in `localStorage.external_api_token`
- Sent as `Authorization` header to API proxy routes

### Auth API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Authenticate + create session |
| `/api/auth/session` | GET | Check session health |
| `/api/auth/session` | DELETE | Logout + destroy session |
| `/api/auth/setup` | GET | Generate password hash (dev only) |

### Session Store Interface
`SessionStore` interface in `src/lib/auth.ts` is swappable for future persistence (Redis/Postgres). Currently uses in-memory Map (resets on deploy).

## External API Details
**Base URL**: `https://crm.cashimex.mx/api/manage/`

### Endpoints (proxied via Next.js API routes):
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/urge/task/waitUrgeTaskPage` | POST | Fetch paginated user list |
| `/urge/task/getTaskInfo/{taskId}/{orderId}` | GET | Fetch user details (email, images) |
| `/urge/task/addFollow` | POST | Submit follow-up for a task |

### Authentication Headers (External API):
```typescript
headers: {
    'Authentication': `Bear ${token}`,  // Note: "Bear" not "Bearer"
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cookie': `Admin-Token=${token}`
}
```

## Key Data Structures

### UserData (from list endpoint)
```typescript
interface UserData {
    taskId: number;        // Internal use only, not shown in table
    orderId: number;
    userName: string;
    phone: string;
    appName: string;       // Filterable
    productName: string;
    totalAmount: number;   // Displayed as "Contract Amount"
    repayAmount: number;   // Displayed as "Total Amount"
    overdueFee: number;
    overdueDay: number;    // Filterable
    repayTime: string;
    stageName: string;
    followResult: number;
    note: string;
    // From taskinfo endpoint:
    email?: string;
    idNoUrl?: string;      // User ID photo URL (used in emails)
    livingNessUrl?: string; // Face image URL (used in emails)
}
```

### Follow-up Target Values
| Value | Target |
|-------|--------|
| 0 | Self |
| 1 | Emergency Contact 1 |
| 2 | Emergency Contact 2 |
| 3 | Contacts |

### Follow-up Result Values
**For Self (target=0):**
| Value | Result |
|-------|--------|
| 1 | PTP |
| 2 | Financial difficult |
| 3 | Missed |
| 4 | Powered off |
| 5 | Invalid number |
| 6 | Bad attitude |

**For Contacts (target=1,2,3):**
| Value | Result |
|-------|--------|
| 1 | Willing to assist |
| 3 | Missed |
| 5 | Invalid number |
| 6 | Bad attitude |

## Development Commands
```bash
# Start dev server (requires Node 24.13.0 via NVS)
nvs exec node/24.13.0/x64 npm run dev

# Build for production
nvs exec node/24.13.0/x64 npm run build

# PowerShell: use semicolons not && for chaining
git add -A; git commit -m "message"; git push
```

## Deployment
- **Platform**: Vercel (auto-deploys from GitHub `master` branch)
- **Repo**: `eduSpinouza/crm-task-manager`
- **Always run `npm run build` locally** before pushing to catch TypeScript errors
- Common build issue: mismatched `UserData` interfaces across components

## Environment Variables

### Required (set in Vercel dashboard + `.env.local` for dev)
| Variable | Purpose |
|----------|--------|
| `JWT_SECRET` | Secret key for signing JWT tokens (32+ random chars) |
| `USERS_CONFIG` | JSON array of `{username, passwordHash}` objects |

### Generating Password Hashes
- **Dev**: Visit `GET /api/auth/setup?password=yourpassword`
- **Manual**: `node -p "const c=require('crypto');const s=c.randomBytes(16).toString('hex');s+':'+c.scryptSync('yourpass',s,64).toString('hex')"`

### Adding New Users
1. Generate password hash
2. Add to `USERS_CONFIG`: `[{"username":"user1","passwordHash":"..."},...]`
3. Redeploy (env var change)

## Email Feature

### Architecture
- **Abstraction Layer**: `EmailProvider` interface → swap providers without changing app logic
- **Current Provider**: Gmail SMTP via Nodemailer (~500 emails/day free)
- **Rate Limiting**: 200ms delay between email sends
- **Templates**: Saved in `localStorage` (`email_templates` key) as JSON array

### Email Configuration (per user, stored in localStorage)
- `email_sender` - Gmail address
- `email_app_password` - Gmail App Password (requires 2FA enabled)
- Configured via Settings dialog → Email tab

### Email Placeholders
| Placeholder | Source | Notes |
|-------------|--------|-------|
| `{{userName}}` | User name | |
| `{{email}}` | User email | |
| `{{phone}}` | Phone number | |
| `{{appName}}` | App name | |
| `{{productName}}` | Product name | |
| `{{contractAmount}}` | totalAmount field | Displayed as "Contract Amount" |
| `{{totalAmount}}` | repayAmount field | Displayed as "Total Amount" |
| `{{overdueFee}}` | Overdue fee | |
| `{{repayTime}}` | Repay time | |
| `{{stageName}}` | Stage name | |
| `{{idNoUrl}}` | ID photo URL | Auto-wrapped in `<img>` tag |
| `{{livingNessUrl}}` | Face photo URL | Auto-wrapped in `<img>` tag |

### Email Test Mode
In `src/app/api/email/send/route.ts`, set `TEST_EMAIL_OVERRIDE` to a specific email to redirect all emails for testing. Set to `null` to disable.

### Adding a New Email Provider
1. Create class in `src/lib/email/providers/` implementing `EmailProvider`
2. Add provider case in `EmailService` constructor
3. Update `EmailServiceConfig` type

## Table Features

### Displayed Columns
User Name, Email, Phone, App Name, Product, Contract Amount, Total Amount, Overdue Fee, Overdue Days, Repay Time, Stage, Result, Note

### Hidden Fields (stored internally)
- `taskId` - Used for selection, follow-ups, and API calls
- `orderId` - Used for API calls

### Filters
- **App Name** - Dropdown populated from current data
- **Overdue Days** - Dropdown populated from current data
- Filters use `useMemo` for performance

### Pagination
- Options: 50, 100, 250 rows per page (default: 50)

## Important Notes
1. **Rate Limiting**: Follow-up submissions have 500ms delay between API calls
2. **Email Fetching**: Emails are fetched in batches of 5 with 100ms delay
3. **Email Sending**: 200ms delay between sends to avoid Gmail throttling
4. **DataGrid Compatibility**: MUI X DataGrid has React 19 compatibility issues; using standard MUI Table instead
5. **Token Format**: External API uses `Bear ` prefix (not standard `Bearer `)
6. **Newlines in Emails**: Body templates convert `\n` to `<br>` for HTML rendering
7. **Image Placeholders**: `{{idNoUrl}}` and `{{livingNessUrl}}` auto-wrap URLs in `<img>` tags
8. **Type Sync**: `UserData` interface exists in 3 places (UserListTable, EmailDialog, EmailService). Keep them compatible—EmailDialog uses optional fields to accept data from UserListTable.
9. **Always update AGENTS.md** when adding new features, discovering API constraints, or learning something relevant to development.
10. **Self-anneal when things break**: 
    - Read error message and stack trace
    - Fix the problem and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
    - Update the directive with what you learned (API limits, timing, edge cases)
11. **Update directives as you learn**: Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive.

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## Summary

> **This is your onboarding packet.** Treat this like you're joining the team as a senior engineer. Read this before making any decisions. When in doubt, always lean towards what's more delightful and simple.

## ENGINEERING PHILOSOPHY

**You are a senior engineer building a web application for a CRM system using Next.js, TypeScript, and MUI. Our core principle is SLC: Simple, Lovable, Complete.**

- **Keep it simple**: Don't get clever with architecture unless absolutely necessary
- **Stay consistent**: Follow established patterns throughout the codebase
- **Be explicit**: Code should be self-documenting and obvious
- **Think long-term**: Every decision should make future maintenance easier
- **Follow standards**: Stick to industry best practices and platform guidelines

## Recent Changes
- Implemented mock internal login with manual external token configuration
- Added email column with batch fetching from taskinfo endpoint
- Follow-up dialog with dependent Target/Result dropdowns
- Replaced DataGrid with MUI Table due to React 19 issues
- **Email sending feature**: Gmail SMTP with abstraction layer, templates, placeholder system
- **Column updates**: Removed Amount, added Contract Amount, Total Amount, Overdue Fee, Overdue Days, App Name
- **Task ID hidden**: Removed from display, still used internally
- **Filters**: App Name and Overdue Days dropdown filters
- **Pagination**: Updated to 50/100/250 rows per page
- **Settings dialog**: Now tabbed with API Token and Email configuration
- **Email placeholders**: Including auto-embedded images via `{{idNoUrl}}`
- **Newline preservation**: Email body converts `\n` to `<br>` in HTML
- **Real auth**: JWT + single-session enforcement, middleware route protection
- **Session management**: In-memory store with swappable `SessionStore` interface
- **Login page**: POST auth, httpOnly cookie, Suspense boundary, licensing warning
- **Dashboard**: Session polling every 30s, kicked-user redirect
