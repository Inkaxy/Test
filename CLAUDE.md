# CLAUDE.md — Loaf & Load (Pakkesystem)

## Project Overview

Loaf & Load is a Progressive Web Application (PWA) for bakery order management and packing workflows. It replaces paper-based packing systems with a digital interface featuring real-time updates, offline support, and mobile-first design. The app is built with React, TypeScript, and Supabase.

## Tech Stack

- **Framework:** React 18 + TypeScript 5.8
- **Build Tool:** Vite 5 (dev server on port 8080)
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix UI primitives)
- **State:** Zustand (auth), TanStack React Query (server state), React Hook Form + Zod (forms)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **i18n:** i18next — Norwegian (`nb`) and English (`en`)
- **PWA:** vite-plugin-pwa with service worker and offline queue
- **Native Mobile:** Capacitor 8 (iOS + Android wrapper)

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Development mode build
npm run lint         # Run ESLint
npm run test         # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
npm run preview      # Preview production build
npm run mobile:build # Build web + sync to native projects
npm run cap:sync     # Sync web assets to iOS/Android
npm run cap:android  # Open Android project in Android Studio
npm run cap:ios      # Open iOS project in Xcode
```

## Project Structure

```
src/
├── components/          # React components organized by feature
│   ├── ui/              # shadcn/ui base components (DO NOT edit manually — use shadcn CLI)
│   ├── admin/           # Super admin features
│   ├── auth/            # Authentication (ProtectedRoute, LoginForm, etc.)
│   ├── bakeries/        # Bakery management
│   ├── categories/      # Product category management
│   ├── customers/       # Customer management
│   ├── display-editor/  # Display screen editor
│   ├── display-settings/# Display configuration
│   ├── error/           # Error boundaries
│   ├── layout/          # DashboardLayout, sidebar, navigation
│   ├── packing/         # Core packing UI (~17 components)
│   └── settings/        # User settings
├── pages/               # Route-level page components
│   ├── display/         # Public display pages (SharedDisplay, CustomerDisplay)
│   └── packing/         # Packing sub-views (Calendar, Customer, Product, Kiosk)
├── hooks/               # Custom React hooks (~28 hooks)
├── stores/              # Zustand stores (authStore.ts)
├── types/               # TypeScript type definitions
├── lib/                 # Utility functions
│   ├── fileParser.ts    # Bakery file format parser (.PRD, .CUS, .OD0)
│   ├── idUtils.ts       # ID normalization utilities
│   ├── queryClient.ts   # React Query configuration
│   └── utils.ts         # General utilities (cn helper, etc.)
├── integrations/supabase/ # Supabase client and auto-generated DB types
├── i18n/                # i18next config and locale files (nb.json, en.json)
├── test/                # Test setup (vitest, jsdom)
├── App.tsx              # Root component with all routing
└── main.tsx             # Entry point
supabase/
├── config.toml          # Supabase project configuration
├── functions/           # Edge Functions (sync-onedrive, send-packing-report, etc.)
└── migrations/          # Database migrations
android/                 # Capacitor Android project (open with Android Studio)
ios/                     # Capacitor iOS project (open with Xcode)
capacitor.config.ts      # Capacitor configuration (app ID, plugins, server settings)
```

## Architecture & Patterns

### Routing (App.tsx)

Routes are organized by access level:

- **Public:** `/`, `/auth`, `/display/*`, `/kiosk/*`
- **Protected (any authenticated user):** `/dashboard`, `/packing`, `/settings`
- **Admin (`bakery_admin`):** `/products`, `/customers`, `/categories`, `/users`, `/import`, `/display-settings`
- **Super Admin (`super_admin`):** `/bakeries`, `/super-admin`

Access control uses `<ProtectedRoute>` with an optional `requireRole` prop.

### Role System

Three roles managed via Sustand store (`authStore.ts`):
- `super_admin` — system-wide administration
- `bakery_admin` — bakery-level administration
- `bakery_user` — standard packing user

### State Management

- **Zustand** (`stores/authStore.ts`): Auth state, user profile, role
- **TanStack React Query**: All server data fetching and caching
- **React Hook Form + Zod**: Form state and validation

### Component Conventions

- UI primitives live in `src/components/ui/` (shadcn/ui — generated, avoid manual edits)
- Feature components are grouped by domain in `src/components/<feature>/`
- Pages are thin wrappers that compose feature components
- Hooks encapsulate data fetching and business logic (`src/hooks/`)

### Path Alias

`@/` maps to `./src/` — use `@/components/...`, `@/hooks/...`, `@/lib/...` etc.

## Code Style & Linting

### ESLint (eslint.config.js)

- TypeScript ESLint recommended rules
- React Hooks rules enforced
- React Refresh: component-only exports (warn)
- `@typescript-eslint/no-unused-vars`: OFF (lenient)

### TypeScript (tsconfig.json)

Relaxed strictness — be aware of these settings:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`

### Styling

- Tailwind CSS with utility-first approach
- CSS variables for theming (defined in `index.css`, consumed via `hsl(var(--...))`)
- Dark mode via `class` strategy
- Custom color tokens: `bakery-*` (brand), `status-*` (pending, packing, complete, locked, deviation)
- Use `cn()` from `@/lib/utils` to merge Tailwind classes

## Testing

- **Framework:** Vitest with jsdom environment
- **Libraries:** @testing-library/react, @testing-library/jest-dom
- **Test location:** Co-located with source files as `*.test.ts` or `*.spec.ts`
- **Setup file:** `src/test/setup.ts`
- Run `npm run test` before committing changes

## Key Domain Concepts

- **Packing:** Core workflow — workers pack orders by customer or product, marking items as complete
- **Categories:** Product categories that organize the packing workflow (e.g., bread, pastries)
- **Kiosk Mode:** Public-facing packing interface (`/kiosk/packing/...`) — no auth required to view, PIN required for locking
- **Display Screens:** Public order status displays (`/display/...`) with customizable themes
- **File Import:** Proprietary bakery format parsing (`.PRD` products, `.CUS` customers, `.OD0` orders)
- **Offline Queue:** Operations queued locally when offline, synced when reconnected

## Important Conventions for AI Assistants

1. **Always use the `@/` path alias** for imports from `src/`.
2. **Do not manually edit `src/components/ui/`** — these are shadcn/ui generated components.
3. **Use existing hooks** in `src/hooks/` for data operations rather than making direct Supabase calls in components.
4. **Translations:** Any user-facing text should use `useTranslation()` from react-i18next. Add keys to both `nb.json` and `en.json`.
5. **Forms:** Use React Hook Form + Zod schemas for validation. Follow existing patterns in the codebase.
6. **Run `npm run lint` and `npm run test`** to verify changes before committing.
7. **Supabase types** are auto-generated in `src/integrations/supabase/types.ts` — do not manually edit.
8. **New features** should follow the existing pattern: page in `pages/`, components in `components/<feature>/`, hooks in `hooks/`, types in `types/`.
9. **Error handling:** Wrap route-level components with `<ErrorBoundary>`. Use toast notifications (sonner) for user feedback.
10. **PWA considerations:** Changes to caching strategies are in `vite.config.ts` under the VitePWA plugin config.

## Native Mobile App (Capacitor)

The app is wrapped as a native iOS/Android app using Capacitor 8.

### Workflow

1. Make changes to the web app as normal
2. Run `npm run mobile:build` to build and sync to native projects
3. Open in IDE: `npm run cap:android` (Android Studio) or `npm run cap:ios` (Xcode)
4. Build and run from the native IDE

### Configuration (`capacitor.config.ts`)

- **App ID:** `com.loafandload.app`
- **Web Dir:** `dist` (Vite build output)
- To point the app at a hosted URL instead of bundled assets, uncomment the `server.url` block in `capacitor.config.ts`

### Requirements

- **Android:** Android Studio + Android SDK
- **iOS:** Xcode (macOS only) + CocoaPods
