import { createAI, createStreamableValue } from 'ai/rsc'
import { z } from 'zod'
import { createAchievement, createUserMessage, generatePeriodSummary as queryGeneratePeriodSummary } from './db/queries'
import type { Achievement } from './types/achievement'

// Zod schema for structured achievement extraction
const AchievementSchema = z.object({
  title: z.string().describe('A concise, bullet-list compatible title for the achievement'),
  eventStart: z.string().transform(date => new Date(date)).describe('The start date of the event or achievement'),
  eventEnd: z.string().transform(date => new Date(date)).describe('The end date of the event or achievement'),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']).describe('The duration of the achievement'),
  summary: z.string().nullable().optional().describe('A brief summary of the achievement'),
  details: z.string().optional().describe('Additional details about the achievement'),
  companyId: z.string().nullable().describe('The ID of the company this achievement is associated with (null if not specified)'),
  projectId: z.string().nullable().describe('The ID of the project this achievement is associated with (null if not specified)'),
})

export async function detectAchievementsFromMessage(
  userId: string, 
  originalText: string
) {
  'use server'

  // Create the user message first
  const [userMessage] = await createUserMessage({ 
    userId, 
    originalText 
  })

  // Use AI to generate structured achievement data
  const streamableResult = createStreamableValue<any[]>()

  const generateAchievements = async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `
              You are an expert at detecting professional achievements from text.
              Extract structured information about work accomplishments.
              Return a JSON array of achievements with the following schema:
              {
                "title": string,
                "eventStart": date string (ISO format),
                "eventEnd": date string (ISO format),
                "eventDuration": "day" | "week" | "month" | "quarter" | "half year" | "year",
                "summary": string,
                "details": string (optional),
                "companyId": string | null,
                "projectId": string | null
              }
            `
          },
          {
            role: 'user',
            content: originalText
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to generate achievements: ${response.statusText}`)
    }

    const data = await response.json()
    const achievements = data.choices[0].message.content;

    try {
      const parsedAchievements = JSON.parse(achievements).map((achievement: any) => 
        AchievementSchema.parse(achievement)
      )

      // Create achievements in parallel
      const createdAchievements = await Promise.all(
        parsedAchievements.map((achievement: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => 
          createAchievement({
            ...achievement,
            userId,
            userMessageId: userMessage.id
          })
        )
      )

      streamableResult.update(createdAchievements)
      streamableResult.done()

    } catch (error) {
      console.error('Failed to parse achievements:', error)
      streamableResult.error(error as Error)
    }
  }

  generateAchievements().catch(error => {
    console.error('Failed to generate achievements:', error)
    streamableResult.error(error)
  })

  return streamableResult
}

export async function generatePeriodSummary(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  'use server'

  // Fetch achievements for the period
  const achievements = await queryGeneratePeriodSummary({ 
    userId, 
    startDate, 
    endDate 
  })

  // Use AI to generate a summary
  const streamableResult = createStreamableValue<string>()

  const generateSummary = async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate a professional, concise summary of achievements'
          },
          {
            role: 'user',
            content: achievements.map(achievement => achievement.summary || '').join('\n')
          }
        ]
      })
    })

    const data = await response.json()
    return data.choices[0].message.content || ''
  }

  // Start generating summary
  generateSummary()
    .then(summary => streamableResult.update(summary))
    .catch(error => streamableResult.error(error))
    .finally(() => streamableResult.done())

  return streamableResult.value
}

// Create an AI context for server actions
export const AI = createAI({
  actions: {
    detectAchievementsFromMessage,
    generatePeriodSummary
  }
})