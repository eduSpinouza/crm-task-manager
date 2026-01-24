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
│   │   └── users/
│   │       ├── list/           # Proxy: fetch user list
│   │       ├── taskinfo/       # Proxy: fetch task details (email, etc.)
│   │       └── followup/       # Proxy: submit follow-up actions
│   ├── dashboard/              # Main protected dashboard page
│   ├── login/                  # Login page
│   └── layout.tsx              # Root layout with ThemeRegistry
├── components/
│   ├── ThemeRegistry/          # MUI theme provider setup
│   ├── UserListTable.tsx       # Main data table component
│   ├── FollowUpDialog.tsx      # Dialog for submitting follow-ups
│   └── TokenSettings.tsx       # Dialog for configuring API token
└── theme.ts                    # MUI theme configuration
```

## Authentication Flow
1. **Internal Login**: Mock authentication at `/login` (accepts any credentials)
2. **External API Token**: User manually configures the external CRM Bearer token via TokenSettings dialog
3. **Token Storage**: 
   - `localStorage.token` - Internal session token
   - `localStorage.external_api_token` - External CRM API token

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
    taskId: number;
    orderId: number;
    userName: string;
    phone: string;
    productName: string;
    principal: number;
    repayTime: string;
    stageName: string;
    followResult: number;
    note: string;
    // From taskinfo endpoint:
    email?: string;
    idNoUrl?: string;      // Hidden - ID image URL
    livingNessUrl?: string; // Hidden - Face image URL
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
```

## Important Notes
1. **Rate Limiting**: Follow-up submissions have 500ms delay between API calls
2. **Email Fetching**: Emails are fetched in batches of 5 with 100ms delay
3. **DataGrid Compatibility**: MUI X DataGrid has React 19 compatibility issues; using standard MUI Table instead
4. **Token Format**: External API uses `Bear ` prefix (not standard `Bearer `)
5. **Self-anneal when things break**: 
    - Read error message and stack trace
    - Fix the problem and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
    - Update the directive with what you learned (API limits, timing, edge cases)
    - Example: you hit an API rate limit → you then look into API → find a batch endpoint that would fix → rewrite script to accommodate → test → update directive.
6. **Update directives as you learn**: Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

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
