# AGENTS.md - Coding Guidelines for Repository 21

## Build/Lint/Test Commands

```bash
# Development
npm run dev                 # Start Next.js dev server (Turbopack enabled)

# Build
npm run build              # Production build (outputs to 'out/')
npm run start              # Start production server

# Linting
npm run lint               # Run ESLint with Next.js config
npm run lint -- --fix      # Auto-fix ESLint issues

# Testing
npx playwright test        # Run all Playwright tests
npx playwright test --ui   # Run tests with UI
npx playwright test tests/journal-modal.spec.ts  # Run single test file

# Mobile (Capacitor)
npm run cap:sync           # Sync version & run cap sync
npm run cap:build          # Build for mobile platforms
```

## Project Overview

Next.js 16.1.5 + React 19.2.3 + TypeScript PWA with Capacitor mobile support.
Primary locale: Russian (ru). Theme: Dark/light with system preference.

**Key Domain Concept**: Discipline-oriented weekly streak system (see `spec.md`):
- Streaks counted by weeks, not days
- Week successful = 5+ days completed
- Flame levels: 1 (1+ wks), 2 (4+ wks), 3 (8+ wks), 4 (12+ wks), 5 (24+ wks)

## Code Style Guidelines

### Imports
- Use `@/` path alias for project imports (configured in tsconfig.json)
- Group imports: React/Next → third-party → `@/` internal → relative
- Use `type` keyword for type imports: `import type { Habit } from "@/lib/types"`
- Order third-party imports alphabetically

### Component Structure
- All components are client components: `"use client"` at top
- Use functional components with arrow functions for simple cases
- Named function declarations for complex components
- Props interface named `{ComponentName}Props`
- Export components as named exports (not default)

### TypeScript
- Strict mode enabled (ES2017 target, bundler moduleResolution)
- Use explicit return types for complex functions
- Prefer `interface` over `type` for object shapes
- Use union types for enums: `type Screen = "home" | "progress" | "practice"`
- Nullable fields use `?:` optional syntax

### Naming Conventions
- Components: PascalCase (e.g., `HabitCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Hooks: camelCase starting with `use` (e.g., `useAppStore.ts`)
- Types/Interfaces: PascalCase (e.g., `Habit`, `UserSettings`)
- CSS classes: Tailwind utility classes only

### Styling (Tailwind v4 + shadcn/ui)
- **Always use shadcn/ui components first**: Button, Card, Dialog, Input, etc.
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Spacing: Use Tailwind scale (`p-3/4/5/6`, `gap-2/3/4/6`)
- Typography: Headings `text-[18px] font-semibold`, body `text-sm`, captions `text-xs text-muted-foreground`
- Colors: Use CSS variables (`bg-primary`, `text-foreground`)
- NO custom CSS except in `globals.css`

### State Management (Zustand)
- Store files in `src/store/`
- Use `create()` from zustand
- Persist state via custom storage service at `src/services/storage`
- Batch state updates to minimize re-renders

### Error Handling
- Use early returns for guard clauses
- Log errors to console with context: `console.error("[ComponentName] Error:", error)`
- Use optional chaining: `habit?.name`
- Provide fallback UI for async operations (loading states)

### Performance
- Use `memo()` for expensive components
- Use `useMemo()` for expensive calculations
- Use `useCallback()` for event handlers passed to children
- Virtualize long lists when applicable
- Lazy load heavy components with `dynamic()` from next

### Accessibility
- Always include `aria-label` on icon-only buttons
- Use semantic HTML elements
- Support reduced motion: `motion-safe:` prefix for animations
- Test keyboard navigation

## File Organization

```
src/
  app/              # Next.js app router pages
  components/
    ui/             # shadcn/ui components (button, card, dialog, etc.)
    screens/        # Main screen components (HomeScreen, PracticeScreen, etc.)
    [feature]/      # Feature-specific folders (habit/, practice/, etc.)
  lib/              # Core utilities, types, i18n
  hooks/            # Custom React hooks
  store/            # Zustand stores
  services/         # External services (storage, etc.)
  utils/            # Helper functions
  data/             # Seed data, constants
  types/            # Additional type definitions
```

## Testing

- Tests located in `tests/` directory
- Use Playwright for E2E tests
- Add `data-testid` attributes for test selectors
- Tests should be independent and clean up after themselves

## Design System Compliance

See `docs/design-system.md` for full guidelines.

Key rules:
- **NO** custom `app-card`, `modal-*`, or `form-*` components
- All modals use `Dialog` from shadcn/ui
- All buttons use `Button` component
- Dialog max-width: `max-w-[520px]` or `max-w-[560px]`
- Button variants: `default` (primary), `outline` (secondary), `ghost` (tertiary)

## Environment

- Node.js 20+
- Uses React Compiler (experimental)
- Turbopack for development
- Static export for deployment (`out/` directory)
- PWA with offline support via next-pwa
- Capacitor for iOS/Android builds

## Git

- Do NOT commit: `node_modules/`, `.next/`, `out/`, `android/`, `.env*` files
- The project already has `.gitignore` configured
