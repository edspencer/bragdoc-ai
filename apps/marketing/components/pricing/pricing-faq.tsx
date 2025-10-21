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
          <AccordionItem value="item-1">
            <AccordionTrigger>
              What's the difference between Free and Full Account?
            </AccordionTrigger>
            <AccordionContent>
              The free account lets you manually track achievements and explore
              BragDoc, but it doesn't include any AI features. The Full Account
              ($4.99/month) gives you AI-powered achievement extraction from git
              commits, AI-generated standup summaries, performance review
              documents, and all the features that make BragDoc truly powerful.
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
              The free account serves as your trial - you can explore BragDoc
              and manually track achievements to see if it fits your workflow.
              When you're ready for the AI features, upgrade to a Full Account.
              We don't offer a time-limited trial because we want you to make an
              informed decision without pressure.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>What about enterprise pricing?</AccordionTrigger>
            <AccordionContent>
              We offer volume discounts for teams and enterprises. Contact us
              for custom pricing if you need more than 10 seats. We also provide
              dedicated support, custom integrations, and on-premise deployment
              options for enterprise customers.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>How does billing work?</AccordionTrigger>
            <AccordionContent>
              Billing is simple and you can cancel anytime. Choose monthly
              billing at $4.99/month or annual billing at $44.99/year (save
              25%). There are no hidden fees, no setup costs, and no long-term
              commitments. You can cancel your subscription at any time and
              continue using the free account.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
