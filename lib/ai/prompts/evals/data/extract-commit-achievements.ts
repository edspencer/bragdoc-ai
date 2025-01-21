export const repository = { name: 'bragdoc-ai', path: '/Users/ed/Code/brag-ai' }

//fluffy as in only there are only really about 3 Achievements in this, the other 
//commits are noise
export const noisyCommits = [
  {
    "hash": "1a1c4a5f9c2d1bf7bb6bcee9dd9e294accdc7f7a",
    "message": "extract commit achievements prompt progress",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-16 18:40:13 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "89171ea16837baed2ea37279def1d043af988054",
    "message": "WIP on a bunch of fronts",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-17 18:17:28 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "921510de4b9e027d94b200976901bb64af16c33d",
    "message": "CLI rendering working again",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-20 15:43:02 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "202e9f33b6327cec82e06c041228957451eef419",
    "message": "more faffing with React rendering",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-20 16:12:36 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "0f8ff31c7d0706a1179acb73a4195425504c812a",
    "message": "Getting there with the extracting into an npm package...",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-21 12:48:56 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "351d12c923eafc00bed0c84c7265567497a5ee04",
    "message": "build works again",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-21 14:51:17 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "bc0b808fcd7566d16dd45dc6a2bca50be62e8b6b",
    "message": "cleanup",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-21 15:21:26 -0500",
    "branch": "jsx-prompts"
  },
  {
    "hash": "4bfb09f20d16aaa58a98d61d201e5abe704e1a1d",
    "message": "better achievement extraction evals",
    "author": {
      "name": "Ed Spencer",
      "email": "ed@edspencer.net"
    },
    "date": "2025-01-21 17:10:33 -0500",
    "branch": "jsx-prompts"
  }
]

const lastMidnight = new Date();
lastMidnight.setHours(0, 0, 0, 0);

const nextMidnight = new Date();
nextMidnight.setDate(nextMidnight.getDate() + 1);
nextMidnight.setHours(0, 0, 0, 0);


import { ExtractedAchievement } from '../../types';
import {companies, projects} from './user';

export const expectedAchievementsFromNoisyCommits: ExtractedAchievement[] = [
  {
    summary: 'Restored functionality for CLI rendering.',
    details: 'Restored functionality for CLI rendering in the project.',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Restored functionality for CLI rendering',
    eventDuration: 'day',
    impact: 1,
  },
  {
    summary: 'Fixed issues in the build process',
    details: 'Fixed issues in the build process, ensuring it works correctly again.',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Fixed issues in the build process',
    eventDuration: 'day',
    impact: 2,
  },
  {
    summary: 'Improved the evaluation process for extracting achievements',
    details: 'Improved the evaluation process for extracting achievements in the project.',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Improved the evaluation process for extracting achievements',
    eventDuration: 'day',
    impact: 1,
  },
]

