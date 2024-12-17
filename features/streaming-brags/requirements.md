# Streaming Brags Feature Requirements

## Overview
Implement streaming functionality for Brag objects as they are extracted from user messages, improving the UI feedback and user experience by showing results incrementally instead of waiting for all extractions to complete.

## Current Behavior
- extractBrags returns all Brag objects at once
- UI shows no feedback until all Brags are extracted
- BragAction component has no loading/thinking state

## Desired Behavior
- Brags stream into the UI one at a time as they are extracted
- BragAction component shows a "Thinking..." state before the first Brag appears
- Smooth, incremental updates to the UI as each Brag is processed

## Technical Requirements

### Backend Changes
1. Modify extractBrags to use Generator pattern
   - Convert the function to be async generator
   - Yield each Brag as it's extracted
   - Maintain existing validation and processing logic

2. Update API Route
   - Leverage existing streaming infrastructure from createDocument
   - Use streamingData.append() pattern for each Brag
   - Ensure proper error handling during streaming

### Frontend Changes
1. BragAction Component
   - Add loading/thinking state
   - Implement smooth transitions between states
   - Handle incremental updates

2. Message Component
   - Update to handle streaming Brag data
   - Maintain proper state management during streaming
   - Show appropriate loading indicators

### Data Flow
1. User sends message
2. API route begins processing
3. "Thinking..." state shown immediately
4. As each Brag is extracted:
   - Backend yields Brag
   - streamingData.append() sends to frontend
   - UI updates to show new Brag
5. Process continues until all Brags are extracted

## Implementation Notes
- Use existing streaming infrastructure from createDocument as reference
- Maintain type safety throughout the streaming process
- Ensure proper error handling and recovery
- Consider rate limiting or throttling if needed
- Test with various message sizes and Brag counts

## Testing Requirements
- Unit tests for generator functionality
- Integration tests for streaming behavior
- UI tests for loading states and transitions
- Performance testing with large messages

## Success Criteria
- Users see immediate feedback when Brags are being extracted
- Each Brag appears smoothly in the UI as it's processed
- System maintains responsiveness during extraction
- Error states are properly handled and communicated
