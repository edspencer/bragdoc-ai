# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- **Components:** PascalCase (e.g., `achievement.tsx`, `AchievementAction.tsx`)
- **Utilities and libraries:** camelCase (e.g., `colors.ts`, `account-deletion.ts`, `demo-intent.ts`)
- **API routes:** camelCase with `route.ts` suffix (e.g., `route.ts` in `app/api/achievements/`)
- **Server actions:** Files marked with `'use server'` at top (e.g., `lib/artifacts/actions.ts`)
- **Types/interfaces:** PascalCase with `.ts` extension (e.g., `achievement.ts`)
- **Test files:** Match source file name with `.test.ts` or `.spec.ts` suffix (e.g., `achievements.test.ts`)

**Functions:**
- **camelCase:** All function declarations, both exported and private
- **Async functions:** Named explicitly with `async` keyword, no special naming
- **Callback functions:** camelCase with descriptive names (e.g., `onDelete`, `onEdit`, `onImpactChange`)
- **Handler functions:** `handle` prefix for event handlers (e.g., `handleClick`, implied via callbacks)
- **Getter/utility functions:** Descriptive names (e.g., `getProjectColor`, `getAuthUser`, `getAchievements`)
- **Factory/creation functions:** `create` or `generate` prefix (e.g., `createAchievement`, `generateAchievementEmbedding`, `generateMissingEmbeddings`)

**Variables:**
- **Constants:** SCREAMING_SNAKE_CASE for module-level constants (e.g., `PROJECT_COLORS`, `DEMO_INTENT_COOKIE_NAME`)
- **Regular variables:** camelCase (e.g., `testAchievement`, `achievementId`, `mockEmbedding`)
- **Boolean variables:** Prefix with `is`, `has`, `can`, `should` (e.g., `isArchived`, `hasProperty`)
- **Collections:** Plural nouns (e.g., `achievements`, `projects`, `embeddings`)

**Types:**
- **Interfaces:** PascalCase (e.g., `AchievementWithRelations`, `ComponentProps`)
- **Type aliases:** PascalCase (e.g., `EventDuration`)
- **Props interfaces:** Suffix with `Props` (e.g., `ButtonProps`, `ComponentProps`)
- **Enum values:** SCREAMING_SNAKE_CASE for string enums representing constants

## Code Style

**Formatting:**
- **Tool:** Prettier (configured in `.prettierrc`)
- **Line length:** Not explicitly limited (Prettier default ~80 chars)
- **Indentation:** 2 spaces (configured via Prettier)
- **Quotes:** Single quotes (`'`) for strings (configured via `singleQuote: true`)
- **Semicolons:** Required on all statements (configured via `semi: true`)
- **Trailing commas:** ES5 style (trailing commas where valid in ES5, configured via `trailingComma: 'es5'`)
- **Line endings:** LF (configured via `endOfLine: 'lf'`)
- **Tabs:** Spaces only (configured via `useTabs: false`)

**Linting:**
- **Root config:** `eslint.config.json` extends `next/core-web-vitals` and adds import/typescript rules
- **App-specific:** `apps/web/eslint.config.mjs` uses modern flat config with TypeScript, React, and React Hooks plugins
- **Key rules:**
  - `import/no-named-as-default`: off
  - `@typescript-eslint/no-non-null-assertion`: off
  - `react/no-unescaped-entities`: off
  - `react/react-in-jsx-scope`: off (not needed in Next.js 16)
- **Ignored patterns:** `**/components/ui/**` (shadcn/ui), `**/ai-docs/**`

## Import Organization

**Order:**
1. **External libraries:** React, Next.js, third-party packages (e.g., `from 'next/server'`, `from 'zod/v3'`, `from 'uuid'`)
2. **Internal database:** `@/database/*` imports (e.g., `from '@/database/queries'`, `from '@/database/schema'`)
3. **Internal packages:** `@bragdoc/*` imports (e.g., `from '@bragdoc/database'`)
4. **Library utilities:** `lib/*` imports (e.g., `from 'lib/getAuthUser'`, `from '@/lib/*'`)
5. **Components:** `components/*` imports (e.g., `from '@/components/ui/button'`)
6. **Types:** Type imports using `type` keyword (e.g., `import type { EventDuration } from 'lib/types/achievement'`)

**Path Aliases:**
- `@/` → project root (maps to `src/` or current directory based on tsconfig)
- `@bragdoc/` → workspace packages (e.g., `@bragdoc/database`, `@bragdoc/config`)
- `lib/` → `lib/` directory (relative, used interchangeably with `@/lib/`)
- `components/` → `components/` directory (relative)
- `app/` → `app/` directory (relative in Next.js App Router)

