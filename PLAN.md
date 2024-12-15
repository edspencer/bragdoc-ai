# Project Management Feature Implementation Plan

## Phase 1: Generate Realistic Test Data (Completed)

### 1. Conversation Generator (Completed)
```typescript
// Types for conversation generation
type CompanyContext = {
  id: string
  name: string
  role: string
  domain?: string
  startDate: Date
  endDate?: Date
}

type ProjectContext = {
  id: string
  name: string
  companyId?: string
  description: string
  startDate?: Date
  endDate?: Date
}

type ConversationScenario = {
  description: string
  companies: CompanyContext[]
  projects: ProjectContext[]
  userPersona: string
  timeframe: {
    start: Date
    end: Date
  }
}
```

### 2. Scenario Templates (Completed)
1. **Multi-Company Professional**
   - Working at two companies simultaneously
   - Mix of consulting and full-time roles
   - Multiple projects across companies

2. **Career Transition**
   - Leaving one company for another
   - Project handover discussions
   - Starting new projects at new company

3. **Personal Growth**
   - Mix of work and personal achievements
   - Side projects and learning
   - Non-company-related accomplishments

4. **Project Lead**
   - Multiple projects at one company
   - Team achievements
   - Project milestones and metrics

### 3. LLM-based Generation Pipeline (Completed)
- Built robust generation system using Vercel AI SDK
- Implemented proper schema validation with zod
- Added date format validation and type conversion
- Created natural conversation generation
- Added ground truth brag extraction

1. **Scenario Generation**
   ```typescript
   async function generateScenario(template: string): Promise<ConversationScenario> {
     // Use LLM to flesh out scenario details
     // Returns complete scenario with companies, projects, and timeframes
   }
   ```

2. **Conversation Generation**
   ```typescript
   async function generateConversation(
     scenario: ConversationScenario,
     numTurns: number
   ): Promise<Conversation[]> {
     // Use LLM to generate realistic chat between user and AI
     // Maintains context across turns
     // Includes both brag-worthy moments and casual chat
   }
   ```

3. **Expected Output Generation**
   ```typescript
   async function generateExpectedBrags(
     conversation: Conversation,
     context: ConversationScenario
   ): Promise<EnhancedBrag[]> {
     // Use LLM to determine expected brag extraction
     // Including company/project attribution
     // And suggestions for new projects
   }
   ```

### 4. Test Infrastructure (Completed)
- Test generation pipeline implemented
- Output validation with zod schemas
- Generated test data saved for evaluation

## Phase 2: Braintrust Evaluation Setup
### 1. Context-Aware Eval Design
- [ ] Create evaluation criteria for context accuracy:
  - Company attribution accuracy
  - Project attribution accuracy
  - Temporal context accuracy
  - Suggestion quality metrics

### 2. Test Dataset Integration
- [ ] Convert generated conversations to BrainTrust format:
  ```typescript
  type EvalExample = {
    input: { 
      input: string
      chat_history: ChatTurn[]
      context: {
        companies: CompanyContext[]
        projects: ProjectContext[]
      }
    }
    expected: {
      brag: Brag
      companyId?: string
      projectId?: string
      suggestNewProject?: boolean
    }
  }
  ```

### 3. Evaluation Implementation
- [ ] Create BragContextAccuracy evaluator:
  ```typescript
  const BragContextAccuracy = LLMClassifierFromSpec("BragContextAccuracy", {
    prompt: `You are evaluating how well an AI system extracted achievement information with company and project context.
    Consider:
    1. Achievement extraction accuracy
    2. Company attribution accuracy
    3. Project attribution accuracy
    4. Project suggestion appropriateness
    
    Rate from A (perfect) to E (incorrect)...`
  })
  ```
- [ ] Add metrics for:
  - Context maintenance
  - Attribution accuracy
  - Suggestion quality

### 4. Baseline Evaluation
- [ ] Run evaluation on current extractor
- [ ] Document baseline metrics
- [ ] Identify areas for improvement

## Phase 3: Enhanced Brag Extraction
### 1. Context-Aware Processing
- [ ] Update `extractBrag` function to use conversation context
- [ ] Add company and project detection
- [ ] Implement suggestion system for new projects

### 2. Schema Updates
- [ ] Add company and project fields to brag schema
- [ ] Add suggestion fields for project creation
- [ ] Update database schema if needed

### 3. Testing Framework
- [ ] Create test suite using generated conversations
- [ ] Add metrics for context accuracy
- [ ] Test project suggestion logic

## Phase 4: UI Implementation
### 1. Project Management Interface
- [ ] Create project list view
- [ ] Add project creation form
- [ ] Implement project editing

### 2. Brag Integration
- [ ] Update brag display to show project context
- [ ] Add project suggestion UI
- [ ] Implement project assignment

### 3. Analytics
- [ ] Add project-based filtering
- [ ] Create project progress views
- [ ] Implement achievement tracking by project

## Implementation Order
1. Build conversation generation pipeline
2. Generate and validate test dataset
3. Create and run Braintrust evaluation
4. Update brag extraction with context awareness
5. Implement testing framework
6. Build UI components
7. Add analytics and reporting