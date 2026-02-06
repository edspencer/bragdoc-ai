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
            <AccordionTrigger>Can I try BragDoc for free?</AccordionTrigger>
            <AccordionContent>
              Yes! Every new account gets{' '}
              <strong>10 free AI credits and 20 free chat messages</strong> to
              try cloud features. Plus, you can always use the CLI with your own
              LLM for free.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-beta-2">
            <AccordionTrigger>What are the paid options?</AccordionTrigger>
            <AccordionContent>
              We offer two simple options: <strong>$45/year</strong> (just
              $3.75/month, billed annually) or <strong>$99 lifetime</strong>{' '}
              (pay once, use forever). Both give you unlimited access to all
              cloud AI features.
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
              DeepSeek, or free local Ollama). The Full Account ($45/year or $99
              lifetime) gives you cloud-based AI features without needing your
              own API keys, plus AI-generated standup summaries, performance
              review documents, and all the features that make BragDoc truly
              powerful. New accounts get free trial credits to try cloud
              features.
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
              Yes! Every new account gets 10 free AI credits and 20 free chat
              messages to try cloud features - no credit card required. Plus,
              the free account lets you explore BragDoc, manually track
              achievements, and use AI-powered extraction via the CLI (with your
              own LLM) to see if it fits your workflow.
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
              Billing is simple and you can cancel anytime. Choose annual
              billing at $45/year ($3.75/month) or pay $99 once for lifetime
              access. There are no hidden fees, no setup costs, and annual plans
              can be canceled anytime. Start with free trial credits before you
              commit.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
