# CLI Implementation Log

## 2025-01-09: Browser-based Authentication Flow

### Overview
Implemented a browser-based authentication flow for the CLI tool, similar to how GitHub CLI handles authentication. This allows users to authenticate securely through their browser while maintaining a good user experience.

### Changes Made

1. **Database Schema**
   - Added `cli_token` table to store CLI authentication tokens
   - Fields include: user ID, token, device name, expiration, and last used timestamp
   - Updated schema in `lib/db/schema.ts`

2. **API Endpoint**
   - Created `/api/cli/token` endpoint for token generation
   - Implements secure token generation using `crypto.randomBytes`
   - Validates user session and request data
   - Returns token with 30-day expiration
   - Added comprehensive test suite

3. **CLI Authentication Command**
   - Created new auth command with subcommands:
     - `bragdoc auth login` - Start browser-based auth flow
     - `bragdoc auth logout` - Remove stored token
     - `bragdoc auth status` - Check authentication status
   - Added top-level aliases:
     - `bragdoc login`
     - `bragdoc logout`

4. **Authentication Flow**
   - CLI generates state parameter for CSRF protection
   - Opens browser to `/cli-auth` page
   - Starts local server to receive token
   - Saves token in config file
   - Includes device name for better token management

5. **Config Updates**
   - Updated config types to store auth token
   - Added token expiration handling
   - Added device name tracking

### Technical Details

1. **Token Storage**
   ```typescript
   // Database schema
   export const cliToken = pgTable('cli_token', {
     id: uuid('id').primaryKey().notNull().defaultRandom(),
     userId: uuid('user_id')
       .notNull()
       .references(() => user.id, { onDelete: 'cascade' }),
     token: text('token').notNull(),
     deviceName: text('device_name').notNull(),
     lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
     expiresAt: timestamp('expires_at').notNull(),
     createdAt: timestamp('created_at').notNull().defaultNow(),
   });
   ```

2. **Config Structure**
   ```typescript
   export interface BragdocConfig {
     auth?: {
       token?: string;
       expiresAt?: number;
     };
     repositories: Repository[];
   }
   ```

### Testing
- Added comprehensive test suite for `/api/cli/token` endpoint
- Tests cover:
  - Token generation for authenticated users
  - Handling of unauthenticated requests
  - Input validation
  - Token expiration
  - Database operations

### Next Steps
1. Implement token validation middleware for CLI commands
2. Add token management UI to web interface
3. Add token refresh mechanism if needed
4. Add tests for CLI authentication commands

## 2025-01-09: CLI Authentication and Logging Improvements

### Authentication Flow
- Fixed the CLI authentication flow to properly handle the token exchange
- Server now listens on all interfaces (0.0.0.0) with CORS enabled
- Set fixed port (5556) for more reliable local server connection
- Improved server startup and browser opening sequence
- Added proper state parameter validation for security
- Fixed token handling and storage in config

### Logging System
- Implemented Winston logger for structured logging
- Created hierarchical log levels:
  - debug: Internal debugging details
  - info: Progress information
  - warn: Warning messages
  - error: Error conditions
- Added file-based logging:
  - All logs go to `~/.bragdoc/logs/combined.log`
  - Errors separately logged to `~/.bragdoc/logs/error.log`
- Console output maintains user-friendly colored messages
- Log level configurable via LOG_LEVEL environment variable

### Code Organization
- Separated server startup logic from main login flow
- Improved error handling with detailed debug logs
- Added TypeScript type checking for auth configuration

### Next Steps
- [ ] Implement Git repository detection
- [ ] Add commit history extraction
- [ ] Support time-limited history based on configuration
