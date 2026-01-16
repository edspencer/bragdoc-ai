import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SchemaWrapper } from '@/components/structured-data/schema-wrapper';
import { FAQSchema } from '@/components/structured-data/faq-schema';
import { appPath } from '@/lib/utils';
import {
  Sparkles,
  Brain,
  Layers,
  Tags,
  Target,
  TrendingUp,
  MessageSquare,
  Briefcase,
  Clock,
  Zap,
  DollarSign,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Workstreams: AI-Powered Achievement Clustering - BragDoc',
  description:
    'Discover how BragDoc Workstreams automatically groups your achievements using ML to identify patterns, themes, and skill development areas. Perfect for performance reviews.',
  keywords:
    'workstreams, achievement clustering, machine learning, performance reviews, career development, semantic analysis',
  alternates: {
    canonical: '/features/workstreams',
  },
  openGraph: {
    title: 'Workstreams: AI-Powered Achievement Clustering',
    description:
      'Let AI automatically identify patterns and themes in your professional achievements',
    type: 'website',
    url: 'https://www.bragdoc.ai/features/workstreams',
    siteName: 'BragDoc',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workstreams: AI-Powered Achievement Clustering',
    description:
      'Let AI automatically identify patterns and themes in your professional achievements',
  },
};

const faqs = [
  {
    question: "What happens if I don't have 20 achievements?",
    answer:
      "Workstreams requires a minimum of 20 achievements to generate meaningful clusters. With fewer achievements, the patterns wouldn't be statistically significant. Keep logging your work, and once you reach 20 achievements, you'll be able to generate your first set of workstreams.",
  },
  {
    question: 'How often are workstreams updated?',
    answer:
      'Workstreams are regenerated on demand when you click the "Generate Workstreams" button. New achievements are automatically assigned to existing workstreams based on semantic similarity. You can regenerate workstreams at any time to incorporate all your latest achievements into fresh clusters.',
  },
  {
    question: 'Can I manually adjust workstream assignments?',
    answer:
      'Yes! While the AI does the initial clustering, you have full control. You can reassign any achievement to a different workstream if you feel it fits better elsewhere. This helps the system learn your preferences over time.',
  },
  {
    question: 'Is my achievement data used to train models?',
    answer:
      "No. Your achievement data is never used to train any AI models. We use OpenAI's embedding API to generate vectors for similarity matching, but this is a one-way process. Your data remains private and is only used to generate your personal workstreams.",
  },
  {
    question: 'How does this compare to manual categorization?',
    answer:
      "Manual categorization requires you to decide upfront what categories exist and assign each achievement. Workstreams uses machine learning to discover natural groupings based on the actual content of your achievements, often revealing patterns you might not have noticed. It's like having an AI assistant analyze your entire career trajectory.",
  },
];

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Workstreams: AI-Powered Achievement Clustering',
  description:
    'Discover how BragDoc Workstreams automatically groups your achievements using ML to identify patterns, themes, and skill development areas.',
  url: 'https://www.bragdoc.ai/features/workstreams',
  isPartOf: {
    '@type': 'WebSite',
    name: 'BragDoc',
    url: 'https://www.bragdoc.ai',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.bragdoc.ai',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Features',
      item: 'https://www.bragdoc.ai/features',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Workstreams',
      item: 'https://www.bragdoc.ai/features/workstreams',
    },
  ],
};

const howItWorksSteps = [
  {
    icon: Database,
    title: 'Achievement Collection',
    description:
      'Your achievements are gathered from all sources - git commits, manual entries, and integrations.',
  },
  {
    icon: Brain,
    title: 'Semantic Vectorization',
    description:
      'Each achievement is converted into a 1536-dimensional vector using OpenAI embeddings, capturing its semantic meaning.',
  },
  {
    icon: Layers,
    title: 'Intelligent Clustering',
    description:
      'DBSCAN algorithm groups similar achievements together based on semantic proximity, discovering natural themes.',
  },
  {
    icon: Tags,
    title: 'AI-Generated Labels',
    description:
      'An LLM analyzes each cluster and generates human-readable names that describe the theme of the grouped achievements.',
  },
];

