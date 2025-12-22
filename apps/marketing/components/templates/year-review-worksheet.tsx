'use client';

import { useState } from 'react';
import {
  Code,
  Bug,
  Users,
  Lightbulb,
  Settings,
  Handshake,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ClearDialog,
  EditableFieldGroup,
  SaveStatus,
  useWorksheetStorage,
  PDF_FILENAME,
  type FieldConfig,
} from './worksheet';

// ============================================================================
// Field Configurations
// ============================================================================

// Section 1: Code & Features
const MAJOR_PROJECTS_FIELDS: FieldConfig[] = [
  { key: 'projectName', label: 'Project name' },
  { key: 'whenShipped', label: 'When shipped' },
  { key: 'yourRole', label: 'Your role' },
  { key: 'businessContext', label: 'Business context' },
  { key: 'measurableImpact', label: 'Measurable impact' },
  { key: 'evidencePRs', label: 'Evidence (PRs)' },
];

const BUG_FIXES_FIELDS: FieldConfig[] = [
  { key: 'bugDescription', label: 'Bug description' },
  { key: 'impactScope', label: 'Impact scope' },
  { key: 'resolutionTime', label: 'Resolution time' },
  { key: 'preventionSteps', label: 'Prevention steps' },
];

const TECHNICAL_IMPROVEMENTS_FIELDS: FieldConfig[] = [
  { key: 'whatImproved', label: 'What improved' },
  { key: 'metricsBeforeAfter', label: 'Metrics before/after' },
  { key: 'businessValue', label: 'Business value' },
];

// Section 2: Reliability & Debugging
const CRITICAL_INCIDENTS_FIELDS: FieldConfig[] = [
  { key: 'incidentDescription', label: 'Incident description' },
  { key: 'date', label: 'Date' },
  { key: 'yourRole', label: 'Your role' },
  { key: 'resolutionTime', label: 'Resolution time' },
  { key: 'impactPrevented', label: 'Impact prevented' },
  { key: 'permanentFix', label: 'Permanent fix' },
];

const PROACTIVE_RELIABILITY_FIELDS: FieldConfig[] = [
  { key: 'whatYouDid', label: 'What you did' },
  { key: 'result', label: 'Result' },
  { key: 'teamImpact', label: 'Team impact' },
];

const ON_CALL_PERFORMANCE_FIELDS: FieldConfig[] = [
  { key: 'duration', label: 'Duration' },
  { key: 'incidentsHandled', label: 'Incidents handled' },
  { key: 'avgResolutionTime', label: 'Avg resolution time' },
  { key: 'qualityMetric', label: 'Quality metric' },
];

// Section 3: Mentoring & Knowledge Sharing
const DIRECT_MENTORING_FIELDS: FieldConfig[] = [
  { key: 'personMentored', label: 'Person mentored' },
  { key: 'duration', label: 'Duration' },
  { key: 'skillsTaught', label: 'Skills taught' },
  { key: 'theirOutcome', label: 'Their outcome' },
  { key: 'timeCommitment', label: 'Time commitment' },
];

const CODE_REVIEWS_FIELDS: FieldConfig[] = [
  { key: 'prsReviewed', label: 'PRs reviewed' },
  { key: 'qualityContribution', label: 'Quality contribution' },
  { key: 'notableImpact', label: 'Notable impact' },
];

const DOCUMENTATION_FIELDS: FieldConfig[] = [
  { key: 'whatYouCreated', label: 'What you created' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'onboardingImpact', label: 'Onboarding impact' },
];

// Section 4: Architecture & Technical Decisions
const MAJOR_DESIGN_DECISIONS_FIELDS: FieldConfig[] = [
  { key: 'decision', label: 'Decision' },
  { key: 'context', label: 'Context' },
  { key: 'optionsConsidered', label: 'Options considered' },
  { key: 'yourRole', label: 'Your role' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'longTermImpact', label: 'Long-term impact' },
];

const TECHNICAL_STRATEGY_FIELDS: FieldConfig[] = [
  { key: 'area', label: 'Area' },
  { key: 'beforeState', label: 'Before state' },
  { key: 'yourProposal', label: 'Your proposal' },
  { key: 'currentState', label: 'Current state' },
  { key: 'impact', label: 'Impact' },
];

const DEBT_REDUCTION_FIELDS: FieldConfig[] = [
  { key: 'what', label: 'What' },
  { key: 'scope', label: 'Scope' },
  { key: 'benefit', label: 'Benefit' },
  { key: 'teamEnablement', label: 'Team enablement' },
];

