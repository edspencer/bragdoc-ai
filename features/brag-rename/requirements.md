# Brag to Achievement Model Rename

## Overview
This document outlines the requirements for renaming the "Brag" model to "Achievement" throughout the codebase, while maintaining the product name "bragdoc.ai" and the concept of "brag documents" in user-facing content.

## Goals
- Rename the Brag model and related code artifacts to Achievement
- Maintain the product branding and user-facing terminology where appropriate
- Ensure database compatibility and data preservation
- Update all related type definitions, components, and utilities

## Database Changes

### Schema Updates
1. Rename the `brags` table to `achievements`
2. Update all foreign key constraints referencing the `brags` table
3. Update any indexes or constraints with "brag" in their names
4. Update any junction tables that reference brags (e.g., `brag_tags` to `achievement_tags`)

## Code Changes

### Model and Type Definitions
1. Update `lib/db/schema.ts`:
   - Rename Brag model to Achievement
   - Update table name and related field names
   - Update any references in relationships

2. Update type definitions:
   - Rename `Brag` interface to `Achievement`
   - Update any union types containing `Brag`
   - Update type imports/exports

### Components and UI
1. Rename component files and directories:
   - `components/brag/` → `components/achievement/`
   - Update component names (e.g., `BragCard.tsx` → `AchievementCard.tsx`)

2. Update props and type annotations:
   - Rename prop types containing "brag"
   - Update component interfaces

### API Routes and Handlers
1. Update API endpoints:
   - Keep URLs as-is if they contain "brag" for consistency
   - Update internal handler names and types

2. Update API response types:
   - Rename types in API responses
   - Update error message references

### Database Queries and Operations
1. Update Drizzle ORM usage:
   - Rename table references
   - Update query builders
   - Update any raw SQL queries

2. Update database utility functions:
   - Rename functions containing "brag"
   - Update parameter names and types

### AI/LLM Integration
1. Update AI function implementations in `lib/ai/`:
   - Rename functions dealing with brags
   - Update prompt templates
   - Maintain "brag" terminology in user-facing content

2. Update Braintrust Evals:
   - Update test cases in `evals/` directory
   - Maintain consistency in evaluation criteria

## Testing Requirements

### Unit Tests
1. Update test files:
   - Rename test files containing "brag"
   - Update test case descriptions
   - Update mock data and fixtures

### Integration Tests
1. Update API tests:
   - Update endpoint tests
   - Update request/response assertions

### Migration Testing
1. Create test cases for:
   - Database migration
   - Data preservation
   - Foreign key integrity

## Migration Strategy

### Database Migration
1. Create a migration script to:
   - Rename tables
   - Update foreign key constraints
   - Preserve existing data
   - Handle rollback scenarios

### Code Migration
1. Implement changes in phases:
   - Database schema
   - Core models and types
   - Components and UI
   - API and handlers
   - Tests and documentation

## Documentation Updates

### Code Documentation
1. Update inline documentation:
   - Update JSDoc comments
   - Update type definitions
   - Update code examples

### Project Documentation
1. Update README.md:
   - Maintain "bragdoc.ai" branding
   - Update technical references to Achievement model

2. Update API documentation:
   - Update endpoint descriptions
   - Update request/response examples

## Verification Checklist
- [ ] Database schema successfully migrated
- [ ] All type definitions updated
- [ ] Components renamed and functioning
- [ ] API endpoints working correctly
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No references to "Brag" model in code (except where intentional)
- [ ] User-facing "brag" terminology preserved where appropriate

## Notes
- The product name "bragdoc.ai" remains unchanged
- User-facing terminology about "brag documents" remains unchanged
- Only internal code references to the model should be updated to "Achievement"