const useCases = [
  {
    icon: MessageSquare,
    title: 'Performance Reviews',
    description:
      'Walk into your review with clear narratives about your contributions. Workstreams organize your achievements into compelling stories that demonstrate consistent impact across themes.',
    example:
      '"Backend Performance Optimization" shows 12 achievements spanning API improvements, database optimizations, and caching implementations.',
  },
  {
    icon: TrendingUp,
    title: 'Career Development',
    description:
      "Identify where you're naturally gravitating and spot emerging skills. See patterns in your work that reveal your professional growth trajectory.",
    example:
      'Discover that your "Team Leadership" workstream has grown from 3 to 15 achievements over the past year.',
  },
  {
    icon: Target,
    title: 'Skill Assessment',
    description:
      "Get a data-driven view of your technical and soft skill areas. Each workstream represents a capability you've demonstrated through real accomplishments.",
    example:
      'Your workstreams reveal balanced contributions to both "API Design" and "Developer Experience" initiatives.',
  },
  {
    icon: Briefcase,
    title: 'Interview Preparation',
    description:
      'Build cohesive narratives for behavioral interviews. Each workstream provides ready-made stories with multiple supporting examples.',
    example:
      'Use your "Cross-Team Collaboration" workstream to answer questions about teamwork with specific, concrete examples.',
  },
];

