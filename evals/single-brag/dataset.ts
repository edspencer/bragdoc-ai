import { Conversation } from '../types';

export const singleBragExamples: Conversation[] = [
  {
    description: "Direct achievement with metrics",
    input: "Just deployed our new caching layer, reduced API latency by 45%",
    chat_history: [],
    expected: {
      brag: {
        title: "Deployed Caching Layer with 45% Performance Improvement",
        summary: "Implemented and deployed a new caching system that reduced API latency by 45%",
        details: "Led the implementation of a new caching layer for the API infrastructure, resulting in a significant 45% reduction in overall latency. This improvement directly impacts all API consumers and improves the user experience across all our services.",
        eventStart: new Date(),
        eventEnd: new Date(),
        eventDuration: "day"
      },
      response: "That's a significant achievement! I've recorded your deployment of the caching layer and the impressive 45% reduction in API latency. Would you like to add any details about the implementation process or the impact on user experience?"
    }
  },
  {
    description: "Casual mention of achievement",
    input: "Hey, wanted to mention I got that data migration script working finally",
    chat_history: [],
    expected: {
      brag: {
        title: "Successfully Completed Data Migration Script",
        summary: "Developed and successfully executed a data migration script",
        details: "Completed the development and testing of a data migration script, overcoming previous challenges to ensure successful data transfer. This achievement demonstrates problem-solving skills and persistence in addressing complex data management tasks.",
        eventStart: new Date(),
        eventEnd: new Date(),
        eventDuration: "day"
      },
      response: "Great work on completing the data migration script! That's definitely worth recording. Could you tell me more about what challenges you overcame or the impact this will have?"
    }
  },
  {
    description: "Team leadership achievement",
    input: "Just finished leading the team through our first successful microservices deployment",
    chat_history: [],
    expected: {
      brag: {
        title: "Led Team's First Successful Microservices Deployment",
        summary: "Successfully led team through initial microservices architecture deployment",
        details: "Provided leadership and technical guidance to the team in executing our first microservices deployment. This milestone represents a significant shift in our architecture and demonstrates ability to lead technical transitions while managing team dynamics.",
        eventStart: new Date(),
        eventEnd: new Date(),
        eventDuration: "week"
      },
      response: "Congratulations on this significant milestone! Leading a team through a microservices deployment is a substantial achievement. I'd love to know more about the scope of the deployment and how you helped the team navigate this transition."
    }
  }
];
