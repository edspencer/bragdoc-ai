# CI Scripts

This directory contains scripts used in GitHub Actions workflows and CI/CD processes.

## Neon Test Branch Scripts

These scripts manage ephemeral Neon database branches for CI testing.

### create-neon-test-branch.sh

Creates a schema-only Neon database branch for testing.

**What it does:**
1. Creates a new Neon branch with `init_source: schema-only` (gets schema but no data from parent)
2. Creates a read-write endpoint for the branch
3. Waits for the endpoint to become ready (max 60 seconds)
4. Outputs the branch ID and connection string

**Environment variables required:**
- `NEON_API_KEY` - Neon API key
- `NEON_PROJECT_ID` - Neon project ID
- `GITHUB_RUN_ID` (optional) - Used to generate unique branch name
- `GITHUB_RUN_ATTEMPT` (optional) - Used to generate unique branch name
- `GITHUB_OUTPUT` (optional) - If set, writes outputs for GitHub Actions

**Usage:**
```bash
# In GitHub Actions (automatically sets GITHUB_* vars)
NEON_API_KEY="..." NEON_PROJECT_ID="..." ./scripts/create-neon-test-branch.sh

# Outputs to stdout and GITHUB_OUTPUT:
# branch_id=br_abc123
# connection_string=postgresql://...
```

### delete-neon-test-branch.sh

Deletes a Neon database branch.

**Environment variables required:**
- `NEON_API_KEY` - Neon API key
- `NEON_PROJECT_ID` - Neon project ID

**Arguments:**
- `BRANCH_ID` - The branch ID to delete

**Usage:**
```bash
NEON_API_KEY="..." NEON_PROJECT_ID="..." ./scripts/delete-neon-test-branch.sh br_abc123
```

## CI Workflow

The complete CI workflow for tests uses these scripts in sequence:

1. **Create branch**: `create-neon-test-branch.sh` creates a fresh database
2. **Mark baseline**: `packages/database/scripts/mark-baseline-migrations.sh` marks existing migrations as applied
3. **Run migrations**: `pnpm db:migrate` runs any new migrations from the current Git branch
4. **Run tests**: Tests run against the fresh database
5. **Delete branch**: `delete-neon-test-branch.sh` cleans up (runs even if tests fail)

This ensures:
- Each CI run gets a clean database with the latest schema
- No test data pollution between runs
- New migrations are tested properly
- pgvector extension is available (included in Neon)
- Cost is minimal (branches are deleted after ~2-5 minutes)

## See Also

- [packages/database/scripts/README.md](../packages/database/scripts/README.md) - Database migration scripts
- [.github/workflows/test.yml](../.github/workflows/test.yml) - CI workflow that uses these scripts
