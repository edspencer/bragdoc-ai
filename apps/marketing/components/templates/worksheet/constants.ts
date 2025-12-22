import type { WorksheetFormData } from './types';

export const STORAGE_KEY = 'bragdoc-year-review-2025';
export const DEBOUNCE_DELAY = 500;
export const PDF_FILENAME = 'year-review-2025.pdf';

/**
 * Initial empty form data structure
 */
export const EMPTY_FORM_DATA: WorksheetFormData = {
  codeFeatures: {
    majorProjects: {
      projectName: '',
      whenShipped: '',
      yourRole: '',
      businessContext: '',
      measurableImpact: '',
      evidencePRs: '',
    },
    bugFixes: {
      bugDescription: '',
      impactScope: '',
      resolutionTime: '',
      preventionSteps: '',
    },
    technicalImprovements: {
      whatImproved: '',
      metricsBeforeAfter: '',
      businessValue: '',
    },
  },
  reliabilityDebugging: {
    criticalIncidents: {
      incidentDescription: '',
      date: '',
      yourRole: '',
      resolutionTime: '',
      impactPrevented: '',
      permanentFix: '',
    },
    proactiveReliability: {
      whatYouDid: '',
      result: '',
      teamImpact: '',
    },
    onCallPerformance: {
      duration: '',
      incidentsHandled: '',
      avgResolutionTime: '',
      qualityMetric: '',
    },
  },
  mentoringKnowledge: {
    directMentoring: {
      personMentored: '',
      duration: '',
      skillsTaught: '',
      theirOutcome: '',
      timeCommitment: '',
    },
    codeReviews: {
      prsReviewed: '',
      qualityContribution: '',
      notableImpact: '',
    },
    documentation: {
      whatYouCreated: '',
      adoption: '',
      onboardingImpact: '',
    },
  },
  architectureDecisions: {
    majorDesignDecisions: {
      decision: '',
      context: '',
      optionsConsidered: '',
      yourRole: '',
      outcome: '',
      longTermImpact: '',
    },
    technicalStrategy: {
      area: '',
      beforeState: '',
      yourProposal: '',
      currentState: '',
      impact: '',
    },
    debtReduction: {
      what: '',
      scope: '',
      benefit: '',
      teamEnablement: '',
    },
  },
  processImprovements: {
    devToolsInfrastructure: {
      whatImproved: '',
      before: '',
      after: '',
      timeSaved: '',
      teamImpact: '',
    },
    testingQuality: {
      what: '',
      coverageImprovement: '',
      frictionReduced: '',
      qualityImpact: '',
    },
    processStreamlining: {
      process: '',
      howImproved: '',
      outcome: '',
      adoption: '',
    },
  },
  crossFunctional: {
    productCollaboration: {
      project: '',
      yourTechnicalRole: '',
      businessOutcome: '',
      result: '',
    },
    designUXCollaboration: {
      what: '',
      technicalContribution: '',
      outcome: '',
    },
    salesCustomerSuccess: {
      supportProvided: '',
      dealsInfluenced: '',
      customerValue: '',
    },
    leadershipStrategy: {
      what: '',
      scope: '',
      outcome: '',
    },
  },
};
