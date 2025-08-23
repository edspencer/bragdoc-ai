# BragDoc Turborepo Migration - Detailed Implementation Plan

This document provides detailed, actionable tasks for **Phase 1** and **Phase 2** of the Turborepo migration outlined in `TURBOREPO.md`.

## Phase 1: Setup Turborepo Infrastructure

### Task 1.1: Install and Configure Turborepo

#### 1.1.1 Install Dependencies
```bash
# Install turbo as dev dependency
pnpm add -D turbo
```

#### 1.1.2 Create turbo.json Configuration
Create `turbo.json` in project root:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "lint:fix": {
      "dependsOn": ["^lint:fix"]
    },
    "format": {
      "dependsOn": ["^format"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts", "test/**/*.tsx"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### 1.1.3 Update Root package.json
Update scripts in root `package.json`:
```json
{
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=web",
    "dev:marketing": "turbo dev --filter=marketing",
    "dev:cli": "turbo dev --filter=cli",
    "lint": "turbo lint",
    "lint:fix": "turbo lint:fix",
    "format": "turbo format",
    "test": "turbo test",
    "test:watch": "turbo test:watch",
    "test:cli": "turbo test --filter=cli",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:push": "turbo db:push",
    "db:studio": "turbo db:studio"
  },
  "workspaces": ["apps/*", "packages/*"]
}
```

#### 1.1.4 Add Workspace Configuration
Ensure `package.json` includes workspace configuration:
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

### Task 1.2: Create Directory Structure

#### 1.2.1 Create Apps and Packages Directories
```bash
mkdir -p apps packages
```

#### 1.2.2 Move CLI to Packages
```bash
mv cli packages/cli
```

## Phase 2: Extract Shared Packages

### Task 2.1: Create packages/ui Package

#### 2.1.1 Initialize packages/ui
```bash
mkdir -p packages/ui/src
cd packages/ui
```

#### 2.1.2 Create packages/ui/package.json
```json
{
  "name": "@bragdoc/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "biome format --write src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-navigation-menu": "^1.2.2",
    "@radix-ui/react-popover": "^1.1.4",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.3",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@radix-ui/react-visually-hidden": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.446.0",
    "react-day-picker": "8.10.1",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "react": ">=19",
    "react-dom": ">=19",
    "typescript": "^5.6.3"
  },
  "peerDependencies": {
    "react": ">=19",
    "react-dom": ">=19"
  }
}
```

#### 2.1.3 Move UI Components
```bash
# From project root
cp -r components/ui/* packages/ui/src/
```

#### 2.1.4 Create packages/ui/src/index.ts
```typescript
// Export all UI components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants, type ButtonProps } from './button';
export { Calendar } from './calendar';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from './carousel';
export { DatePicker } from './date-picker';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './dialog';
export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger } from './drawer';
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu';
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form';
export { ImpactRating } from './impact-rating';
export { Input, type InputProps } from './input';
export { Label } from './label';
export { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuViewport, navigationMenuTriggerStyle } from './navigation-menu';
export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './pagination';
export { Popover, PopoverContent, PopoverTrigger } from './popover';
export { ScrollArea, ScrollBar } from './scroll-area';
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from './select';
export { Separator } from './separator';
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './sheet';
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarInput, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from './sidebar';
export { Skeleton } from './skeleton';
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Textarea } from './textarea';
export { toast, Toaster } from './toast';
export { useToast } from './toaster';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
```

#### 2.1.5 Create packages/ui/tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Task 2.2: Create packages/database Package

#### 2.2.1 Initialize packages/database
```bash
mkdir -p packages/database/src
cd packages/database
```

#### 2.2.2 Create packages/database/package.json
```json
{
  "name": "@bragdoc/database",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:check": "drizzle-kit check",
    "db:up": "drizzle-kit up",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "biome format --write src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@vercel/postgres": "^0.10.0",
    "drizzle-orm": "^0.34.1",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.25.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```

#### 2.2.3 Move Database Files
```bash
# From project root
cp -r lib/db/* packages/database/src/
cp drizzle.config.ts packages/database/
cp drizzle.config.test.ts packages/database/
```

#### 2.2.4 Create packages/database/src/index.ts
```typescript
// Export all database functionality
export * from './schema';
export * from './queries';
export * from './types';
export { db } from './index';

// Export specific utilities
export * from './achievements/utils';
export * from './projects/queries';
export * from './projects/fuzzyFind';
export * from './models/index';
export * from './models/user';
```

#### 2.2.5 Update Database Imports
Update database files to use relative imports instead of `@/lib/db/*`:
```typescript
// Before: import { db } from '@/lib/db';
// After: import { db } from './index';
```

#### 2.2.6 Create packages/database/tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "*.ts"],
  "exclude": ["node_modules"]
}
```

### Task 2.3: Create packages/auth Package

#### 2.3.1 Initialize packages/auth
```bash
mkdir -p packages/auth/src
cd packages/auth
```

#### 2.3.2 Create packages/auth/package.json
```json
{
  "name": "@bragdoc/auth",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "biome format --write src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@auth/core": "^0.37.4",
    "@auth/drizzle-adapter": "^1.7.4",
    "bcrypt-ts": "^5.0.2",
    "next-auth": "5.0.0-beta.25"
  },
  "devDependencies": {
    "@types/node": "^22.8.6",
    "typescript": "^5.6.3"
  },
  "peerDependencies": {
    "@bragdoc/database": "workspace:*",
    "next": "^15.1.6"
  }
}
```

#### 2.3.3 Move Auth Configuration Files
```bash
# From project root
cp app/\(auth\)/auth.config.ts packages/auth/src/
cp app/\(auth\)/auth.ts packages/auth/src/
cp app/\(auth\)/actions.ts packages/auth/src/
cp auth.ts packages/auth/src/root-auth.ts
```

#### 2.3.4 Create Payment Gating Utilities
Create `packages/auth/src/payment-gating.ts`:
```typescript
import type { UserLevel } from '@bragdoc/database';