**Example from codebase:**
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getAchievements } from '@/database/queries';
import { createAchievement } from '@/database/achievements/utils';
import { getAuthUser } from 'lib/getAuthUser';
import { db } from '@/database/index';
import { project } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import type { EventDuration } from 'lib/types/achievement';
```

## Error Handling

**Patterns:**
- **Server routes (API):** Throw errors (will be caught by try-catch), return `NextResponse.json()` with error status codes
- **Client code:** Return error states in response objects, never throw to browser
- **External API calls:** Wrap in try-catch, log errors with context using `console.error()`
- **Validation errors:** Return 400 status with error details object containing validation issues from Zod
- **Authentication errors:** Return 401 status with `{ error: 'Unauthorized' }` response
- **Not found errors:** Return 404 status with appropriate error message
- **Server errors:** Return 500 status with generic error message (don't expose internals)

**Example pattern from codebase:**
```typescript
try {
  const auth = await getAuthUser(req);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = achievementSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid achievement data', details: result.error.errors },
      { status: 400 }
    );
  }

  // Process...
} catch (error) {
  console.error('Error fetching achievements:', error);
  return NextResponse.json(
    { error: 'Failed to fetch achievements' },
    { status: 500 }
  );
}
```

## Logging

**Framework:** `console` methods (no winston/pino wrapper in use)

**Patterns:**
- **Errors:** Use `console.error()` with context (e.g., `console.error('Error fetching achievements:', error)`)
- **Info:** Use `console.log()` for informational messages (e.g., duplicate detection logging at utility level)
- **When to log:**
  - Error conditions (always with context)
  - Important state changes (e.g., duplicate achievement detection)
  - External API interactions (success/failure)
- **No logging:** Regular function calls, internal state changes, component renders

## Comments

**When to Comment:**
- **Complex logic:** Explain why, not what (e.g., "Strip embedding vectors from response - they're only used server-side for ML clustering")
- **Non-obvious decisions:** Explain constraints or trade-offs
- **Docstring blocks:** Use JSDoc/TSDoc format for functions with parameters and return types

**JSDoc/TSDoc:**
- **Server-side utilities:** Include JSDoc blocks with @param, @returns descriptions
- **Components:** Props interfaces documented with TSDoc comments above
- **Example from codebase:**
```typescript
/**
 * Account Deletion and Data Cleanup
 *
 * Handles deletion of all data associated with a user account on account deletion.
 * Preserves the user record for analytics tracking while anonymizing PII.
 */

/**
 * Deletes all data associated with a user account while preserving the user record
 *
 * This function:
 * 1. Verifies the user exists
 * 2. Deletes all related data in proper order to respect foreign key constraints
 * ...
 */
```

## Function Design

**Size:** Prefer small, focused functions (~20-30 lines typical)

**Parameters:**
- **Explicit parameters:** For simple functions, use positional parameters
- **Objects for multiple params:** Use parameter objects for functions with 3+ parameters (e.g., `{ userId, companyId, projectId, source, ... }`)
- **Type annotations:** Always include explicit type annotations on parameters

**Return Values:**
- **Explicit types:** Always annotate return types on exported functions
- **Consistency:** Functions that query/fetch return objects with standard shape (e.g., `{ achievements, total, pagination }`)
- **Error responses:** API routes return `NextResponse` with status codes, functions throw or return null/undefined

**Example from codebase:**
```typescript
export async function GET(req: NextRequest) {
  // Parameters extracted from request
  // Single responsibility: fetch and return
  // Explicit return type: NextResponse
}

export function getNextProjectColor(existingProjectCount: number): {
  hex: string;
  index: number;
  name: string;
} {
  // Object return type for multiple related values
}
```

## Module Design

**Exports:**
- **Named exports:** Preferred for all functions and types (enables better tree-shaking and clarity)
- **Default exports:** Not used (violates consistency)
- **Re-exports:** Use barrel files (`index.ts`) to organize exports by feature

**Barrel Files:**
- **Used in:** `lib/tours/index.ts` and similar feature directories
- **Purpose:** Consolidate related exports for cleaner imports
- **Pattern:** Export all named exports from submodules

**Separation of concerns:**
- **Actions:** `*-actions.ts` for server actions (marked with `'use server'`)
- **Queries:** `*-queries.ts` for database queries
- **Utils:** `*-utils.ts` or `*-utilities.ts` for utility functions
- **Components:** React components in `.tsx` files
- **Hooks:** Custom hooks in `hooks/` directory
- **Types:** Type definitions in `lib/types/` directory

## React Component Patterns

**Functional components only (no class components)**

**Component exports:**
```typescript
export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // ...
}

// Not: export default ComponentName
```

**Props interface:**
```typescript
interface ComponentProps {
  label: string;
  onClick: () => void;
  optional?: string;
}
```

**Memoization:** Used selectively with `React.memo()` and deep equality functions (e.g., `fast-deep-equal`)

**Example from codebase:**
```typescript
export const AchievementAction = memo(
  function AchievementAction({ action }: { action: any }) {
    const { achievements } = action;
    return (
      <div className="flex gap-4 flex-wrap">
        {achievements?.map((achievement) => (
          <AchievementCreated key={achievement.title} achievement={achievement} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return equal(prevProps.action, nextProps.action);
  },
);
```

## Type Safety

**Strict TypeScript mode:** All code uses strict TypeScript with `strict: true` in `tsconfig.json`

**Type patterns:**
- **Explicit return types:** Required on all exported functions
- **No `any` in function signatures:** Use `unknown` when necessary, never `any` for function parameters
- **Type imports:** Use `import type { ... }` for type-only imports
- **Type predicates:** Use type guards for runtime type checking
- **Const assertions:** Used for readonly constants (e.g., `as const` on color arrays)

---

*Convention analysis: 2026-02-06*
