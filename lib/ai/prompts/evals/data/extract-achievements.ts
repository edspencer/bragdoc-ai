import { LLMExtractedAchievement } from "../../types";

//a few examples that we feed in as part of the prompt.
export const examples: LLMExtractedAchievement[] = [
  {
    eventStart: '2024-06-15',
    eventEnd: '2024-09-15',
    eventDuration: 'quarter',
    title: 'Launched AI Analysis Tool with 95% Accuracy at Quantum Nexus',
    summary:
      "Developed an AI tool for real-time data analysis with 95% accuracy for Quantum Nexus, playing a pivotal role in Project Orion's success.",
    details:
      "As part of Project Orion at Quantum Nexus, I was responsible for developing a cutting-edge AI tool focused on real-time data analysis. By implementing advanced algorithms and enhancing the training data sets, the tool reached a 95% accuracy rate. This result significantly supported the company's research objectives and has been positively acknowledged by stakeholders for its robust performance and reliability.",
    companyId: 'e3856e75-37cf-4640-afd9-e73a53fa967d',
    projectId: '3923129e-719b-4f99-8487-9830cf64ad5d',
    impact: 2,
  },
  {
    eventStart: '2024-08-01',
    eventEnd: '2024-11-30',
    eventDuration: 'quarter',
    title: 'Implemented Scalable Quantum Infrastructure at Quantum Nexus',
    summary:
      'Built a scalable quantum computing infrastructure for Quantum Nexus, boosting computational efficiency by 200% over 4 months.',
    details:
      'During my work on Quantum Leap, I led the design and development of a new scalable infrastructure for quantum computing simulations at Quantum Nexus. This involved optimizing resource allocation and network latency reduction strategies. As a result, the computational efficiency increased by 200%, enhancing the simulation capabilities and supporting cutting-edge research.',
    companyId: 'e3856e75-37cf-4640-afd9-e73a53fa967d',
    projectId: '84451830-87ea-4453-b341-40600c1febe0',
    impact: 2,
  },
  {
    eventStart: '2024-12-01',
    eventEnd: '2025-05-10',
    eventDuration: 'half year',
    title: 'Developed Innovation Platform with 99% Uptime at InnovateHub',
    summary:
      'Created an innovation management platform with 99% uptime for InnovateHub, significantly enhancing operational functionality over 5 months.',
    details:
      'At InnovateHub, I contributed to the Innovation Pathway project by engineering a new platform for innovation management. Focusing on architecture stability and high availability, I ensured that the system maintained a 99% uptime. This platform empowered users with better management tools and contributed to fostering a more innovative work environment.',
    companyId: 'b1811fbb-5768-4cb8-9faf-66d0fab08f36',
    projectId: '55526e8d-3b6b-4a9b-8ba6-3f3a3681d894',
    impact: 2,
  },
];