//Most commits contain at least one achievement
export const qualityCommits = [
  {
    hash: 'b7cd21e4669bc46f00104c6dd336c49652d358d8',
    message: 'Added Welcome Carousel',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2024-12-24 09:30:56 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: 'd61616817faeae146ea717953cf6aa8af0eef338',
    message: 'Stripe Integration\n\nBut the webhook is not working yet',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2024-12-29 19:39:26 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: '8457e3f53bbeb2b8d320ab84ea25458139276b68',
    message: 'Marketing stuff',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2024-12-30 17:13:55 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: 'ca0e76a503baece79f7daa96f36e0f08db8d5221',
    message: 'Marketing (#12)\n' +
      '\n' +
      '* Added what/why/how landing pages\n' +
      '\n' +
      '* "What" marketing page\n' +
      '\n' +
      '* "Why" marketing page\n' +
      '\n' +
      '* "How" marketing page\n' +
      '\n' +
      '* linty binty',
        author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2024-12-30 21:41:09 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: '5681fb46ab024f4489edc7d6d20742922cbf9fd0',
    message: 'Beta1 (#13)\n' +
      '\n' +
      '* welcome email\n' +
      '\n' +
      '* welcome email\n' +
      '\n' +
      '* lint\n' +
      '\n' +
      '* Incoming email somewhat working\n' +
      '\n' +
      '* docs\n' +
      '\n' +
      '* final bits\n' +
      '\n' +
      '* Fix stripe kinda\n' +
      '\n' +
      '* test fixes\n' +
      '\n' +
      '* Documents feature reqs\n' +
      '\n' +
      '* WIP on documents CRUD\n' +
      '\n' +
      '* Documents endpoints\n' +
      '\n' +
      '* Documents API tests\n' +
      '\n' +
      '* nav badges\n' +
      '\n' +
      '* UI consistency\n' +
      '\n' +
      '* lint',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2025-01-05 09:29:53 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: 'fb2c85c6eb4204f2ef738b453f32cb1733d21393',
    message: 'Beta cleanup\n' +
      '\n' +
      '* cleanup\n' +
      '\n' +
      '* better empty chat page\n' +
      '\n' +
      '* little fixes\n' +
      '\n' +
      '* Evals working again',
        author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2025-01-06 15:48:56 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: 'c4020405b1e6aac3125e650c115e8962ac508221',
    message: 'Beta3 (#15)\n' +
      '\n' +
      '* fix calendars in modals\n' +
      '\n' +
      '* better company page date picker\n' +
      '\n' +
      '* more date picker fixes\n' +
      '\n' +
      '* Fix plan selection issue\n' +
      '\n' +
      '* remove lies from marketing pages\n' +
      '\n' +
      '* beta banner\n' +
      '\n' +
      '* bump nextjs\n' +
      '\n' +
      '* lint\n' +
      '\n' +
      '* eval improvements',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2025-01-06 19:33:34 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: '1e9bd5ee7682d3095b16502547824f7d9dabedc4',
    message: 'Beta4 - mobile UX improvements (#16)',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2025-01-07 12:39:02 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: 'bf66c97157517fd789401bdbd0e4d5530096d123',
    message: 'Welcome emails and images',
    author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2025-01-07 16:23:36 -0500',
    branch: 'jsx-prompts'
  },
  {
    hash: '9b2a95e1ce332af788c93ad1cc3fb21f1863c8cd',
    message: 'Bug bashing (#18)\n' +
      '\n' +
      '* Plan picker mobile UX\n' +
      '\n' +
      '* hide side nav on click on mobile devices\n' +
      '\n' +
      '* dark mode tweaks\n' +
      '\n' +
      '* generate prod stripe webhook\n' +
      '\n' +
      '* redirect to welcome page after email/pass register\n' +
      '\n' +
      '* hide broken images on home page\n' +
      '\n' +
      '* CI tests db name',
        author: {
      name: "Ed Spencer",
      email: "ed@edspencer.net"
    },
    date: '2025-01-08 19:08:06 -0500',
    branch: 'jsx-prompts'
  }
]

export const expectedAchievementsFromQualityCommits: ExtractedAchievement[] = [
  {
    summary: 'Implemented a new welcome carousel feature.',
    details: 'Implemented a new welcome carousel feature in the project.',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Implemented a new welcome carousel feature',
    eventDuration: 'day',
    impact: 1,
  },
  {
    summary: 'Integrated Stripe for payment processing, though webhook issues remain',
    details: 'Integrated Stripe for payment processing, though webhook issues remain',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Integrated Stripe for payment processing',
    eventDuration: 'day',
    impact: 2,
  },
  {
    summary: 'Created What, Why, and How marketing landing pages.',
    details: 'Created What, Why, and How marketing landing pages.',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Created What, Why, and How marketing landing pages',
    eventDuration: 'day',
    impact: 1,
  },
  {
    summary: 'Beta1 release including welcome email, document CRUD, and Stripe fixes.',
    details: 'Beta1 release including welcome email, document CRUD, and Stripe fixes.',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Beta1 release including welcome email, document CRUD, and Stripe fixes',
    eventDuration: 'day',
    impact: 1,
  },
  {
    summary: 'Cleanup and minor fixes in Beta version, including evals functionality',
    details: 'Cleanup and minor fixes in Beta version, including evals functionality',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Cleanup and minor fixes in Beta version',
    eventDuration: 'day',
    impact: 2,
  },
  {
    summary: 'Enhanced mobile user experience in Beta4 release',
    details: 'Enhanced mobile user experience in Beta4 release',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Enhanced mobile user experience in Beta4 release',
    eventDuration: 'day',
    impact: 2,
  },
  {
    summary: 'Improved mobile UX and added dark mode',
    details: 'Bug bashing session to improve mobile UX and dark mode',
    eventStart: lastMidnight,
    eventEnd: nextMidnight,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    companyId: companies[0].id,
    projectId: projects[0].id,
    title: 'Improved mobile UX and added dark mode',
    eventDuration: 'day',
    impact: 1,
  },
];