# Eco Ruta — 

## Project Overview

Eco_Ruta is a platform to optimize and manage the logistics of waste collection and recycling. Monorepo with:
- **`/backend`** — Node.js 20+ REST API with Express and strict TypeScript (Prisma, PostgreSQL, Zod, Socket.io, Vitest)
- **`/web`** — SPA with React 18+ and Vite (TypeScript, TanStack Query v5, Zustand, Leaflet/OSRM, Axios, Vitest)

## Architecture: Domain-Driven Modules

### Frontend (`web/src/`)

```text
features/
  <feature>/
    types/          — interfaces, type aliases, Zod schemas
    api/            — Axios requests and TanStack Query custom hooks
    components/     — components exclusive to the feature
    store/          — Zustand stores (if applicable)
    <name>-view.tsx — page-level view component
```

### Rules

1. **Types** go in `module/types.ts`, NOT inline in views or hooks
2. **Constants/data** go in `module/data.ts`, NOT inline in views
3. **Pure functions** go in `module/lib.ts`, NOT inline in views
4. **Custom hooks** go in `module/hooks.ts`, NOT inline in views
5. **Shared code** (used by 2+ modules) goes in `common/`
6. **Component Props interfaces** are the ONLY types allowed inline in component files
7. **API hook files** (`common/api/hooks/`) contain ONLY hooks — types are re-exported from module types

### Existing modules

| Module | Purpose |
|--------|---------|
| `auth` | Authentication, registration, JWT token management, and roles |
| `points` |Management and interactive map of recycling points and containers |
| `routes` | Social media OAuth connections |
| `collections` | Real-time monitoring of collection runs and statuses |
| `reports` |Citizen reports for waste accumulation |
| `statistics` | Dashboard with key analytics for administrators |
|

### Shared locations

- `common/api/types.ts` — AppUser, Role, Session

- `common/config/axios.ts` — Centralized Axios client with interceptors

- `common/lib/format.ts` — Formatters for date, weight, and capacity

- `common/lib/utils.ts` — cn helper (Tailwind class merger)

- `common/layouts/` — DashboardLayout, AuthLayout, Header, Sidebar

- `common/providers/` — QueryProvider, AuthProvider, ErrorBoundary

## Design System

### Light mode only. No dark mode.

### Color palette: Zinc grayscale (Lipi-inspired)

| Token | Value | Use |
|-------|-------|-----|
| `--foreground` | `#0a0a0a` | Body text, headings, active icons |
| `--primary` | `#000000` | Primary action buttons |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--primary-brand` | `#8db37e` / `#b8ebba` | Brand green (Logo, secondary action buttons, badges) |
| `--background` | `#ffffff` | Main background |
| `--muted` | `#f4f4f4` | Input fields, secondary cards, list containers |
| `--muted-foreground` | `#737373` | Secondary text, descriptions, placeholders |
| `--border` | `#e5e5e5` | Light borders, dividers |
| `--destructive` | `#ffb0b0` / `#ef4444` | Error states, alerts, critical cards |

### Typography

- **Font**: DM Sans (body), JetBrains Mono (code)
- **Headings**: `font-weight: 700` (bold), `letter-spacing: -0.03em`
- **Body**: `font-weight: 400`, `16px`, `line-height: 1.5`

### Components

- Use **shadcn/ui** components exclusively (via `@base-ui/react`)
- Do NOT build manual buttons, inputs, cards, dialogs
- Primary action buttons: `variant="dark"` (black bg, white text)
- Default buttons: `variant="outline"`
- Destructive buttons: `variant="destructive"`

### Spacing & Radius

- Border radius base: `8px` (`--radius-sm`)
- Cards: `rounded-lg` (16px)
- Buttons: `rounded-xl` (24px)
- Inputs: `rounded-xl`

## Code Style

- TypeScript strict mode
- Functional components only (no class components)
- React Query for server state
- `"use client"` only when hooks/interactivity needed
- No emojis in code or UI
- Terse, direct commit messages

### Early Returns (mandatory)

Always use early returns. Never nest if/else. Guard clauses first, happy path last.

**Exception**: `else` is OK inside loops for control flow (e.g., word-wrap logic) and for multi-branch value assignment where early return doesn't apply.

```tsx
// Functions
const getLabel = (age: number) => {
  if (age < 18) return "underage"
  if (age < 30) return "young"
  return "old"
}

// Components — always: error → loading → empty → data
function ListView() {
  const { data, isLoading, isError, error } = useItems()

  if (isError) {
    return <p className="text-destructive">{error.message}</p>
  }

  if (isLoading) {
    return <Loader2 className="animate-spin" />
  }

  if (!data?.length) {
    return <p className="text-muted-foreground">No items found</p>
  }

  return <div>{data.map(item => <Card key={item.id}>{item.title}</Card>)}</div>
}
```

### Error Handling (never throw outside React Query)

- **Inside React Query hooks**: `throw` is OK — React Query catches it and sets `isError`
- **Everywhere else**: wrap in `try/catch`, show toast on failure
- **Components**: always handle `isError` with early return showing the error message
- **Downloads/async handlers**: wrap in `try/catch/finally`, show toast on error

```tsx
// GOOD — try/catch in event handler
const handleDownload = async () => {
  try {
    const url = await renderFrame()
    triggerDownload(url)
  } catch {
    toast.error("Download failed")
  }
}

// BAD — throwing in event handler
const handleDownload = async () => {
  const url = await renderFrame() // unhandled rejection if it fails
  triggerDownload(url)
}
```

### Fallbacks (be explicit, not silent)

- **OK**: `frame.text ?? ""` — empty string for text input is a valid default
- **OK**: `frame.backgroundUrl ?? frame.originalUrl` — explicit fallback chain
- **BAD**: `const items = data ?? []` then mapping over it — hides that data is missing
- **Better**: early return `if (!data) return <Empty />` then use `data` directly

## Backend

- NestJS with decorators, Swagger docs
- Prisma ORM with `prisma db push` for dev
- Storage abstraction (S3/local via `STORAGE_INTERFACE`)
- Clerk authentication with `@CurrentOrg()` decorator
- Rate limiting via `@Throttle()`

## Don'ts

- Don't add dark mode
- Don't use green/colored primary — always black/white
- Don't put types in hook files
- Don't duplicate data across modules
- Don't use modals when inline UI or popovers work
- Don't over-engineer — ship the minimum needed
- Don't throw errors outside React Query hooks
- Don't use if/else — use early returns
- Don't use `?? []` to hide missing data — use early returns for empty states
- Don't nest ternaries in JSX — extract to early returns or variables