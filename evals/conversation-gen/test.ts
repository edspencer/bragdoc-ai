import { generateTestData } from './generator';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const outputDir = path.join(__dirname, 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate one test case for each template
  const templates = [
    // 'MULTI_COMPANY',
    // 'CAREER_TRANSITION',
    // 'PERSONAL_GROWTH',
    // 'PROJECT_LEAD',
    // 'SIMPLE_ACHIEVEMENT',
    'MULTIPLE_ACHIEVEMENT',
  ] as const;

  for (const template of templates) {
    console.log(`Generating test data for template: ${template}`);
    const testData = await generateTestData(template, 3);

    const outputPath = path.join(outputDir, `${template.toLowerCase()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
    console.log(`Generated test data written to: ${outputPath}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
