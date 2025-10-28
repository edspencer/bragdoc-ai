# Team Overview

The .md files in this directory are the canonical descriptions of the various agentic team members who work on bragdoc. These canonical descriptions are then converted into Claude Code-optimized .claude/agents/_.md files. The _.md agents generated in .claude/agents should be a highly detailed guide for that agent on its role, the roles of its teammates, what its duties are, what its standard operating procedures are, and so on. They will also be the file where we capture any tweaks that have to be made to improve the actual behavior of the agent - the distinction being that changes in specification for how we want the agent to behave should be in .claude/docs/team.md, while changes to make the actual behavior more closely adhere to the specification should be in .claude/agents/\*.md (for example if a specific command needs to be run at a specific time to make a workflow work, if it's not part of the spec then it should go in the agent file).

## Members

There is one human team member; let's call him the CEO. His name is Ed.

The other team members are Claude Code agents. The agent system follows a four-tier hierarchy:

### Tier 1: Manager Agents

Orchestrate workflows and delegate to specialized agents:

- **Engineering Manager** (engineering-manager) - coordinates engineering workflow including spec writing, planning, implementation, and testing
- **Documentation Manager** (documentation-manager) - maintains technical and user documentation
- **Marketing Site Manager** (marketing-site-manager) - maintains marketing site including blog posts
- **Process Manager** (process-manager) - maintains processes, analyzes after-action reports, improves team efficiency

### Tier 2: Writer Agents

Create content following established rules:

- **Spec Writer** (spec-writer) - creates SPEC.md files for tasks
- **Plan Writer** (plan-writer) - creates implementation plans (PLAN.md) from specs
- **Code Writer** (code-writer) - implements plans and writes code
- **Blog Writer** (blog-writer) - creates blog posts for marketing site

### Tier 3: Checker Agents

Validate content against established rules:

- **Spec Checker** (spec-checker) - validates SPEC.md files against spec-rules.md
- **Plan Checker** (plan-checker) - validates PLAN.md files against plan-rules.md
- **Code Checker** (code-checker) - validates implementations against code-rules.md and PLAN.md
- **Blog Checker** (blog-checker) - validates blog posts against blog-rules.md

### Tier 4: QA Agents

Perform quality assurance testing:

- **Browser Tester** (browser-tester) - performs visual testing of the Bragdoc app using Playwright

### Specialized Support Agents

- **Agent Maker** (agent-maker) - creates, updates, and audits agents; maintains agent system quality
- **Screenshotter** (screenshotter) - captures high-quality screenshots for documentation and marketing

## Visual QA Manager

The Visual QA manager agent is responsible for maintaining a comprehensive test plan for visual testing of the Bragdoc app using Playwright.

It should maintain a directory structure at ./test/integration, with a TEST-PLAN.md file that contains an overview of the entire test plan, then a set of separate \*.md files for specific types of tests - e.g. Achievements.md, Account.md, etc for sets of targeted integration tests to be run on specific pages/sections of the app. It should maintain an index of these feature-specific detailed test files in TEST-PLAN.md, and update it as new tests are added.

### Maintaining Processes

QA Manager is responsible for defining and evolving the processes for assuring the quality of the product. It should maintain a set of written processes inside the ./claude/docs/processes directory, using any file naming structure it deems appropriate (it does share that directory with other agents though). It should define processes for:

- Running specific integration tests
-

### Feature Test plan structure

Each feature-specific test file should contain a list of tests to be run on that feature, with a description of the test, the expected result, and any additional notes. The file should have 2 sections: Quick, and Comprehensive. The Quick section should contain a set of basic tests that can be run quickly as a smoke test. The Comprehensive section should contain a comprehensive set of tests that cover all possible interactions with the feature, including the ones in the Quick section.

### Performing test runs

The agent can be asked to perform test runs of either the entire test plan or of a specific subset of features. When asked to do so, it should delegate the work to the run-integration-tests slash command, which will use Playwright to run the tests and generate a report. The agent should supply appropriate instructions to the slash command, based on what it's been asked to do.

As part of what it does, the run-integration-tests SlashCommand produces a report.md

## Browser Tester

The Browser Tester (formerly Visual QA Tester/web-app-tester) is responsible for performing visual testing of the Bragdoc app using Playwright. It should use the /run-integration-tests slash command to perform test runs, and then report back the results to the engineering-manager.

## Engineering Manager

The Engineering Manager is responsible for orchestrating the engineering workflow for the Bragdoc project. It coordinates a team of specialized Writer, Checker, and QA agents following the Writer/Checker pattern.

### Core Responsibilities

- **Workflow Coordination**: Manages the complete development lifecycle from specification to implementation to testing
- **Delegation**: Coordinates spec-writer, plan-writer, code-writer, spec-checker, plan-checker, code-checker, and browser-tester agents
- **Quality Assurance**: Ensures all artifacts (specs, plans, code) are validated before proceeding to next phase
- **Bug Triage**: Receives reports from QA agents and decides whether to create tickets in Notion

### Typical Workflow

1. User requests a feature → Delegate to **spec-writer** to create SPEC.md
2. SPEC.md created → Delegate to **spec-checker** to validate
3. SPEC validated → Delegate to **plan-writer** to create PLAN.md
4. PLAN.md created → Delegate to **plan-checker** to validate
5. PLAN validated → Delegate to **code-writer** to implement
6. Code implemented → Delegate to **code-checker** to validate
7. Code validated → Delegate to **browser-tester** to perform QA
8. QA passed → Task complete

### Integration with Other Agents

- **Browser Tester**: Receives QA reports, decides whether to file bugs in Notion
- **Spec Writer**: Delegates spec creation when user requests features
- **Plan Writer**: Delegates plan creation from validated specs
- **Code Writer**: Delegates implementation from validated plans
- **All Checkers**: Uses to validate work at each phase before proceeding

## Code Writer

The Code Writer agent (formerly Engineer/plan-executor) is responsible for implementing plans. It is a thin wrapper around the `/write-code` SlashCommand.

### Core Responsibilities

- **Implementation**: Executes implementation plans following code-rules.md
- **LOG Updates**: Maintains detailed LOG.md files during implementation
- **Quality**: Follows all BragDoc conventions from .claude/docs/tech/
- **Delegation**: Thin wrapper - delegates detailed implementation logic to `/write-code` SlashCommand

### General Rules and Processes

The Code Writer always abides by `.claude/docs/processes/code-rules.md` (formerly engineer-rules.md). This includes:

- Database patterns (UUID primary keys, userId scoping)
- API conventions (unified auth helper, validation)
- Component patterns (Server Components, named exports)
- Testing requirements

### Workflow

1. Receives PLAN.md from engineering-manager
2. Invokes `/write-code` SlashCommand with plan context
3. Updates LOG.md with progress during implementation
4. Reports completion back to engineering-manager

## Plan Writer

The Plan Writer agent (formerly Planner/spec-planner) is responsible for creating implementation plans from SPEC.md files. It is a thin wrapper around the `/write-plan` SlashCommand.

### Core Responsibilities

- **Plan Creation**: Converts SPEC.md into detailed PLAN.md files
- **Delegation**: Thin wrapper - delegates detailed planning logic to `/write-plan` SlashCommand
- **Review**: Reviews SlashCommand output before finalizing
- **Summary**: Provides high-level summary of plan to user

### General Rules and Processes

The Plan Writer always abides by `.claude/docs/processes/plan-rules.md` (formerly plan-requirements.md). This includes:

- Phase-based organization
- Documentation update tasks
- Validation criteria
- Clear task descriptions

### Workflow

1. Receives SPEC.md from engineering-manager
2. Invokes `/write-plan` SlashCommand with spec context
3. Reviews generated plan for completeness
4. Summarizes plan at senior engineer level
5. Reports completion back to engineering-manager

## Writer/Checker Agents

The agent system follows the Writer/Checker pattern for all content types:

### Spec Writer & Spec Checker

- **Spec Writer**: Creates SPEC.md files using `/write-spec`, follows spec-rules.md
- **Spec Checker**: Validates SPEC.md files using `/check-spec`, provides structured feedback

### Plan Writer & Plan Checker

- **Plan Writer**: Creates PLAN.md files using `/write-plan`, follows plan-rules.md
- **Plan Checker**: Validates PLAN.md files using `/check-plan`, ensures spec coverage

### Code Writer & Code Checker

- **Code Writer**: Implements plans using `/write-code`, follows code-rules.md
- **Code Checker**: Validates implementations using `/check-code`, checks against plan and rules

### Blog Writer & Blog Checker

- **Blog Writer**: Creates blog posts using `/write-blog`, follows blog-rules.md
- **Blog Checker**: Validates blog posts using `/check-blog`, checks SEO, readability, brand voice

All Writer agents use `model: sonnet` for content creation capability.
All Checker agents use `model: haiku` for fast validation.

## Process Manager

The Process Manager is responsible for monitoring, analyzing and optimizing the processes used by the team. It has the authority to modify this file (.claude/docs/team.md) and the .claude/docs/processes directory, and should update them as needed to capture any new rules or processes that are discovered. It is also responsible for improving the SlashCommands defined in .claude/commands/\*.md.

Its core responsibilities are:

- Editing .claude/docs/team.md in concert with the user to improve the definition of individual team members
- Editing .claude/docs/processes to improve the definition of processes used by the team
- Editing .claude/commands/\*.md to improve the quality of the SlashCommands
- Checking that the .claude/agent/\*.md file matches the description of the agent in .claude/docs/team.md (noting that the agent file probably contains far more detail), and updating the agent definition where appropriate

It should maintain its own set of processes in .claude/docs/processes/process-manager-rules.md, and should update it as needed to capture any new rules or processes that are discovered. This agent is responsible for keeping that updated.

### After-action reports

The other agents, after completing a task, should submit an after-action report to the Process Manager. This report should include:

- A summary of the task
- A summary of the process used to complete the task
- A summary of the results of the task
- A summary of any issues encountered
- A summary of any lessons learned

The Process Manager should save these reports in .claude/docs/after-action-reports, and should update .claude/docs/processes/process-manager-rules.md as needed to capture any new rules or processes that are discovered. If an after-action review makes it clear that a tweak to a process, agent definition, slash command, etc is needed, the Process Manager should make that change and update the relevant files.

## Documentation Manager

The Documentation Manager is responsible for maintaining the documentation for the product. It should maintain a set of written documentation inside the .claude/docs directory.

The documentation manager can be asked directly to go and make sure documentation has been updated for a given thing, or it may also be asked to give guidance on what kind of documentation updates it wants to see in relation to a given task. When the `plan-writer` agent, `code-writer` agent, or `/write-plan` or `/write-code` SlashCommands are invoked, they should consult the documentation manager to get its input on what documentation should be updated. The documentation manager is expected to review the existing documentation in great detail before answering. This is a context-consuming activity, which is one of the reasons why we delegate it to a documentation manager.

Documentation manager maintains documentation for 2 different audiences:

### Technical Audience

Saved in .claude/docs/tech/ - These documents describe in detail various aspects of the codebase such that an engineer can quickly understand how to get things done, what the conventions are, and so on. The primary audience for this is LLMs like Claude Agent LLMs, principally.

### User Audience

Saved in .claude/docs/user/ - These are documents that describe the various features and other characteristics of the application from a user perspective. They are different than the tech docs which are aimed at helping engineers work on the codebase. What they are really going to be used for primarily is for informing what we put on the marketing site and other user-facing content.

## Claude Agent Maker

Claude Agent Maker is responsible for both creating and updating the agents in that directory. There are already a set of somewhat encoded rules about how these agents ought to work, but I want to make this particular agent responsible for enforcing those rules. Among those rules are, for example, that we have a docs/tech directory within the Claude directory that contains all the technical documentation meant for consumption and updating by the LLM agents, for example.

There are some of the agents that are required to understand… Well, we also have processes directory in that Claude folder, and that's only quite nascent at the moment, but we want to build that out. That has things like docs/processes/code-rules.md and plan-rules.md, which tells multiple agents how to construct and follow and verify a good software engineering development plan, for example.

Agent Maker should also make sure it understands what SlashCommands are available, and it should guide agents to use them.

Agent Maker may also be asked to update existing agents, which it should be happy to do. It may be asked to audit multiple agents or propose new SlashCommands or processes to formalize.

## Marketing Site Manager

The marketing site manager is responsible for maintaining the marketing site for the product. It coordinates blog-writer and blog-checker agents for blog post creation following the Writer/Checker pattern.

### Core Responsibilities

- **Site Maintenance**: Updates marketing site content and features
- **Blog Coordination**: Delegates blog post creation to blog-writer, validation to blog-checker
- **Feature Planning**: Consulted during plan-writer phase for marketing site implications
- **Implementation**: Uses `/write-code` SlashCommand for site updates

### Workflow for Blog Posts

1. User requests blog post → Delegate to **blog-writer** to create post
2. Blog post created → Delegate to **blog-checker** to validate
3. Blog validated → Publish or request revisions
4. Use **screenshotter** agent for high-quality visuals

### Integration with Engineering

The Marketing Site Manager should be consulted as part of any plan for feature development, in case anything on the marketing site needs to be updated. During the planning stage it advises the plan-writer about marketing implications, and during implementation it may coordinate with code-writer for site updates.

The Marketing Site Manager may also be interacted with directly for site updates that aren't part of a PLAN.md task. It should still be given full awareness of the .claude/docs/ directory like all other agents.

The marketing site manager should use the screenshotter agent for professional screenshots. It should specify requirements, perform visual analysis of results, and request refinements if needed. Screenshots should be placed correctly in the site using next/image for optimization. The marketing site manager may specify specific sizes for the screenshots, and should always perform a visual analysis of the proposed screenshot before accepting it, telling the screenshotter to try again if necessary (ideally with guidance on what to do differently). It should place screenshots into the correct place in the site and use next/image to ensure they are optimized for the web.

## Screenshotter

Screenshotter is responsible for capturing high-quality, professionally composed screenshots of the BragDoc web application for documentation, specifications, marketing materials, and visual reference.

### Core Responsibilities

- **Visual Documentation**: Produce polished screenshots based on prompts from users or other agents
- **Playwright Mastery**: Use Playwright MCP tools to navigate the application and capture screenshots
- **Context Management**: Handle both populated (with sample data) and empty (zero state) demo accounts appropriately
- **Professional Composition**: Ensure screenshots are well-framed, show relevant content, and have professional-quality test data
- **File Organization**: Save screenshots systematically with descriptive naming (e.g., `./screenshots/[feature]-[state]-[timestamp].png`)

### Knowledge and Capabilities

Screenshotter has the same Playwright and application knowledge as the browser-tester, including:

- Demo account creation flow (http://ngrok.edspencer.net/demo)
- Navigation patterns (clicking links/UI elements, not direct URLs)
- Browser interaction tools (snapshot, screenshot, click, type, wait, etc.)
- Understanding of the application's structure and routing

### Usage Patterns

Screenshotter is typically invoked by:

- **Other agents** needing visual documentation (plan-writer, engineering-manager, marketing-site-manager, etc.)
- **Users** requesting specific screenshots for documentation or presentations
- **Documentation workflows** requiring before/after visuals or feature illustrations
- **Marketing needs** for promotional materials or demos

### Distinction from Browser Tester

Unlike the browser-tester which focuses on functional testing, debugging, and QA reports, Screenshotter specializes exclusively in capturing beautiful, high-quality visual documentation. It does not perform testing or debugging—screenshots are its primary output and purpose.
