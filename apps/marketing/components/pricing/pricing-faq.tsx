import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function PricingFaq() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Pricing FAQ
        </h2>
        <Accordion type="single" collapsible className="max-w-3xl mx-auto">
          <AccordionItem value="item-beta-1">
            <AccordionTrigger>
              Is BragDoc really free right now?
            </AccordionTrigger>
            <AccordionContent>
              Yes! We're in open beta and all features are completely free.
              Anyone who signs up during beta gets{' '}
              <strong>one year free</strong> when we launch paid plans.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-beta-2">
            <AccordionTrigger>What happens when beta ends?</AccordionTrigger>
            <AccordionContent>
              When we exit beta, pricing will be $4.99/month or $44.99/year. If
              you signed up during beta, you'll automatically get one year free
              before any charges begin.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              What's the difference between Free and Full Account?
            </AccordionTrigger>
            <AccordionContent>
              The free account includes manual achievement tracking and
              AI-powered achievement extraction via the CLI - you just need to
              provide your own LLM API keys (OpenAI, Anthropic, Google,
              DeepSeek, or free local Ollama). The Full Account (future pricing
              $4.99/month after beta) gives you cloud-based AI features without
              needing your own API keys, plus AI-generated standup summaries,
              performance review documents, and all the features that make
              BragDoc truly powerful. During beta, all features are free.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              Can I upgrade from Free to Full Account anytime?
            </AccordionTrigger>
            <AccordionContent>
              Yes! You can start with a free account and upgrade to a Full
              Account whenever you're ready. All your existing data will be
              preserved, and you'll immediately get access to all AI features.
              You can also downgrade back to free at any time.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>
              What if I don't want to pay the subscription?
            </AccordionTrigger>
            <AccordionContent>
              BragDoc is completely free and open source for self-hosting. You
              can run the entire platform on your own infrastructure with no
              subscription costs. You'll need to provide your own LLM API keys
              (or use free local Ollama) and handle the technical setup, but
              you'll have complete control over your data and no recurring fees.
              We provide comprehensive documentation for self-hosting.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Is there a free trial?</AccordionTrigger>
            <AccordionContent>
              Currently everything is FREE during open beta, so there's nothing
              to commit to. Plus, beta users get one year free when we launch
              paid features. After beta, the free account serves as your trial -
              you can explore BragDoc, manually track achievements, and use
              AI-powered extraction via the CLI (with your own LLM) to see if it
              fits your workflow.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>What about enterprise pricing?</AccordionTrigger>
            <AccordionContent>
              BragDoc doesn't offer enterprise pricing because we're designed
              for individual software professionals, not organizations. We're a
              tool for employees to advocate for themselves and document their
              own achievements. There are other tools for enterprises to monitor
              employee productivity, but that's not what BragDoc does. We
              believe professionals should own and control their career
              documentation. If your organization wants to support employees
              using BragDoc, we're open source and can be self-hosted.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>How does billing work?</AccordionTrigger>
            <AccordionContent>
              During open beta, there's no billing - everything is free. After
              beta launch, billing will be simple and you can cancel anytime.
              Choose monthly billing at $4.99/month or annual billing at
              $44.99/year (save 25%). There are no hidden fees, no setup costs,
              and no long-term commitments. Beta users automatically get one
              year free before any charges begin.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
