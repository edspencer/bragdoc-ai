#!/bin/bash
# Development script to run both apps concurrently

echo "🚀 Starting BragDoc development environment..."
echo ""
echo "📱 Web app:       http://localhost:3000"
echo "🌐 Marketing:     http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
    echo ""
fi

# Run turbo dev which will start both apps
pnpm turbo dev