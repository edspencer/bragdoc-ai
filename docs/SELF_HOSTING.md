# Self-Hosting BragDoc

BragDoc is designed to be easily self-hosted with full control over your data and deployment.

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/bragdoc-ai.git
   cd bragdoc-ai
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies and set up database**

   ```bash
   pnpm setup
   ```

4. **Start development environment**
   ```bash
   pnpm dev
   # Or use the convenience script:
   ./scripts/dev.sh
   ```

Your applications will be available at:

- **Web app**: http://localhost:3000
- **Marketing site**: http://localhost:3001

## Environment Variables

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for session encryption (generate with `openssl rand -base64 32`)

### Payment Integration (Optional)

BragDoc supports two modes:

**Open Source Mode (Default):**

- `PAYMENT_TOKEN_REQUIRED=false` or unset
- All features available to all users
- No payment integration required

**Commercial Mode:**

- `PAYMENT_TOKEN_REQUIRED=true`
- Enable subscription-based feature gating
- Requires Stripe configuration:
  - `STRIPE_SECRET_KEY`: Your Stripe secret key
  - `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
  - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

### Authentication Providers (Optional)

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For GitHub OAuth

### Email Integration (Optional)

- `MAILGUN_API_KEY`: For sending emails
- `MAILGUN_DOMAIN`: Your Mailgun domain

### AI Providers

- `OPENAI_API_KEY`: For OpenAI GPT models

## Deployment Options

### Option 1: Single Server Deployment

Run both apps on the same server with different ports:

```bash
# Build all applications
pnpm build

# Start web app (port 3000)
cd apps/web && pnpm start &

# Start marketing site (port 3001)
cd apps/marketing && pnpm start &
```

### Option 2: Separate Deployments

Deploy applications independently:

```bash
# Build and deploy web app only
pnpm build:web
cd apps/web && pnpm start

# Build and deploy marketing site only
pnpm build:marketing
cd apps/marketing && pnpm start
```

### Option 3: Docker Deployment

Use the provided Dockerfile configurations for containerized deployment.

### Option 4: Vercel/Netlify

Each app can be deployed separately to platforms like Vercel or Netlify using their monorepo support.

## Database Setup

BragDoc uses PostgreSQL. You can use any PostgreSQL instance:

1. **Local PostgreSQL**

   ```bash
   # Install PostgreSQL locally
   createdb bragdoc
   # Update DATABASE_URL in .env
   ```

2. **Docker PostgreSQL**

   ```bash
   docker run --name bragdoc-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=bragdoc -p 5432:5432 -d postgres
   ```

3. **Hosted PostgreSQL**
   Use services like Neon, Supabase, Railway, or AWS RDS.

## Feature Configuration

### Open Source Mode Features

When `PAYMENT_TOKEN_REQUIRED=false` (default):

- ✅ Unlimited achievement tracking
- ✅ Document generation
- ✅ AI assistance (if API keys provided)
- ✅ Email integration
- ✅ GitHub integration
- ✅ All analytics and exports

### Commercial Mode Features

When `PAYMENT_TOKEN_REQUIRED=true`, features are gated by subscription level:

**Free Tier:**

- Basic achievement tracking
- Limited documents

**Paid Tiers (Basic/Pro):**

- Unlimited documents
- AI assistance
- Advanced analytics
- Email integration
- API access

## Development Workflow

### Working on Web App Only

```bash
pnpm dev:web-only
```

### Working on Marketing Site Only

```bash
pnpm dev:marketing-only
```

### Working on Shared Packages

Changes to packages (UI, database, auth, etc.) will automatically reload in both apps.

### Running Tests

```bash
# All tests
pnpm test

# CLI tests only
pnpm test:cli

# Watch mode
pnpm test:watch
```

### Database Management

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:push

# Open database studio
pnpm db:studio
```

## Troubleshooting

### Port Already in Use

If ports 3000 or 3001 are in use, modify the port in the respective app's package.json:

```json
{
  "scripts": {
    "dev": "next dev -p 3002"
  }
}
```

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check DATABASE_URL format: `postgresql://user:password@host:port/database`
3. Ensure database exists and user has proper permissions

### Build Failures

1. Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`
2. Clear Next.js cache: `pnpm turbo build --force`
3. Check for TypeScript errors: `pnpm turbo lint`

### Missing Environment Variables

Required variables will cause startup failures. Check the console for specific missing variables.

## Security Considerations

- **Never commit secrets**: Use .env files and add them to .gitignore
- **Use strong secrets**: Generate NEXTAUTH_SECRET with sufficient entropy
- **Database security**: Use connection pooling and proper authentication
- **API keys**: Rotate keys regularly and use least-privilege access
- **HTTPS in production**: Always use HTTPS for production deployments

## Getting Help

- 📖 **Documentation**: Check the docs/ folder for detailed guides
- 🐛 **Issues**: Report problems on GitHub Issues
- 💬 **Discussions**: Join GitHub Discussions for questions
- 📧 **Email**: Contact support for commercial licensing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both apps: `pnpm dev`
5. Submit a pull request

See CONTRIBUTING.md for detailed contribution guidelines.
