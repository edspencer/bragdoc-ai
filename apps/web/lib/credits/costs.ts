/**
 * Credit Costs Configuration
 *
 * Centralized credit cost definitions for all LLM-powered features.
 * Update costs here to adjust pricing across the entire application.
 */

export const CREDIT_COSTS = {
  document_generation: {
    weekly_report: 1,
    performance_review: 2,
    brag_doc: 2,
  },
  workstream_clustering: 2,
  chat_tool_call: 1,
} as const;

/**
 * Document types that consume credits
 */
export type DocumentType = keyof typeof CREDIT_COSTS.document_generation;

/**
 * Get the credit cost for a specific document type
 *
 * @param documentType - The type of document being generated
 * @returns The number of credits required
 */
export function getDocumentCost(documentType: DocumentType): number {
  return CREDIT_COSTS.document_generation[documentType];
}
