# bragdoc CLI

The bragdoc CLI helps you track and document your achievements by extracting information from your Git repositories. It seamlessly integrates with bragdoc.ai to maintain your professional brag document.

## Installation

```bash
npm install -g @bragdoc/cli
```

## Quick Start

1. Authenticate with bragdoc:

```bash
bragdoc login
```

2. Add your repository:

```bash
bragdoc repos add /path/to/repo --name "My Project"
```

3. Extract achievements from commits:

```bash
bragdoc extract
```

## Commands

### Authentication (`auth`)

Manage your bragdoc authentication.

```bash
# Login to bragdoc
bragdoc auth login # aliased as `login`

# Check authentication status
bragdoc auth status

# Logout from bragdoc
bragdoc auth logout # aliased as `logout`
```

### Repository Management (`repos`)

Manage repositories that bragdoc will track.

```bash
# List configured repositories
bragdoc repos list

# Add a repository (current directory if path not specified)
bragdoc repos add [path] --name "Project Name" --max-commits 100

# Update repository settings
bragdoc repos update [path] --name "New Name" --max-commits 200

# Remove a repository
bragdoc repos remove [path]

# Enable/disable repository tracking
bragdoc repos enable [path]
bragdoc repos disable [path]
```

### Achievement Extraction (`extract`)

Extract achievements from Git commits.

```bash
# Extract from current repository
bragdoc extract

# Extract from specific branch
bragdoc extract --branch main

# Limit number of commits
bragdoc extract --max-commits 50

# Dry run to preview what would be extracted
bragdoc extract --dry-run
```

### Cache Management (`cache`)

Manage the local commit cache to optimize performance.

```bash
# List cached commits
bragdoc cache list
bragdoc cache list --stats

# Clear cache
bragdoc cache clear              # Clear current repo's cache
bragdoc cache clear --all        # Clear all cached data
bragdoc cache clear --repo name  # Clear specific repo's cache
```

## Configuration

The CLI stores configuration in your user's config directory:

- Authentication tokens
- Repository settings
- Commit cache

## Best Practices

1. **Regular Updates**: Run `extract` periodically to keep your brag document current.

2. **Repository Organization**:

   - Add repositories you actively contribute to
   - Use meaningful repository names
   - Set appropriate max-commit limits

3. **Cache Management**:
   - The cache prevents re-processing of commits
   - Clear cache if you need to re-process commits
   - Use `cache list --stats` to monitor cache size

## Error Handling

The CLI provides detailed error messages and logging:

- Authentication errors
- Repository validation issues
- API communication problems
- Cache-related errors

## Environment Variables

- `BRAGDOC_API_URL`: Override the API endpoint
- `BRAGDOC_DEBUG`: Enable debug logging

## Troubleshooting

1. **Authentication Issues**

   - Ensure you're logged in: `bragdoc auth status`
   - Try logging out and back in
   - Check your internet connection

2. **Repository Issues**

   - Verify repository path exists
   - Ensure repository has a remote URL
   - Check repository permissions

3. **Extraction Issues**
   - Verify repository is enabled
   - Check max-commits setting
   - Try clearing the cache

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.
