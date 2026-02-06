import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const faqs = [
  {
    question: 'How does BragDoc track my achievements?',
    answer:
      'BragDoc uses a CLI tool that analyzes your git commits locally on your machine. It extracts meaningful achievements using AI, then syncs only the processed achievements (not your code) to the web app for easy review and organization.',
  },
  {
    question: 'Is my code safe? What about privacy?',
    answer:
      'Your code never leaves your machine. The CLI processes everything locally, and only sends achievement summaries to BragDoc. You can even use local AI models like Ollama for complete offline operation.',
  },
  {
    question: 'Do I need to pay for AI features?',
    answer:
      'BragDoc offers free trial credits (10 AI credits + 20 chat messages) to try cloud features. For unlimited access, a Full Account costs $45/year or $99 lifetime. You can also self-host the open source version for free.',
  },
  {
    question: 'Can I use BragDoc without the CLI?',
    answer:
      "Yes! You can manually add achievements through the web app. However, the CLI's automatic extraction from git commits is what makes BragDoc truly powerful and time-saving.",
  },
];

export function MiniFaqSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Quick answers to common questions about BragDoc
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3 mb-8">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border border-border rounded-lg px-6 bg-card shadow-sm"
            >
              <AccordionTrigger className="text-left hover:no-underline py-5">
                <span className="font-semibold text-foreground pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link href="/faq" className="gap-2">
              View All FAQs
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