export const isPaymentRequired = (): boolean => {
  return process.env.PAYMENT_TOKEN_REQUIRED === 'true';
};

export type FeatureGate = 
  | 'unlimited_usage'
  | 'git_integration'
  | 'multiple_repos'
  | 'document_publishing'
  | 'scheduled_updates'
  | 'advanced_publishing';

export const featureGates: Record<FeatureGate, UserLevel[]> = {
  unlimited_usage: ['basic', 'pro'],
  git_integration: ['basic', 'pro'],
  document_publishing: ['basic', 'pro'],
  multiple_repos: ['pro'],
  scheduled_updates: ['pro'],
  advanced_publishing: ['pro'],
};

export const requiresPayment = (userLevel: UserLevel, feature: FeatureGate): boolean => {
  if (!isPaymentRequired()) return false;
  
  return !featureGates[feature]?.includes(userLevel);
};

export const getUserFeatures = (userLevel: UserLevel): FeatureGate[] => {
  if (!isPaymentRequired()) {
    return Object.keys(featureGates) as FeatureGate[];
  }
  
  return Object.entries(featureGates)
    .filter(([_, levels]) => levels.includes(userLevel))
    .map(([feature]) => feature as FeatureGate);
};
```

#### 2.3.5 Create packages/auth/src/index.ts
```typescript
// Export auth configuration and utilities
export * from './auth';
export * from './auth.config';
export * from './actions';
export * from './payment-gating';

