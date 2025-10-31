#!/usr/bin/env node

// Import built-in Node.js modules
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Constants
// Map of project names to {spread, shift} objects for date transformation
// spread: number of days to distribute achievements across
// shift: number of days back from "now" to start the range (0 = most recent, higher = further back)
const PROJECT_WHITELIST = {
  bragdoc: { spread: 270, shift: 0 },
  'mdx-prompt': { spread: 90, shift: 85 },
  'rsc-examples': { spread: 200, shift: 0 },
};
// Output path relative to monorepo root (where pnpm prepare-demo-data is run from)
const OUTPUT_FILE_PATH = 'apps/web/lib/ai/demo-data.json';
const DEFAULT_START_DATE = '2023-01-01T00:00:00.000Z';

// Type definitions for whitelist config
interface ProjectConfig {
  spread: number;
  shift: number;
}

interface ProjectWhitelist {
  [projectName: string]: ProjectConfig;
}

// Main function
async function main(): Promise<void> {
  try {
    // Parse command-line arguments
    const args = process.argv.slice(2);

    if (args.length !== 1) {
      console.error('Usage: pnpm prepare-demo-data <input-file-path>');
      console.error('');
      console.error('Example:');
      console.error('  pnpm prepare-demo-data /path/to/exported-data.json');
      process.exit(1);
    }

    const inputFilePath = args[0]!;

    // Import Zod schema from TypeScript file
    const { exportDataSchema } = await import(
      '../apps/web/lib/export-import-schema'
    );

    // Phase 2: Load and validate input data
    console.log('Loading input file:', inputFilePath);
    const inputData = await loadInputData(inputFilePath);

    console.log('Validating input schema...');
    const validatedInput = await validateInputData(inputData, exportDataSchema);
    console.log('✓ Input validation successful');
    logInputSummary(validatedInput);

    // Phase 3: Data transformation
    // 3.1: Create Cyberdyne company
    const cyberdyneCompany = createCyberdyneCompany(
      validatedInput,
      validatedInput.userId,
    );

    // 3.2 & 3.3: Filter and transform projects
    const {
      projects: filteredProjects,
      projectIds: keptProjectIds,
      projectConfig,
    } = filterProjectsByWhitelist(
      validatedInput.projects as Array<
        { name: string; id: string } & Record<string, unknown>
      >,
      PROJECT_WHITELIST,
    );
    const transformedProjects = transformProjects(
      filteredProjects,
      cyberdyneCompany.id,
    );

    // 3.4: Filter and transform achievements
    const transformedAchievements = transformAchievements(
      validatedInput.achievements as Array<
        {
          projectId?: string | null;
          eventStart?: string;
          eventEnd?: string;
        } & Record<string, unknown>
      >,
      keptProjectIds,
      cyberdyneCompany.id,
      projectConfig,
    );

    // 3.5: Transform documents
    const transformedDocuments = transformDocuments(
      validatedInput.documents as Array<
        { companyId?: string | null } & Record<string, unknown>
      >,
    );

    // Phase 4: Output validation and integrity checks
    // 4.1: Build output data structure
    const outputData = buildOutputData(
      validatedInput,
      cyberdyneCompany,
      transformedProjects,
      transformedAchievements,
      transformedDocuments,
    );

    // 4.2: Validate output against schema
    console.log('Validating output schema...');
    await validateOutputData(outputData, exportDataSchema);
    console.log('✓ Output validation successful');

    // 4.3: Perform integrity checks
    performIntegrityChecks(outputData);
    console.log('✓ Data integrity checks passed');

    // 4.4: Generate summary report
    generateSummaryReport(validatedInput, outputData);

    // Phase 5: Write output file
    await writeOutputFile(outputData, OUTPUT_FILE_PATH);

    console.log('✓ Demo data preparation complete');
  } catch (error) {
    // Error handling by type
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ZodError'
    ) {
      console.error('Error: Input validation failed');
      console.error('');
      console.error('Validation errors:');
      const zodError = error as unknown as {
        errors: Array<{ path: string[]; message: string }>;
      };
      for (const err of zodError.errors) {
        const fieldPath = err.path.join('.');
        console.error(`  - ${fieldPath}: ${err.message}`);
      }
    } else if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as Record<string, unknown>).code === 'string'
    ) {
      // File system errors
      const fsError = error as { code: string; path?: string; message: string };
      switch (fsError.code) {
        case 'ENOENT':
          console.error(`Error: File not found: ${fsError.path}`);
          break;
        case 'EACCES':
          console.error(`Error: Permission denied: ${fsError.path}`);
          break;
        case 'EISDIR':
          console.error(
            `Error: Expected a file but found a directory: ${fsError.path}`,
          );
          break;
        default:
          console.error(
            `Error: File system error (${fsError.code}): ${fsError.message}`,
          );
      }
    } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
      // JSON parsing errors
      console.error('Error: Invalid JSON in input file');
      console.error(`  ${error.message}`);
    } else if (error instanceof Error) {
      // Generic Error instances
      console.error('Error:', error.message);
    } else {
      // Unknown errors
      console.error('Error: An unexpected error occurred');
      console.error(error);
    }

    process.exit(1);
  }
}