// Section 5: Process Improvements
const DEV_TOOLS_INFRASTRUCTURE_FIELDS: FieldConfig[] = [
  { key: 'whatImproved', label: 'What improved' },
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
  { key: 'timeSaved', label: 'Time saved' },
  { key: 'teamImpact', label: 'Team impact' },
];

const TESTING_QUALITY_FIELDS: FieldConfig[] = [
  { key: 'what', label: 'What' },
  { key: 'coverageImprovement', label: 'Coverage improvement' },
  { key: 'frictionReduced', label: 'Friction reduced' },
  { key: 'qualityImpact', label: 'Quality impact' },
];

const PROCESS_STREAMLINING_FIELDS: FieldConfig[] = [
  { key: 'process', label: 'Process' },
  { key: 'howImproved', label: 'How improved' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'adoption', label: 'Adoption' },
];

// Section 6: Cross-Functional Collaboration
const PRODUCT_COLLABORATION_FIELDS: FieldConfig[] = [
  { key: 'project', label: 'Project' },
  { key: 'yourTechnicalRole', label: 'Your technical role' },
  { key: 'businessOutcome', label: 'Business outcome' },
  { key: 'result', label: 'Result' },
];

const DESIGN_UX_COLLABORATION_FIELDS: FieldConfig[] = [
  { key: 'what', label: 'What' },
  { key: 'technicalContribution', label: 'Technical contribution' },
  { key: 'outcome', label: 'Outcome' },
];

const SALES_CUSTOMER_SUCCESS_FIELDS: FieldConfig[] = [
  { key: 'supportProvided', label: 'Support provided' },
  { key: 'dealsInfluenced', label: 'Deals influenced' },
  { key: 'customerValue', label: 'Customer value' },
];

const LEADERSHIP_STRATEGY_FIELDS: FieldConfig[] = [
  { key: 'what', label: 'What' },
  { key: 'scope', label: 'Scope' },
  { key: 'outcome', label: 'Outcome' },
];

interface SectionProps {
  number: number;
  title: string;
  subtitle: string;
  prompt: string;
  icon: React.ReactNode;
  bgClass: string;
  children: React.ReactNode;
}