// Re-export for convenience
export { auth as rootAuth } from './root-auth';
```

#### 2.3.6 Create packages/auth/tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Task 2.4: Create packages/email Package

#### 2.4.1 Initialize packages/email
```bash
mkdir -p packages/email/src
cd packages/email
```

#### 2.4.2 Create packages/email/package.json
```json
{
  "name": "@bragdoc/email",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "biome format --write src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@react-email/components": "^0.0.31",
    "@react-email/render": "^1.0.3",
    "mailgun.js": "^10.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.8.6",
    "@types/react": "^19",
    "react": ">=19",
    "typescript": "^5.6.3"
  },
  "peerDependencies": {
    "@bragdoc/database": "workspace:*",
    "react": ">=19"
  }
}
```

#### 2.4.3 Move Email Files
```bash
# From project root
cp -r lib/email/* packages/email/src/
```

#### 2.4.4 Create packages/email/src/index.ts
```typescript
// Export all email functionality
export * from './sendEmail';
export * from './process';
export * from './unsubscribe';
export * from './types';

// Export email templates
export * from './templates/WelcomeEmail';
```

#### 2.4.5 Create packages/email/tsconfig.json
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Task 2.5: Create packages/config Package

#### 2.5.1 Initialize packages/config
```bash
mkdir -p packages/config/src
cd packages/config
```

#### 2.5.2 Create packages/config/package.json
```json
{
  "name": "@bragdoc/config",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "files": [
    "src",
    "eslint",
    "tailwind"
  ],
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "biome format --write src/",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@eslint/js": "^9.17.0",
    "@shadcn/ui": "^0.0.4",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^22.8.6",
    "eslint": "^8.57.1",
    "eslint-config-next": "14.2.5",
    "eslint-config-prettier": "^9.1.0",
    "eslint-import-resolver-typescript": "^3.6.3",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-prettier": "^5.2.1",
    "eslint-plugin-tailwindcss": "^3.17.5",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.18.2"
  }
}
```

#### 2.5.3 Create Shared Configurations

**Create packages/config/tailwind/index.js:**
```javascript
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontFamily: {
      sans: ['geist', ...fontFamily.sans],
      mono: ['geist-mono', ...fontFamily.mono],
    },
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
```

**Create packages/config/eslint/index.js:**
```javascript
const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "@eslint/js/recommended",
    "@typescript-eslint/recommended",
    "prettier",
    "turbo",
  ],
  plugins: ["@typescript-eslint", "import"],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
};
```

**Create packages/config/typescript/base.json:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

#### 2.5.4 Create packages/config/src/index.ts
```typescript
// Export configuration utilities
export const FEATURES = {
  paymentRequired: process.env.PAYMENT_TOKEN_REQUIRED === 'true',
  stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
  githubEnabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  googleEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
} as const;

export type FeatureFlags = typeof FEATURES;
```

#### 2.5.5 Create packages/config/tsconfig.json
```json
{
  "extends": "./typescript/base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

### Task 2.6: Update CLI Package

#### 2.6.1 Update packages/cli/package.json
Update the CLI's package.json to use workspace dependencies:
```json
{
  "dependencies": {
    "@bragdoc/auth": "workspace:*",
    // ... existing dependencies
  }
}
```

#### 2.6.2 Update CLI Imports
Update CLI source files to import from new packages where needed:
```typescript
// Update auth-related imports
import { isPaymentRequired } from '@bragdoc/auth';
```

## Verification and Testing

### Task 2.7: Install and Link Packages
```bash
# From project root
pnpm install
```

### Task 2.8: Build All Packages
```bash
turbo build --filter=@bragdoc/ui
turbo build --filter=@bragdoc/database  
turbo build --filter=@bragdoc/auth
turbo build --filter=@bragdoc/email
turbo build --filter=@bragdoc/config
turbo build --filter=@bragdoc/cli
```

### Task 2.9: Update Root Dependencies
Update the root `package.json` to remove dependencies that are now in packages:
```json
{
  "dependencies": {
    // Remove UI-related dependencies - they're now in @bragdoc/ui
    // Remove database-related dependencies - they're now in @bragdoc/database
    // Keep app-specific dependencies
  }
}
```

## Success Criteria

After completing Phase 1 and 2:

- [ ] Turborepo is configured and running
- [ ] All packages build successfully
- [ ] `packages/ui` exports all UI components
- [ ] `packages/database` provides all database functionality
- [ ] `packages/auth` includes authentication and payment gating
- [ ] `packages/email` handles email functionality
- [ ] `packages/config` provides shared configurations
- [ ] `packages/cli` is updated to use workspace dependencies
- [ ] `turbo dev`, `turbo build`, `turbo lint`, and `turbo test` all work
- [ ] No breaking changes to existing functionality

## Troubleshooting

### Common Issues

1. **Import Resolution Issues**
   - Ensure `tsconfig.json` paths are updated correctly
   - Check that package.json `main` and `types` fields point to correct files
   - Verify peerDependencies are installed in consuming packages

2. **Build Failures**
   - Check that all dependencies are properly declared in package.json
   - Ensure TypeScript configurations extend correctly
   - Verify that turbo.json task dependencies are correct

3. **Workspace Issues**
   - Run `pnpm install` from the root after adding workspace dependencies
   - Check that workspace protocol (`workspace:*`) is used for internal packages
   - Ensure package names match exactly in dependencies

### Commands for Debugging

```bash
# Check workspace dependencies
pnpm list --depth=0

# Build specific package with verbose output
turbo build --filter=@bragdoc/ui --verbose

# Check TypeScript compilation without emit
pnpm tsc --noEmit

# Lint specific package
turbo lint --filter=@bragdoc/database
```

## Next Steps

Once Phase 1 and 2 are complete, proceed to Phase 3 (Application Splitting) as outlined in `TURBOREPO.md`.