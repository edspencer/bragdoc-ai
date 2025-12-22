/**
 * TypeScript interfaces for the Year Review Worksheet form data.
 * Each section maps to a top-level key, with nested objects for field groups.
 */

// Individual field group interfaces for each section
// All interfaces include index signature for compatibility with FieldGroupValues

export interface MajorProjectsFields {
  [key: string]: string;
  projectName: string;
  whenShipped: string;
  yourRole: string;
  businessContext: string;
  measurableImpact: string;
  evidencePRs: string;
}

export interface BugFixesFields {
  [key: string]: string;
  bugDescription: string;
  impactScope: string;
  resolutionTime: string;
  preventionSteps: string;
}

export interface TechnicalImprovementsFields {
  [key: string]: string;
  whatImproved: string;
  metricsBeforeAfter: string;
  businessValue: string;
}

export interface CodeFeaturesSection {
  majorProjects: MajorProjectsFields;
  bugFixes: BugFixesFields;
  technicalImprovements: TechnicalImprovementsFields;
}

export interface CriticalIncidentsFields {
  [key: string]: string;
  incidentDescription: string;
  date: string;
  yourRole: string;
  resolutionTime: string;
  impactPrevented: string;
  permanentFix: string;
}

export interface ProactiveReliabilityFields {
  [key: string]: string;
  whatYouDid: string;
  result: string;
  teamImpact: string;
}

export interface OnCallPerformanceFields {
  [key: string]: string;
  duration: string;
  incidentsHandled: string;
  avgResolutionTime: string;
  qualityMetric: string;
}

export interface ReliabilityDebuggingSection {
  criticalIncidents: CriticalIncidentsFields;
  proactiveReliability: ProactiveReliabilityFields;
  onCallPerformance: OnCallPerformanceFields;
}

export interface DirectMentoringFields {
  [key: string]: string;
  personMentored: string;
  duration: string;
  skillsTaught: string;
  theirOutcome: string;
  timeCommitment: string;
}

export interface CodeReviewsFields {
  [key: string]: string;
  prsReviewed: string;
  qualityContribution: string;
  notableImpact: string;
}

export interface DocumentationFields {
  [key: string]: string;
  whatYouCreated: string;
  adoption: string;
  onboardingImpact: string;
}

export interface MentoringKnowledgeSection {
  directMentoring: DirectMentoringFields;
  codeReviews: CodeReviewsFields;
  documentation: DocumentationFields;
}

export interface MajorDesignDecisionsFields {
  [key: string]: string;
  decision: string;
  context: string;
  optionsConsidered: string;
  yourRole: string;
  outcome: string;
  longTermImpact: string;
}

export interface TechnicalStrategyFields {
  [key: string]: string;
  area: string;
  beforeState: string;
  yourProposal: string;
  currentState: string;
  impact: string;
}

export interface DebtReductionFields {
  [key: string]: string;
  what: string;
  scope: string;
  benefit: string;
  teamEnablement: string;
}

export interface ArchitectureDecisionsSection {
  majorDesignDecisions: MajorDesignDecisionsFields;
  technicalStrategy: TechnicalStrategyFields;
  debtReduction: DebtReductionFields;
}

export interface DevToolsInfrastructureFields {
  [key: string]: string;
  whatImproved: string;
  before: string;
  after: string;
  timeSaved: string;
  teamImpact: string;
}

export interface TestingQualityFields {
  [key: string]: string;
  what: string;
  coverageImprovement: string;
  frictionReduced: string;
  qualityImpact: string;
}

export interface ProcessStreamliningFields {
  [key: string]: string;
  process: string;
  howImproved: string;
  outcome: string;
  adoption: string;
}

export interface ProcessImprovementsSection {
  devToolsInfrastructure: DevToolsInfrastructureFields;
  testingQuality: TestingQualityFields;
  processStreamlining: ProcessStreamliningFields;
}

export interface ProductCollaborationFields {
  [key: string]: string;
  project: string;
  yourTechnicalRole: string;
  businessOutcome: string;
  result: string;
}

export interface DesignUXCollaborationFields {
  [key: string]: string;
  what: string;
  technicalContribution: string;
  outcome: string;
}

export interface SalesCustomerSuccessFields {
  [key: string]: string;
  supportProvided: string;
  dealsInfluenced: string;
  customerValue: string;
}

export interface LeadershipStrategyFields {
  [key: string]: string;
  what: string;
  scope: string;
  outcome: string;
}

export interface CrossFunctionalSection {
  productCollaboration: ProductCollaborationFields;
  designUXCollaboration: DesignUXCollaborationFields;
  salesCustomerSuccess: SalesCustomerSuccessFields;
  leadershipStrategy: LeadershipStrategyFields;
}

/**
 * Complete form data structure representing all 6 sections
 * of the Year Review Worksheet
 */
export interface WorksheetFormData {
  codeFeatures: CodeFeaturesSection;
  reliabilityDebugging: ReliabilityDebuggingSection;
  mentoringKnowledge: MentoringKnowledgeSection;
  architectureDecisions: ArchitectureDecisionsSection;
  processImprovements: ProcessImprovementsSection;
  crossFunctional: CrossFunctionalSection;
}

/**
 * Return type for the useWorksheetStorage hook
 */
export interface UseWorksheetStorageReturn {
  formData: WorksheetFormData;
  updateField: (fieldPath: string, value: string) => void;
  clearAll: () => void;
  lastSaved: Date | null;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
}

/**
 * Field configuration for rendering editable field groups
 */
export interface FieldConfig {
  key: string;
  label: string;
}

/**
 * Base type for all field groups - allows specific field types to be used
 * while maintaining compatibility with Record<string, string>
 */
export type FieldGroupValues = {
  [key: string]: string;
};

/**
 * Props for the editable FieldGroup component
 */
export interface EditableFieldGroupProps {
  title: string;
  fields: FieldConfig[];
  sectionKey: string;
  groupKey: string;
  values: FieldGroupValues;
  onChange: (fieldPath: string, value: string) => void;
}
