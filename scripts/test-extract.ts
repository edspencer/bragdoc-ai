import { extractAchievements, ExtractAchievementsInput } from "@/lib/ai/extract";

const input: ExtractAchievementsInput = {
    input: `
Achievements today:

- Fixed up the way we show new brags in the chat UI
- Save brags to the database
- Initial summary document generation working
- Got streaming doc generation working

Achievements November 2024:

- Created helpmefind.ai repo
- Created the react-auto-intl repo
- Created the react-auto-intl doc site
- Began work on the bragdoc.ai UI`,
    chat_history: [],
    context: {
      companies: [
        {
          id: 'e6a9a05c-4c8e-46a5-9a9f-3c9f5c68f6eb',
          name: 'Palo Alto Networks',
          role: 'Software Engineer',
          startDate: new Date('2022-01-01'),
          endDate: new Date('2023-01-01')
        }
      ],
      projects: [
        {
          id: 'd36f2c4e-72d3-4a29-8e4e-1a7a3bca5f1e',
          name: 'Project A',
          description: 'Description of Project A',
          startDate: new Date('2022-01-01'),
          endDate: new Date('2023-01-01'),
          companyId: 'e6a9a05c-4c8e-46a5-9a9f-3c9f5c68f6eb'
        }
      ],
    },
};

async function main() {
  const achievements = [];

  for await (const result of extractAchievements(input)) {
    console.log(result);
    achievements.push(result);
  }

  console.log('done')
  console.log(achievements.length)
} 

main().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});