interface Company {
  startDate?: string;
}

interface InputData {
  companies: Company[];
  userId: string;
  projects: unknown[];
  achievements: unknown[];
  documents: unknown[];
  version: string;
  exportedAt: string;
}

interface CyberdyneCompany {
  id: string;
  userId: string;
  name: string;
  domain: string;
  role: string;
  startDate: string;
  endDate: null;
}

function createCyberdyneCompany(
  inputData: InputData,
  userId: string,
): CyberdyneCompany {
  // Generate new UUID for Cyberdyne company
  const cyberdyneId = randomUUID();

  // Find earliest start date from all companies
  let earliestStartDate = null;

  for (const company of inputData.companies) {
    if (company.startDate) {
      const companyDate = new Date(company.startDate);
      if (!earliestStartDate || companyDate < earliestStartDate) {
        earliestStartDate = companyDate;
      }
    }
  }

  // If no start date found, use default
  const startDate = earliestStartDate
    ? earliestStartDate.toISOString()
    : DEFAULT_START_DATE;

  // Log warning if using default
  if (!earliestStartDate) {
    console.log(
      `⚠ No company start dates found, using default: ${DEFAULT_START_DATE}`,
    );
  }

  console.log(`Creating Cyberdyne company with ID: ${cyberdyneId}`);

  return {
    id: cyberdyneId,
    userId: userId,
    name: 'Cyberdyne',
    domain: 'cyberdyne.com',
    role: 'Senior Engineer',
    startDate: startDate,
    endDate: null,
  };
}

interface FilterProjectsResult {
  projects: Array<Record<string, unknown>>;
  projectIds: Set<string>;
  projectConfig: Map<string, ProjectConfig>;
}

function filterProjectsByWhitelist(
  projects: Array<{ name: string; id: string } & Record<string, unknown>>,
  whitelist: ProjectWhitelist,
): FilterProjectsResult {
  // Create lowercase lookup map for case-insensitive matching
  const lowerWhitelistMap: Record<string, ProjectConfig> = {};
  for (const [name, config] of Object.entries(whitelist)) {
    lowerWhitelistMap[name.toLowerCase()] = config;
  }

  // Filter projects and build config map
  const filteredProjects = [];
  const projectConfig = new Map(); // Maps projectId -> {spread, shift}

  for (const project of projects) {
    const lowerName = project.name.toLowerCase();
    if (lowerName in lowerWhitelistMap) {
      filteredProjects.push(project);
      projectConfig.set(project.id, lowerWhitelistMap[lowerName]);
    }
  }

  // Create Set of kept project IDs
  const projectIds = new Set(filteredProjects.map((p) => p.id));

  // Log results
  console.log(
    `✓ Filtered ${filteredProjects.length} projects from whitelist (out of ${projects.length} total)`,
  );

  if (filteredProjects.length === 0) {
    console.log('⚠ No projects matched whitelist');
  }

  return {
    projects: filteredProjects,
    projectIds: projectIds,
    projectConfig: projectConfig,
  };
}

function transformProjects(
  projects: Array<Record<string, unknown>>,
  cyberdyneCompanyId: string,
): Array<Record<string, unknown>> {
  const transformed = projects.map((project) => ({
    ...project,
    companyId: cyberdyneCompanyId,
  }));

  console.log(
    `✓ Updated ${transformed.length} projects with Cyberdyne company ID`,
  );

  return transformed;
}

