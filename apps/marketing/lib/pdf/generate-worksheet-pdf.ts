import type { WorksheetFormData } from '@/components/templates/worksheet/types';
import type { PDFFont } from 'pdf-lib';

/**
 * Field configuration for PDF generation
 */
interface FieldDef {
  key: string;
  label: string;
}

/**
 * Group configuration for PDF generation
 */
interface GroupDef {
  key: string;
  title: string;
  fields: FieldDef[];
}

/**
 * Section configuration for PDF generation
 */
interface SectionDef {
  key: keyof WorksheetFormData;
  title: string;
  subtitle: string;
  color: { r: number; g: number; b: number };
  groups: GroupDef[];
}

/**
 * Section metadata for PDF generation.
 * Colors are RGB values from Tailwind's color palette (e.g., blue-100 = 219, 234, 254)
 */
const SECTIONS: SectionDef[] = [
  {
    key: 'codeFeatures',
    title: '1. Code & Features',
    subtitle: 'What You Shipped',
    color: { r: 219, g: 234, b: 254 }, // blue-100
    groups: [
      {
        key: 'majorProjects',
        title: 'Major Projects',
        fields: [
          { key: 'projectName', label: 'Project name' },
          { key: 'whenShipped', label: 'When shipped' },
          { key: 'yourRole', label: 'Your role' },
          { key: 'businessContext', label: 'Business context' },
          { key: 'measurableImpact', label: 'Measurable impact' },
          { key: 'evidencePRs', label: 'Evidence (PRs)' },
        ],
      },
      {
        key: 'bugFixes',
        title: 'Important Bug Fixes',
        fields: [
          { key: 'bugDescription', label: 'Bug description' },
          { key: 'impactScope', label: 'Impact scope' },
          { key: 'resolutionTime', label: 'Resolution time' },
          { key: 'preventionSteps', label: 'Prevention steps' },
        ],
      },
      {
        key: 'technicalImprovements',
        title: 'Technical Improvements',
        fields: [
          { key: 'whatImproved', label: 'What improved' },
          { key: 'metricsBeforeAfter', label: 'Metrics before/after' },
          { key: 'businessValue', label: 'Business value' },
        ],
      },
    ],
  },
  {
    key: 'reliabilityDebugging',
    title: '2. Reliability & Debugging',
    subtitle: 'Keeping Things Running',
    color: { r: 254, g: 243, b: 199 }, // amber-100
    groups: [
      {
        key: 'criticalIncidents',
        title: 'Critical Incidents',
        fields: [
          { key: 'incidentDescription', label: 'Incident description' },
          { key: 'date', label: 'Date' },
          { key: 'yourRole', label: 'Your role' },
          { key: 'resolutionTime', label: 'Resolution time' },
          { key: 'impactPrevented', label: 'Impact prevented' },
          { key: 'permanentFix', label: 'Permanent fix' },
        ],
      },
      {
        key: 'proactiveReliability',
        title: 'Proactive Reliability Work',
        fields: [
          { key: 'whatYouDid', label: 'What you did' },
          { key: 'result', label: 'Result' },
          { key: 'teamImpact', label: 'Team impact' },
        ],
      },
      {
        key: 'onCallPerformance',
        title: 'On-Call Performance',
        fields: [
          { key: 'duration', label: 'Duration' },
          { key: 'incidentsHandled', label: 'Incidents handled' },
          { key: 'avgResolutionTime', label: 'Avg resolution time' },
          { key: 'qualityMetric', label: 'Quality metric' },
        ],
      },
    ],
  },
  {
    key: 'mentoringKnowledge',
    title: '3. Mentoring & Knowledge Sharing',
    subtitle: 'Teaching Others',
    color: { r: 220, g: 252, b: 231 }, // green-100
    groups: [
      {
        key: 'directMentoring',
        title: 'Direct Mentoring',
        fields: [
          { key: 'personMentored', label: 'Person mentored' },
          { key: 'duration', label: 'Duration' },
          { key: 'skillsTaught', label: 'Skills taught' },
          { key: 'theirOutcome', label: 'Their outcome' },
          { key: 'timeCommitment', label: 'Time commitment' },
        ],
      },
      {
        key: 'codeReviews',
        title: 'Code Reviews',
        fields: [
          { key: 'prsReviewed', label: 'PRs reviewed' },
          { key: 'qualityContribution', label: 'Quality contribution' },
          { key: 'notableImpact', label: 'Notable impact' },
        ],
      },
      {
        key: 'documentation',
        title: 'Documentation & Knowledge Sharing',
        fields: [
          { key: 'whatYouCreated', label: 'What you created' },
          { key: 'adoption', label: 'Adoption' },
          { key: 'onboardingImpact', label: 'Onboarding impact' },
        ],
      },
    ],
  },
  {
    key: 'architectureDecisions',
    title: '4. Architecture & Technical Decisions',
    subtitle: 'Shaping the System',
    color: { r: 243, g: 232, b: 255 }, // purple-100
    groups: [
      {
        key: 'majorDesignDecisions',
        title: 'Major Design Decisions',
        fields: [
          { key: 'decision', label: 'Decision' },
          { key: 'context', label: 'Context' },
          { key: 'optionsConsidered', label: 'Options considered' },
          { key: 'yourRole', label: 'Your role' },
          { key: 'outcome', label: 'Outcome' },
          { key: 'longTermImpact', label: 'Long-term impact' },
        ],
      },
      {
        key: 'technicalStrategy',
        title: 'Technical Strategy',
        fields: [
          { key: 'area', label: 'Area' },
          { key: 'beforeState', label: 'Before state' },
          { key: 'yourProposal', label: 'Your proposal' },
          { key: 'currentState', label: 'Current state' },
          { key: 'impact', label: 'Impact' },
        ],
      },
      {
        key: 'debtReduction',
        title: 'Debt Reduction & Refactoring',
        fields: [
          { key: 'what', label: 'What' },
          { key: 'scope', label: 'Scope' },
          { key: 'benefit', label: 'Benefit' },
          { key: 'teamEnablement', label: 'Team enablement' },
        ],
      },
    ],
  },
  {
    key: 'processImprovements',
    title: '5. Process Improvements',
    subtitle: 'Reducing Friction',
    color: { r: 255, g: 228, b: 230 }, // rose-100
    groups: [
      {
        key: 'devToolsInfrastructure',
        title: 'Development Tools & Infrastructure',
        fields: [
          { key: 'whatImproved', label: 'What improved' },
          { key: 'before', label: 'Before' },
          { key: 'after', label: 'After' },
          { key: 'timeSaved', label: 'Time saved' },
          { key: 'teamImpact', label: 'Team impact' },
        ],
      },
      {
        key: 'testingQuality',
        title: 'Testing & Quality Infrastructure',
        fields: [
          { key: 'what', label: 'What' },
          { key: 'coverageImprovement', label: 'Coverage improvement' },
          { key: 'frictionReduced', label: 'Friction reduced' },
          { key: 'qualityImpact', label: 'Quality impact' },
        ],
      },
      {
        key: 'processStreamlining',
        title: 'Process Streamlining',
        fields: [
          { key: 'process', label: 'Process' },
          { key: 'howImproved', label: 'How improved' },
          { key: 'outcome', label: 'Outcome' },
          { key: 'adoption', label: 'Adoption' },
        ],
      },
    ],
  },
  {
    key: 'crossFunctional',
    title: '6. Cross-Functional Collaboration',
    subtitle: 'Working Beyond Engineering',
    color: { r: 207, g: 250, b: 254 }, // cyan-100
    groups: [
      {
        key: 'productCollaboration',
        title: 'Product Collaboration',
        fields: [
          { key: 'project', label: 'Project' },
          { key: 'yourTechnicalRole', label: 'Your technical role' },
          { key: 'businessOutcome', label: 'Business outcome' },
          { key: 'result', label: 'Result' },
        ],
      },
      {
        key: 'designUXCollaboration',
        title: 'Design & UX Collaboration',
        fields: [
          { key: 'what', label: 'What' },
          { key: 'technicalContribution', label: 'Technical contribution' },
          { key: 'outcome', label: 'Outcome' },
        ],
      },
      {
        key: 'salesCustomerSuccess',
        title: 'Sales & Customer Success',
        fields: [
          { key: 'supportProvided', label: 'Support provided' },
          { key: 'dealsInfluenced', label: 'Deals influenced' },
          { key: 'customerValue', label: 'Customer value' },
        ],
      },
      {
        key: 'leadershipStrategy',
        title: 'Leadership & Strategy',
        fields: [
          { key: 'what', label: 'What' },
          { key: 'scope', label: 'Scope' },
          { key: 'outcome', label: 'Outcome' },
        ],
      },
    ],
  },
];

