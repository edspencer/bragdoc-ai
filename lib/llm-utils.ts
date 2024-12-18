import { createAI, createStreamableValue } from 'ai/rsc'
import { z } from 'zod'
import { createBrag, createUserMessage, generatePeriodSummary as queryGeneratePeriodSummary } from './db/queries'

// Zod schema for structured brag extraction
const BragSchema = z.object({
  title: z.string().describe('A concise, bullet-list compatible title for the achievement'),
  eventStart: z.string().transform(date => new Date(date)).describe('The start date of the event or achievement'),
  eventEnd: z.string().transform(date => new Date(date)).describe('The end date of the event or achievement'),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']).describe('The duration of the achievement'),
  summary: z.string().describe('A brief summary of the achievement'),
  details: z.string().optional().describe('Additional details about the achievement'),
  companyId: z.string().nullable().describe('The ID of the company this achievement is associated with (null if not specified)'),
  projectId: z.string().nullable().describe('The ID of the project this achievement is associated with (null if not specified)'),
})

export async function detectBragsFromMessage(
  userId: string, 
  originalText: string
) {
  'use server'

  // Create the user message first
  const [userMessage] = await createUserMessage({ 
    userId, 
    originalText 
  })

  // Use AI to generate structured brag data
  const streamableResult = createStreamableValue<any[]>()

  const generateBrags = async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
                "eventDuration": "day"|"week"|"month"|"quarter"|"half year"|"year",
                "summary": string,
                "details"?: string
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

    const data = await response.json()
    const bragsData = JSON.parse(data.choices[0].message.content || '[]')
    
    // Validate and create brags
    const validatedBrags = z.array(BragSchema).parse(bragsData)
    
    const createdBrags = await Promise.all(
      validatedBrags.map(bragData => 
        createBrag({
          userId,
          userMessageId: userMessage.id,
          ...bragData,
          // Ensure dates are converted correctly
          eventStart: bragData.eventStart,
          eventEnd: bragData.eventEnd,
        })
      )
    )

    return createdBrags
  }

  // Start generating brags
  generateBrags()
    .then(brags => streamableResult.update(brags))
    .catch(error => streamableResult.error(error))
    .finally(() => streamableResult.done())

  return streamableResult.value
}

export async function generatePeriodSummary(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  'use server'

  // Fetch brags for the period
  const brags = await queryGeneratePeriodSummary({ 
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Generate a professional, concise summary of achievements'
          },
          {
            role: 'user',
            content: brags.map(brag => brag.summary || '').join('\n')
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
    detectBragsFromMessage,
    generatePeriodSummary
  }
})