function transformAchievements(
  achievements: Array<
    {
      projectId?: string | null;
      eventStart?: string;
      eventEnd?: string;
    } & Record<string, unknown>
  >,
  keptProjectIds: Set<string>,
  cyberdyneCompanyId: string,
  projectConfig: Map<string, ProjectConfig>,
): Array<Record<string, unknown>> {
  // Filter achievements to keep only those with null projectId or projectId in keptProjectIds
  const filtered = achievements.filter(
    (achievement) =>
      achievement.projectId === null ||
      keptProjectIds.has(achievement.projectId as string),
  );

  console.log(
    `✓ Filtered ${filtered.length} achievements from ${achievements.length} total`,
  );

  // Group achievements by projectId to calculate date ranges
  const achievementsByProject = new Map<
    string | null,
    Array<{ achievement: Record<string, unknown>; date: Date }>
  >();

  for (const achievement of filtered) {
    const projectId = (achievement.projectId ?? null) as string | null;
    if (!achievementsByProject.has(projectId)) {
      achievementsByProject.set(projectId, []);
    }

    const date = achievement.eventStart
      ? new Date(achievement.eventStart as string)
      : new Date();
    achievementsByProject.get(projectId)!.push({ achievement, date });
  }

  // Transform achievements with date shifting
  const transformed: Array<Record<string, unknown>> = [];

  for (const [projectId, achievementList] of Array.from(
    achievementsByProject.entries(),
  )) {
    // Sort by date to calculate range
    achievementList.sort((a, b) => a.date.getTime() - b.date.getTime());

    const config =
      projectId && projectConfig.has(projectId)
        ? projectConfig.get(projectId)!
        : null;

    if (config && achievementList.length > 0) {
      // Calculate target date range
      const now = new Date();
      const windowEndDate = new Date(now);
      windowEndDate.setDate(windowEndDate.getDate() - config.shift);

      const windowStartDate = new Date(windowEndDate);
      windowStartDate.setDate(windowStartDate.getDate() - config.spread);

      const targetRangeMs = windowEndDate.getTime() - windowStartDate.getTime();
      const spreadMs = targetRangeMs / achievementList.length; // Even spacing

      // Distribute achievements evenly across the target date range by index
      for (let i = 0; i < achievementList.length; i++) {
        const achievement = achievementList[i]!.achievement;
        const newTime = windowStartDate.getTime() + i * spreadMs;
        const newDate = new Date(newTime);
        const newDateStr = newDate.toISOString();

        transformed.push({
          ...achievement,
          eventStart: newDateStr,
          eventEnd: newDateStr,
          createdAt: newDateStr,
          updatedAt: newDateStr,
          impactUpdatedAt: newDateStr,
          companyId: cyberdyneCompanyId,
        });
      }
    } else {
      // No config, just update company ID
      for (const { achievement } of achievementList) {
        transformed.push({
          ...achievement,
          companyId: cyberdyneCompanyId,
        });
      }
    }
  }

  console.log(
    '✓ Updated achievements with Cyberdyne company ID and date transformations',
  );

  return transformed;
}

function transformDocuments(
  documents: Array<{ companyId?: string | null } & Record<string, unknown>>,
): Array<Record<string, unknown>> {
  // Exclude all documents from demo data
  console.log(`✓ Excluded ${documents.length} documents from demo data`);
  return [];
}

function buildOutputData(
  inputData: InputData,
  cyberdyneCompany: CyberdyneCompany,
  projects: Array<Record<string, unknown>>,
  achievements: Array<Record<string, unknown>>,
  documents: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    version: inputData.version, // Preserve "1.0"
    exportedAt: inputData.exportedAt, // Preserve original timestamp
    userId: inputData.userId, // Preserve original user ID
    companies: [cyberdyneCompany], // Only Cyberdyne
    projects: projects, // Transformed projects array
    achievements: achievements, // Transformed achievements array
    documents: documents, // Transformed documents array
  };
}

async function validateOutputData(
  data: Record<string, unknown>,
  schema: unknown,
): Promise<unknown> {
  // Use schema.parse(data) to validate
  // Throws ZodError if validation fails (caught by main error handler)
  const s = schema as { parse: (data: unknown) => unknown };
  return s.parse(data);
}