function Section({
  number,
  title,
  subtitle,
  prompt,
  icon,
  bgClass,
  children,
}: SectionProps) {
  return (
    <section
      className={`${bgClass} rounded-xl p-6 md:p-8 print:rounded-none print:p-6 print:break-inside-avoid`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/80 dark:bg-black/20 print:bg-white flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-200 print:text-gray-700 print:border print:border-gray-300">
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-600 dark:text-gray-300 print:text-gray-600">
              {icon}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white print:text-gray-800">
              {title}
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 print:text-gray-600 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-white/50 dark:bg-black/10 print:bg-gray-100 rounded-lg border border-white/50 dark:border-white/10 print:border-gray-200">
        <p className="text-sm text-gray-700 dark:text-gray-200 print:text-gray-700 italic">
          <strong>Prompt:</strong> {prompt}
        </p>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex w-6 h-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-sm print:border print:border-blue-600">
        B
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 print:text-gray-700">
        BragDoc.ai
      </span>
    </div>
  );
}

export function YearReviewWorksheet() {
  const { formData, updateField, clearAll, lastSaved, isSaving, saveError } =
    useWorksheetStorage();

  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Lazy load PDF generation for bundle optimization
      const { generateWorksheetPdf, downloadPdf } = await import(
        '@/lib/pdf/generate-worksheet-pdf'
      );
      const pdfBytes = await generateWorksheetPdf(formData);
      downloadPdf(pdfBytes, PDF_FILENAME);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast({
        title: 'PDF generation failed',
        description:
          'Please try again or use the browser print function (Ctrl/Cmd + P).',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white">
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-before {
            break-before: page;
          }
        }
      `}</style>

      {/* Header - hidden in print */}
      <div className="no-print sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <SaveStatus
              lastSaved={lastSaved}
              isSaving={isSaving}
              saveError={saveError}
            />
            <ClearDialog onConfirm={clearAll} />
            <Button
              onClick={handleDownloadPdf}
              variant="default"
              size="sm"
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:px-0 print:py-0 print:max-w-none">
        {/* Title page / Intro */}
        <div className="text-center mb-8 print:mb-6 print:pt-4">
          <div className="hidden print:flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white print:text-gray-900 mb-3">
            2025 Year in Review
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 print:text-gray-600 mb-2">
            Developer Achievement Worksheet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 max-w-2xl mx-auto">
            Document your 2025 achievements across six types of developer
            impact. Do it while your accomplishments are fresh. Auto-saves to
            local storage.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6 print:space-y-4">
          {/* Section 1: Code & Features */}
          <Section
            number={1}
            title="Code & Features"
            subtitle="What You Shipped"
            prompt="What problems did you solve? What features made it to production? What bugs did you fix that mattered?"
            icon={<Code className="w-5 h-5" />}
            bgClass="bg-blue-50 dark:bg-blue-950/30 print:bg-blue-50"
          >
            <EditableFieldGroup
              title="Major Projects"
              fields={MAJOR_PROJECTS_FIELDS}
              sectionKey="codeFeatures"
              groupKey="majorProjects"
              values={formData.codeFeatures.majorProjects}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Important Bug Fixes"
              fields={BUG_FIXES_FIELDS}
              sectionKey="codeFeatures"
              groupKey="bugFixes"
              values={formData.codeFeatures.bugFixes}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Technical Improvements"
              fields={TECHNICAL_IMPROVEMENTS_FIELDS}
              sectionKey="codeFeatures"
              groupKey="technicalImprovements"
              values={formData.codeFeatures.technicalImprovements}
              onChange={updateField}
            />
          </Section>

          {/* Section 2: Reliability & Debugging */}
          <Section
            number={2}
            title="Reliability & Debugging"
            subtitle="Keeping Things Running"
            prompt="What production issues did you handle? How did you keep systems stable?"
            icon={<Bug className="w-5 h-5" />}
            bgClass="bg-amber-50 dark:bg-amber-950/30 print:bg-amber-50"
          >
            <EditableFieldGroup
              title="Critical Incidents"
              fields={CRITICAL_INCIDENTS_FIELDS}
              sectionKey="reliabilityDebugging"
              groupKey="criticalIncidents"
              values={formData.reliabilityDebugging.criticalIncidents}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Proactive Reliability Work"
              fields={PROACTIVE_RELIABILITY_FIELDS}
              sectionKey="reliabilityDebugging"
              groupKey="proactiveReliability"
              values={formData.reliabilityDebugging.proactiveReliability}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="On-Call Performance"
              fields={ON_CALL_PERFORMANCE_FIELDS}
              sectionKey="reliabilityDebugging"
              groupKey="onCallPerformance"
              values={formData.reliabilityDebugging.onCallPerformance}
              onChange={updateField}
            />
          </Section>

          {/* Page break after section 2 for print */}
          <div className="hidden print:block print-break-before" />
          <div className="hidden print:flex justify-end py-2">
            <Logo />
          </div>

          {/* Section 3: Mentoring & Knowledge Sharing */}
          <Section
            number={3}
            title="Mentoring & Knowledge Sharing"
            subtitle="Teaching Others"
            prompt="Who did you help grow? What knowledge did you share?"
            icon={<Users className="w-5 h-5" />}
            bgClass="bg-green-50 dark:bg-green-950/30 print:bg-green-50"
          >
            <EditableFieldGroup
              title="Direct Mentoring"
              fields={DIRECT_MENTORING_FIELDS}
              sectionKey="mentoringKnowledge"
              groupKey="directMentoring"
              values={formData.mentoringKnowledge.directMentoring}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Code Reviews"
              fields={CODE_REVIEWS_FIELDS}
              sectionKey="mentoringKnowledge"
              groupKey="codeReviews"
              values={formData.mentoringKnowledge.codeReviews}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Documentation & Knowledge Sharing"
              fields={DOCUMENTATION_FIELDS}
              sectionKey="mentoringKnowledge"
              groupKey="documentation"
              values={formData.mentoringKnowledge.documentation}
              onChange={updateField}
            />
          </Section>

          {/* Section 4: Architecture & Technical Decisions */}
          <Section
            number={4}
            title="Architecture & Technical Decisions"
            subtitle="Shaping the System"
            prompt="What big technical decisions did you influence? What systems did you design?"
            icon={<Lightbulb className="w-5 h-5" />}
            bgClass="bg-purple-50 dark:bg-purple-950/30 print:bg-purple-50"
          >
            <EditableFieldGroup
              title="Major Design Decisions"
              fields={MAJOR_DESIGN_DECISIONS_FIELDS}
              sectionKey="architectureDecisions"
              groupKey="majorDesignDecisions"
              values={formData.architectureDecisions.majorDesignDecisions}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Technical Strategy"
              fields={TECHNICAL_STRATEGY_FIELDS}
              sectionKey="architectureDecisions"
              groupKey="technicalStrategy"
              values={formData.architectureDecisions.technicalStrategy}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Debt Reduction & Refactoring"
              fields={DEBT_REDUCTION_FIELDS}
              sectionKey="architectureDecisions"
              groupKey="debtReduction"
              values={formData.architectureDecisions.debtReduction}
              onChange={updateField}
            />
          </Section>

          {/* Page break after section 4 for print */}
          <div className="hidden print:block print-break-before" />
          <div className="hidden print:flex justify-end py-2">
            <Logo />
          </div>

          {/* Section 5: Process Improvements */}
          <Section
            number={5}
            title="Process Improvements"
            subtitle="Reducing Friction"
            prompt="What made your team's work easier? What time did you save?"
            icon={<Settings className="w-5 h-5" />}
            bgClass="bg-rose-50 dark:bg-rose-950/30 print:bg-rose-50"
          >
            <EditableFieldGroup
              title="Development Tools & Infrastructure"
              fields={DEV_TOOLS_INFRASTRUCTURE_FIELDS}
              sectionKey="processImprovements"
              groupKey="devToolsInfrastructure"
              values={formData.processImprovements.devToolsInfrastructure}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Testing & Quality Infrastructure"
              fields={TESTING_QUALITY_FIELDS}
              sectionKey="processImprovements"
              groupKey="testingQuality"
              values={formData.processImprovements.testingQuality}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Process Streamlining"
              fields={PROCESS_STREAMLINING_FIELDS}
              sectionKey="processImprovements"
              groupKey="processStreamlining"
              values={formData.processImprovements.processStreamlining}
              onChange={updateField}
            />
          </Section>

          {/* Section 6: Cross-Functional Collaboration */}
          <Section
            number={6}
            title="Cross-Functional Collaboration"
            subtitle="Working Beyond Engineering"
            prompt="When did you work with product, design, sales, or leadership? What did you enable?"
            icon={<Handshake className="w-5 h-5" />}
            bgClass="bg-cyan-50 dark:bg-cyan-950/30 print:bg-cyan-50"
          >
            <EditableFieldGroup
              title="Product Collaboration"
              fields={PRODUCT_COLLABORATION_FIELDS}
              sectionKey="crossFunctional"
              groupKey="productCollaboration"
              values={formData.crossFunctional.productCollaboration}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Design & UX Collaboration"
              fields={DESIGN_UX_COLLABORATION_FIELDS}
              sectionKey="crossFunctional"
              groupKey="designUXCollaboration"
              values={formData.crossFunctional.designUXCollaboration}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Sales & Customer Success"
              fields={SALES_CUSTOMER_SUCCESS_FIELDS}
              sectionKey="crossFunctional"
              groupKey="salesCustomerSuccess"
              values={formData.crossFunctional.salesCustomerSuccess}
              onChange={updateField}
            />
            <EditableFieldGroup
              title="Leadership & Strategy"
              fields={LEADERSHIP_STRATEGY_FIELDS}
              sectionKey="crossFunctional"
              groupKey="leadershipStrategy"
              values={formData.crossFunctional.leadershipStrategy}
              onChange={updateField}
            />
          </Section>
        </div>

        {/* Privacy Notice */}
        <p className="text-xs text-center text-muted-foreground max-w-2xl mx-auto mt-8 no-print">
          <span className="font-medium">Privacy:</span> Your answers are stored
          locally in your browser and never sent to our servers. PDF generation
          happens entirely on your device.
        </p>

        {/* Quick Metrics Checklist */}
        <div className="mt-8 print:mt-6 print-break-before">
          <div className="hidden print:flex justify-end py-2 mb-4">
            <Logo />
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 print:bg-gray-100 rounded-xl p-6 print:rounded-none print:border print:border-gray-300">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white print:text-gray-800 mb-4">
              Quick Metrics Checklist
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                'Features shipped',
                'Critical incidents resolved',
                'Avg incident resolution time',
                'PRs reviewed',
                'Junior devs mentored',
                'People impacted by reliability work',
                'Build/deploy time reduction',
                'Cost savings',
                'Revenue impact',
                'People who said you saved them time',
                'Tests written / coverage improved',
              ].map((metric) => (
                <div
                  key={metric}
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 print:text-gray-700"
                >
                  <div className="w-4 h-4 border border-gray-400 rounded" />
                  <span>{metric}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 print:mt-6">
          <p className="mb-2">
            <strong>Next steps:</strong> Pick your 3-5 most significant
            accomplishments. Write one clear sentence for each that captures:
            what you did + why it mattered + measurable result.
          </p>
          <p className="hidden print:block mt-4">
            Created with BragDoc.ai - Track your achievements all year long at{' '}
            <strong>bragdoc.ai</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
