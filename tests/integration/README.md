# CLI Integration Tests

This directory contains integration tests for the BragDoc CLI's extraction functionality.

## Overview

The integration tests verify that:
- All extraction detail levels (minimal, standard, detailed, comprehensive) work correctly
- Each detail level produces the expected output format
- Output is consistent across runs (deterministic)
- Extraction properly filters/prioritizes files based on configuration

## Components

### Test Scripts

- `cli-extraction.sh`: Main integration test script
- `normalize-output.sh`: Output normalization for snapshot comparison
- `../scripts/create-test-repo.sh`: Deterministic test repository generator

### Test Workflow

1. **Create test repo**: Generates a deterministic git repository with various commit types
2. **Build CLI**: Ensures latest code is tested
3. **Initialize project**: Sets up BragDoc in non-interactive mode
4. **Run extractions**: Executes extraction with all 4 detail levels
5. **Normalize output**: Removes timestamps/hashes for consistent comparison
6. **Compare snapshots**: Verifies output matches expected baseline
7. **Verify differences**: Ensures detail levels differ as expected

## Running Tests

### Important: Config Safety

The test script will **refuse to run** if it finds an existing `~/.bragdoc/config.yml` file, to protect your personal configuration. This is intentional - the tests are designed to run in CI (where no config exists) or locally after moving your config aside.

If you need to run tests locally:

```bash
# Move your config aside
mv ~/.bragdoc/config.yml ~/.bragdoc/config.yml.bak

# Run the tests
./tests/integration/cli-extraction.sh

# Restore your config
mv ~/.bragdoc/config.yml.bak ~/.bragdoc/config.yml
```

### Standard Test Run

```bash
./cli-extraction.sh
```

This compares current output against stored snapshots.

### Updating Snapshots

When extraction output changes intentionally:

```bash
UPDATE_SNAPSHOTS=1 ./cli-extraction.sh
```

**Important**: Always review snapshot changes before committing to ensure they're correct!

## Test Repository Structure

The test repository contains these commit types:

1. **Small commits**: 1-2 files, <50 lines (tests basic extraction)
2. **Medium commits**: 5-10 files, 100-500 lines (tests typical commits)
3. **Large commits**: 20+ files, 1000+ lines (tests truncation)
4. **Edge cases**: Lock files, dist files (tests filtering)
5. **Source changes**: src/** files (tests prioritization)

## Detail Level Verification

Tests verify these behaviors:

### Minimal
- ✓ Includes commit messages
- ✓ NO file statistics
- ✓ NO code diffs

### Standard
- ✓ Includes commit messages
- ✓ Includes file statistics
- ✓ NO code diffs

### Detailed
- ✓ Includes commit messages
- ✓ Includes file statistics
- ✓ Includes code diffs (limited: 1000 lines/commit, 200 lines/file, 30 files)
- ✓ Filters lock files and dist files
- ✓ Prioritizes src/** files

### Comprehensive
- ✓ Includes commit messages
- ✓ Includes file statistics
- ✓ Includes code diffs (extensive: 2000 lines/commit, 500 lines/file, 50 files)
- ✓ Filters lock files and dist files
- ✓ Prioritizes src/** files

## CI Integration

Tests run automatically in GitHub Actions on every push. See `.github/workflows/test.yml`.

## Troubleshooting

### Test Failures

If tests fail unexpectedly:

1. Check if extraction output format changed intentionally
2. Review the diff shown in test output
3. If changes are correct, update snapshots: `UPDATE_SNAPSHOTS=1 ./cli-extraction.sh`
4. If changes are incorrect, fix the code

### Determinism Issues

If the test repo generates different commits each time:

1. Check that `create-test-repo.sh` uses `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`
2. Verify git config is set correctly (`user.name`, `user.email`, `commit.gpgsign`)
3. Ensure no random/time-based content in commit files

### Platform Differences

Tests should be platform-agnostic, but if issues arise:

1. Check line ending differences (LF vs CRLF)
2. Verify bash script compatibility
3. Consider platform-specific snapshots if necessary

### Running Individual Tests

To test a specific detail level:

```bash
# Run the full test script, then check specific output
./cli-extraction.sh

# Or manually test a single level
cd /tmp/bragdoc-test-repo-$$
node ../../packages/cli/dist/index.js extract --dry-run --detail-level minimal
```

### Debugging Output Differences

To see what's different between current output and snapshots:

```bash
# Run tests (they'll show diffs)
./cli-extraction.sh

# Or manually compare
./cli-extraction.sh  # Let it fail
diff -u ../snapshots/extraction-minimal.txt /tmp/bragdoc-test-output-*/output-minimal-normalized.txt
```

## Snapshot Files

Snapshots are stored in `../snapshots/`:

- `extraction-minimal.txt` - Expected output for minimal detail level
- `extraction-standard.txt` - Expected output for standard detail level
- `extraction-detailed.txt` - Expected output for detailed detail level
- `extraction-comprehensive.txt` - Expected output for comprehensive detail level

### Snapshot Format

Snapshots contain normalized output with:
- Commit hashes replaced with "HASH"
- Dates replaced with "DATE"
- Timestamps replaced with "TIME"
- Absolute paths replaced with "REPO"

This ensures consistent comparison across different environments and runs.

## Adding New Tests

To add new integration tests:

1. **Modify test repository**: Update `create-test-repo.sh` to add new commit types
2. **Update test script**: Add new verification checks to `cli-extraction.sh`
3. **Generate new snapshots**: Run `UPDATE_SNAPSHOTS=1 ./cli-extraction.sh`
4. **Verify manually**: Review snapshot content to ensure correctness
5. **Commit changes**: Include both script updates and new/updated snapshots

### Example: Testing a New Feature

```bash
# 1. Update create-test-repo.sh to add commits that exercise the feature
vim ../../scripts/create-test-repo.sh

# 2. Update cli-extraction.sh to verify the feature behavior
vim cli-extraction.sh

# 3. Generate snapshots with the new behavior
UPDATE_SNAPSHOTS=1 ./cli-extraction.sh

# 4. Review the changes
git diff ../snapshots/

# 5. Run tests to ensure they pass
./cli-extraction.sh

# 6. Commit everything
git add ../../scripts/create-test-repo.sh cli-extraction.sh ../snapshots/
git commit -m "feat: add integration test for new feature"
```

## Performance

Integration tests typically complete in:
- **Local development**: 30-60 seconds
- **CI environment**: 60-120 seconds

Most time is spent:
1. Building the CLI (15-30s)
2. Creating test repository (5-10s)
3. Running extractions (10-30s)
4. Comparing snapshots (1-5s)

If tests become slow:
- Check if CLI build is using cache
- Verify test repository isn't growing too large
- Consider parallelizing extractions (currently sequential)

## Best Practices

1. **Always review snapshot changes**: Never blindly commit snapshot updates
2. **Test locally first**: Run tests before pushing to avoid CI failures
3. **Keep test repo small**: Only add commits that test specific behaviors
4. **Document changes**: Update this README when adding new test cases
5. **Use meaningful commit messages**: Test repo commits should be descriptive
6. **Verify determinism**: If adding commits to test repo, verify they're deterministic

## Related Documentation

- [CLI README](../../packages/cli/README.md) - CLI usage and features
- [PLAN.md](../../tasks/cli-integration-tests/PLAN.md) - Implementation plan
- [SPEC.md](../../tasks/cli-integration-tests/SPEC.md) - Original specification