function performIntegrityChecks(data: Record<string, unknown>): void {
  const companies = data.companies as Array<{ id: string }>;
  const cyberdyneCompanyId = companies[0]?.id;

  // Check 1: No Orphaned Achievement Projects
  const projects = data.projects as Array<{ id: string }>;
  const validProjectIds = new Set(projects.map((p) => p.id));

  const achievements = data.achievements as Array<{
    id: string;
    projectId?: string | null;
    companyId: string;
  }>;
  for (const achievement of achievements) {
    if (achievement.projectId !== null && achievement.projectId !== undefined) {
      if (!validProjectIds.has(achievement.projectId)) {
        throw new Error(
          `Integrity violation: Achievement ${achievement.id} references non-existent project ${achievement.projectId}`,
        );
      }
    }
  }
  console.log('✓ All achievement project references are valid');

  // Check 2: All Achievement Companies Match Cyberdyne
  for (const achievement of achievements) {
    if (achievement.companyId !== cyberdyneCompanyId) {
      throw new Error(
        `Integrity violation: Achievement ${achievement.id} has incorrect companyId ${achievement.companyId}`,
      );
    }
  }
  console.log('✓ All achievement company references are valid');

  // Check 3: All Project Companies Match Cyberdyne
  const projectList = data.projects as Array<{ id: string; companyId: string }>;
  for (const project of projectList) {
    if (project.companyId !== cyberdyneCompanyId) {
      throw new Error(
        `Integrity violation: Project ${project.id} has incorrect companyId ${project.companyId}`,
      );
    }
  }
  console.log('✓ All project company references are valid');

  // Check 4: Document Company References Valid
  const documents = data.documents as Array<{
    id: string;
    companyId?: string | null;
  }>;
  for (const document of documents) {
    if (document.companyId !== null && document.companyId !== undefined) {
      if (document.companyId !== cyberdyneCompanyId) {
        throw new Error(
          `Integrity violation: Document ${document.id} has incorrect companyId ${document.companyId}`,
        );
      }
    }
    // Documents with null companyId are valid (personal/unlinked documents)
  }
  console.log('✓ All document company references are valid');
}

function generateSummaryReport(
  inputData: InputData,
  outputData: Record<string, unknown>,
): void {
  const projects = (outputData.projects as unknown[]) || [];
  const achievements = (outputData.achievements as unknown[]) || [];
  const documents = (outputData.documents as unknown[]) || [];

  console.log('');
  console.log('Input Summary:');
  console.log(`  Companies: ${inputData.companies.length}`);
  console.log(`  Projects: ${inputData.projects.length}`);
  console.log(`  Achievements: ${inputData.achievements.length}`);
  console.log(`  Documents: ${inputData.documents.length}`);
  console.log('');
  console.log('Output Summary:');
  console.log(`  Companies: 1 (Cyberdyne)`);
  console.log(
    `  Projects: ${projects.length} (filtered from ${inputData.projects.length})`,
  );
  console.log(
    `  Achievements: ${achievements.length} (filtered from ${inputData.achievements.length})`,
  );
  console.log(
    `  Documents: ${documents.length} (kept from ${inputData.documents.length})`,
  );
  console.log('');
}

async function writeOutputFile(
  data: Record<string, unknown>,
  filepath: string,
): Promise<void> {
  console.log(`Writing output to: ${filepath}`);

  // Convert data to JSON string with 2-space indentation
  const jsonString = JSON.stringify(data, null, 2);

  // Ensure trailing newline
  const jsonWithNewline = `${jsonString}\n`;

  // Write to file
  await fs.writeFile(filepath, jsonWithNewline, 'utf-8');

  console.log('✓ Output file written successfully');
}

async function loadInputData(filepath: string): Promise<unknown> {
  try {
    await fs.access(filepath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(
      `Cannot read input file: ${filepath}. File does not exist or is not readable.`,
    );
  }

  const fileContents = await fs.readFile(filepath, 'utf-8');

  try {
    return JSON.parse(fileContents);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in input file: ${message}`);
  }
}

async function validateInputData(
  data: unknown,
  schema: unknown,
): Promise<InputData> {
  // This will throw ZodError if invalid (caught in main error handler)
  const s = schema as { parse: (data: unknown) => InputData };
  return s.parse(data);
}

function logInputSummary(data: InputData): void {
  console.log(`  Companies: ${data.companies.length}`);
  console.log(`  Projects: ${data.projects.length}`);
  console.log(`  Achievements: ${data.achievements.length}`);
  console.log(`  Documents: ${data.documents.length}`);
}

// Execute
main();
