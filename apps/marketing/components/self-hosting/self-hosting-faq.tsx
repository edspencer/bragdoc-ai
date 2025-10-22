import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function SelfHostingFAQ() {
  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Self-Hosting FAQ
            </h2>
            <p className="text-lg text-muted-foreground">
              Common questions about running BragDoc on your infrastructure
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="requirements"
              className="border rounded-lg px-6 bg-background"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                What are the system requirements?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                BragDoc requires Node.js 18+ and a PostgreSQL database (we
                recommend Neon). You'll need about 512MB RAM minimum, though
                1GB+ is recommended for better performance. The application is
                lightweight and can run on most modern servers or even a
                Raspberry Pi.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="cost"
              className="border rounded-lg px-6 bg-background"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                What does self-hosting cost?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The BragDoc software is completely free and open source. Your
                only costs are infrastructure (server hosting, database) and
                optionally an LLM API if you don't use local Ollama. A basic
                setup on a VPS like DigitalOcean or Hetzner costs around
                $5-10/month, or you can use free tiers from providers like
                Vercel and Neon.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="updates"
              className="border rounded-lg px-6 bg-background"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                How do I update my self-hosted instance?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Simply pull the latest changes from the GitHub repository with{' '}
                <code className="px-2 py-0.5 rounded bg-muted text-sm">
                  git pull
                </code>
                , run{' '}
                <code className="px-2 py-0.5 rounded bg-muted text-sm">
                  pnpm install
                </code>{' '}
                to update dependencies, and restart your application. We
                recommend backing up your database before major updates.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="ollama"
              className="border rounded-lg px-6 bg-background"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                Can I use local AI with Ollama?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! BragDoc fully supports local Ollama for 100% offline AI
                capabilities. Install Ollama on your server, pull a model like
                llama2 or mistral, and configure BragDoc to use your local
                Ollama endpoint. This gives you complete privacy with no
                external API calls.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="support"
              className="border rounded-lg px-6 bg-background"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                Do I get support for self-hosted instances?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Community support is available through GitHub Issues and
                Discussions. For priority support, bug fixes, and feature
                requests, consider sponsoring the project on GitHub or
                purchasing a support plan. The community is active and helpful
                for most common issues.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="migration"
              className="border rounded-lg px-6 bg-background"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                Can I migrate from cloud to self-hosted (or vice versa)?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! BragDoc supports data export and import. You can export
                your achievements from the cloud version and import them into
                your self-hosted instance, or move from self-hosted to cloud.
                Your data is always portable and never locked in.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}
