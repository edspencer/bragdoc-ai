# OAuth Integration Plan

## 1. Environment Setup 
- [x] Create OAuth applications
  - [x] Google Cloud Console: Create OAuth 2.0 Client
  - [x] GitHub Developer Settings: Create OAuth App
- [x] Add environment variables
  ```env
  # Google OAuth
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=

  # GitHub OAuth
  GITHUB_CLIENT_ID=
  GITHUB_CLIENT_SECRET=
  ```

## 2. NextAuth Configuration 
- [x] Add OAuth providers to auth.ts
  - [x] Google provider
  - [x] GitHub provider
- [x] Update user schema to include OAuth-specific fields
  - [x] Add provider field (enum: 'credentials' | 'google' | 'github')
  - [x] Add provider-specific user IDs
  - [x] Add GitHub access token for later repository access

## 3. UI Implementation
- [x] Update login page
  - [x] Add "Continue with Google" button
  - [x] Add "Continue with GitHub" button
  - [x] Add social login divider
- [x] Update register page with same social buttons
  - [x] Add "Continue with Google" button
  - [x] Add "Continue with GitHub" button
  - [x] Add social login divider
- [ ] Add loading states for OAuth flows
  - [ ] Add loading state to Google button
  - [ ] Add loading state to GitHub button
  - [ ] Disable buttons during OAuth redirect
- [ ] Add error handling for OAuth failures
  - [ ] Display toast messages for OAuth errors
  - [ ] Handle user cancellation
  - [ ] Handle API errors

## 4. Testing
- [ ] Test Google OAuth flow
  - [ ] New user registration
  - [ ] Existing user login
  - [ ] Error cases
- [ ] Test GitHub OAuth flow
  - [ ] New user registration
  - [ ] Existing user login
  - [ ] Error cases
  - [ ] Access token storage

## 5. Documentation
- [ ] Update README with OAuth setup instructions
- [ ] Document environment variables
- [ ] Add troubleshooting guide for common OAuth issues

## Next Steps
1. Add loading states to social login buttons
   - Update SocialAuthButtons component to handle loading state
   - Add loading state to button click handlers
2. Implement error handling for OAuth failures
   - Add error toast messages
   - Handle user cancellation and API errors
3. Begin testing OAuth flows with both providers