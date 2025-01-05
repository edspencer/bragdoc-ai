# BragDoc.ai Features

This document outlines the implemented features of BragDoc.ai, a chatbot that helps users maintain their professional achievements and generate performance review documents.

## Core Features

### Marketing & Public Pages
- About page at `/about`
- Pricing page at `/pricing`
- Terms of Service page at `/terms`
- Privacy Policy page at `/privacy`

### Authentication System
- Email/password authentication
- Google OAuth integration
- GitHub OAuth integration (partial)
  - OAuth app setup completed
  - Provider configuration implemented
  - Repository access setup
- User session management
- Protected routes
- Authentication middleware

### GitHub Integration
- GitHub OAuth authentication
- GitHub access token storage
- Repository synchronization
  - Repository list view
  - Per-repository sync functionality
  - Last synced timestamp tracking
  - Pull request synchronization with upsert
  - Basic error handling

### Email Integration
#### Inbound Email Processing
- Mailgun webhook integration for receiving emails
- Email sender verification and validation
- Achievement extraction from email content
  - Support for both plain text and HTML formats
  - Context-aware achievement parsing
  - Company and project linking
  - Date and duration detection
- Secure webhook endpoint with signature verification
- Automatic user message creation from emails
- Error handling and logging

#### Email Management (Coming Soon)
- Weekly/monthly achievement summaries
- Performance review document generation
- Manager update emails
- React Email-based templating system
- Email preference management
- Unsubscribe functionality

#### Security & Compliance
- Email sender verification
- Mailgun webhook signature validation
- Rate limiting implementation
- GDPR-compliant data handling

### User Interface
#### Navigation Structure
- Companies management at `/companies`
- Projects management at `/projects`
- Achievements page at `/achievements`
- Settings page for user management
- Bottom-left navigation with:
  - Direct icon buttons for common actions
  - Links to Companies, Projects, and Achievements
  - Theme toggle functionality

#### Achievement Management
- Complete CRUD operations for achievements
  - Create achievements with title, date, company, and project links
  - View achievements in a list with sorting and filtering
  - Edit achievement details through modal interface
  - Delete achievements with confirmation dialog
- Consistent UI patterns matching company/project management
- Interactive feedback with loading states and toasts
- Modern UI with side-by-side action buttons
- Dark mode support throughout

#### Company & Project Management
- Complete CRUD operations for companies
- Complete CRUD operations for projects
- Consistent UI layout across management pages
- Interactive feedback (confetti animation on creation)
- Modal-based creation and editing interfaces

## Database Schema
### Core Tables
- Users table with OAuth support
- Companies table for organization management
- Projects table for project tracking
- Achievements table for achievement storage

## Technical Implementation
- Next.js-based architecture
- TypeScript throughout the codebase
- Tailwind CSS for styling
- Shadcn UI components
- Dark mode support