/**
 * Wrap text to fit within a given width.
 * Uses actual font metrics for accurate measurement.
 */
function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string[] {
  if (!text) return [''];

  // Split by newlines first to preserve intentional line breaks
  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      allLines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines.length > 0 ? allLines : [''];
}

/**
 * Generate a PDF document from worksheet form data.
 * Uses pdf-lib for client-side PDF generation.
 *
 * @param formData - The completed worksheet form data
 * @returns Uint8Array containing the PDF file bytes
 */
export async function generateWorksheetPdf(
  formData: WorksheetFormData,
): Promise<Uint8Array> {
  // Dynamically import pdf-lib for bundle optimization
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 612; // Letter size
  const PAGE_HEIGHT = 792;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPosition = PAGE_HEIGHT - MARGIN;

  // Helper function to add a new page when needed
  const ensureSpace = (requiredHeight: number) => {
    if (yPosition - requiredHeight < MARGIN) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      yPosition = PAGE_HEIGHT - MARGIN;
    }
  };

  // Title
  currentPage.drawText('2025 Year in Review', {
    x: MARGIN,
    y: yPosition,
    size: 24,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  yPosition -= 30;

  currentPage.drawText('Developer Achievement Worksheet', {
    x: MARGIN,
    y: yPosition,
    size: 14,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 40;

  // Process each section
  for (const section of SECTIONS) {
    ensureSpace(100);

    // Section header with background
    const sectionHeaderHeight = 30;
    currentPage.drawRectangle({
      x: MARGIN,
      y: yPosition - sectionHeaderHeight,
      width: CONTENT_WIDTH,
      height: sectionHeaderHeight,
      color: rgb(
        section.color.r / 255,
        section.color.g / 255,
        section.color.b / 255,
      ),
    });

    currentPage.drawText(section.title, {
      x: MARGIN + 10,
      y: yPosition - 20,
      size: 14,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= sectionHeaderHeight + 15;

    // Process each field group in the section
    for (const group of section.groups) {
      ensureSpace(60);

      // Group title
      currentPage.drawText(group.title, {
        x: MARGIN,
        y: yPosition,
        size: 11,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 18;

      // Get values for this group
      const sectionData = formData[section.key] as Record<
        string,
        Record<string, string>
      >;
      const groupData = sectionData[group.key] || {};

      // Fields
      for (const field of group.fields) {
        ensureSpace(30);

        const value = groupData[field.key] || '';

        // Field label
        currentPage.drawText(`${field.label}:`, {
          x: MARGIN,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });
        yPosition -= 14;

        // Field value (or placeholder if empty)
        const displayValue = value || '';

        // Handle multi-line text
        const lines = wrapText(displayValue, CONTENT_WIDTH - 20, helvetica, 10);
        for (const line of lines) {
          ensureSpace(14);
          currentPage.drawText(line, {
            x: MARGIN + 10,
            y: yPosition,
            size: 10,
            font: helvetica,
            color: value ? rgb(0.1, 0.1, 0.1) : rgb(0.6, 0.6, 0.6),
          });
          yPosition -= 14;
        }
        yPosition -= 6;
      }
      yPosition -= 10;
    }
    yPosition -= 15;
  }

  // Footer on last page
  ensureSpace(40);
  yPosition = MARGIN + 20;
  currentPage.drawText(
    'Created with BragDoc.ai - Track your achievements all year at bragdoc.ai',
    {
      x: MARGIN,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  return pdfDoc.save();
}

/**
 * Download the PDF file to the user's device
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