export default function WorkstreamsPage() {
  const dashboardUrl = appPath('/dashboard');
  const demoUrl = appPath('/demo');

  return (
    <div className="min-h-screen">
      <Header />
      <SchemaWrapper schema={webPageSchema} />
      <SchemaWrapper schema={breadcrumbSchema} />
      <FAQSchema faqs={faqs} />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="size-4" />
                AI-Powered Feature
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
                Understand Your Career Patterns with Workstreams
              </h1>
              <p className="text-xl text-muted-foreground mb-8 text-balance max-w-3xl mx-auto">
                Workstreams automatically discover themes and patterns across
                your achievements using machine learning, revealing the story of
                your professional development.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <a href={dashboardUrl}>Get Started Free</a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={demoUrl}>View Demo</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Statement Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Raw Achievements Don't Show Patterns
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              You've completed 47 achievements this quarter. But what themes
              emerge? What skills are you developing? Which areas show
              consistent contribution? Without organization, your achievements
              are just a list - not a story.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mt-12">
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="text-4xl font-bold text-primary mb-2">47</div>
                <div className="text-sm text-muted-foreground">
                  Achievements logged
                </div>
              </div>
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="text-4xl font-bold text-primary mb-2">?</div>
                <div className="text-sm text-muted-foreground">
                  Hidden patterns
                </div>
              </div>
              <div className="p-6 rounded-lg bg-background border border-border">
                <div className="text-4xl font-bold text-primary mb-2">0</div>
                <div className="text-sm text-muted-foreground">
                  Narrative clarity
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Are Workstreams Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  What Are Workstreams?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Workstreams are AI-discovered clusters of related achievements
                  that reveal natural themes in your work. Instead of manually
                  categorizing each accomplishment, machine learning identifies
                  patterns you might not even notice.
                </p>
                <ul className="space-y-4">
                  {[
                    {
                      icon: Brain,
                      text: 'Machine learning groups related achievements',
                    },
                    {
                      icon: TrendingUp,
                      text: 'Identifies skill areas and growth patterns',
                    },
                    {
                      icon: Tags,
                      text: 'AI-generated cluster names for themes',
                    },
                    {
                      icon: Sparkles,
                      text: 'Reveals your professional development story',
                    },
                    {
                      icon: Target,
                      text: 'Helps prepare compelling review narratives',
                    },
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
                        style={{ backgroundColor: 'var(--feature-accent)' }}
                      >
                        <item.icon className="size-4 text-white" />
                      </div>
                      <span className="text-muted-foreground">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative aspect-video rounded-lg border-2 border-border overflow-hidden shadow-lg">
                <Image
                  src="/screenshots/ui/workstreams-dashboard.png"
                  alt="BragDoc Workstreams dashboard showing achievement clusters organized by theme"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Advanced machine learning techniques transform your achievements
                into meaningful career narratives in four steps.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {howItWorksSteps.map((step, index) => (
                <Card key={index} className="relative">
                  <div className="absolute -top-3 -left-3 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <CardHeader className="pt-6">
                    <div
                      className="flex size-12 items-center justify-center rounded-lg mb-4"
                      style={{ backgroundColor: 'var(--feature-accent)' }}
                    >
                      <step.icon className="size-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-lg border-2 border-border overflow-hidden shadow-lg max-w-4xl mx-auto">
              <Image
                src="/screenshots/ui/workstreams-with-table.png"
                alt="BragDoc workstreams view with achievement table showing filtered achievements by selected workstream"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Use Cases</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Workstreams transform how you understand and communicate your
                professional contributions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {useCases.map((useCase, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="flex size-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: 'var(--feature-accent)' }}
                      >
                        <useCase.icon className="size-5 text-white" />
                      </div>
                      <CardTitle>{useCase.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      {useCase.description}
                    </p>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground italic">
                          {useCase.example}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 relative aspect-video rounded-lg border-2 border-border overflow-hidden shadow-lg max-w-3xl mx-auto">
              <Image
                src="/screenshots/ui/workstreams-detail.png"
                alt="BragDoc workstream detail view showing expanded workstream with individual achievements"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Technical Specifications Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Technical Specifications
              </h2>
              <p className="text-lg text-muted-foreground">
                Built for performance, efficiency, and privacy.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-lg bg-background border border-border text-center">
                <div
                  className="flex size-12 items-center justify-center rounded-lg mx-auto mb-4"
                  style={{ backgroundColor: 'var(--feature-accent)' }}
                >
                  <Layers className="size-6 text-white" />
                </div>
                <div className="text-2xl font-bold mb-1">20+</div>
                <div className="text-sm text-muted-foreground">
                  Minimum achievements required
                </div>
              </div>

              <div className="p-6 rounded-lg bg-background border border-border text-center">
                <div
                  className="flex size-12 items-center justify-center rounded-lg mx-auto mb-4"
                  style={{ backgroundColor: 'var(--feature-accent)' }}
                >
                  <Clock className="size-6 text-white" />
                </div>
                <div className="text-2xl font-bold mb-1">&lt;500ms</div>
                <div className="text-sm text-muted-foreground">
                  Generation time for 1000 achievements
                </div>
              </div>

              <div className="p-6 rounded-lg bg-background border border-border text-center">
                <div
                  className="flex size-12 items-center justify-center rounded-lg mx-auto mb-4"
                  style={{ backgroundColor: 'var(--feature-accent)' }}
                >
                  <DollarSign className="size-6 text-white" />
                </div>
                <div className="text-2xl font-bold mb-1">~$2/year</div>
                <div className="text-sm text-muted-foreground">
                  Cost per active user
                </div>
              </div>

              <div className="p-6 rounded-lg bg-background border border-border text-center">
                <div
                  className="flex size-12 items-center justify-center rounded-lg mx-auto mb-4"
                  style={{ backgroundColor: 'var(--feature-accent)' }}
                >
                  <Zap className="size-6 text-white" />
                </div>
                <div className="text-2xl font-bold mb-1">1536</div>
                <div className="text-sm text-muted-foreground">
                  Embedding dimensions (pgvector)
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 rounded-lg bg-background border border-border">
              <h3 className="font-semibold mb-4 text-center">
                Powered by Industry-Leading Technology
              </h3>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="px-3 py-1 rounded-full bg-muted">
                  OpenAI Embeddings
                </span>
                <span className="px-3 py-1 rounded-full bg-muted">
                  DBSCAN Clustering
                </span>
                <span className="px-3 py-1 rounded-full bg-muted">
                  pgvector Extension
                </span>
                <span className="px-3 py-1 rounded-full bg-muted">
                  PostgreSQL
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about Workstreams.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Generation Screenshot Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to Discover Your Workstreams?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Once you have 20 or more achievements, generating workstreams is
                just one click away.
              </p>
            </div>
            <div className="relative aspect-video rounded-lg border-2 border-border overflow-hidden shadow-lg">
              <Image
                src="/screenshots/ui/workstreams-generate-initial.png"
                alt="BragDoc workstreams generation interface showing the generate button and achievement count"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div
            className="container mx-auto max-w-4xl rounded-2xl p-12 text-center"
            style={{
              background: `linear-gradient(135deg, var(--feature-accent) 0%, oklch(from var(--feature-accent) calc(l * 0.85) c calc(h + 20)) 100%)`,
            }}
          >
            <Sparkles className="size-12 text-white mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white text-balance">
              Start Discovering Your Career Patterns
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who use BragDoc to understand
              their career trajectory and prepare for performance reviews.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-foreground hover:bg-white/90"
                asChild
              >
                <a href={dashboardUrl}>Try Workstreams Free</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                asChild
              >
                <a href={demoUrl}>View Demo</a>
              </Button>
            </div>
            <div className="mt-8">
              <Link
                href="/features"
                className="text-white/80 hover:text-white transition-colors underline underline-offset-4 text-sm"
              >
                Back to all features
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
