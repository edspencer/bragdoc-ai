import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { TeamMemberCard } from '@/components/team/team-member-card';
import { teams } from '@/lib/team-data';

export const metadata: Metadata = {
  title: "Meet the Team - BragDoc's AI-Powered Development Team",
  description:
    "Meet Ed and the 14 Claude agents powering BragDoc's AI-driven development. Each specialized agent brings unique expertise to accelerate feature delivery.",
  keywords: [
    'team',
    'Claude agents',
    'AI development',
    'software engineering',
    'artificial intelligence',
  ],
  alternates: {
    canonical: '/team',
  },
  openGraph: {
    title: "Meet the Team - BragDoc's AI-Powered Development Team",
    description:
      "Meet Ed and the 14 Claude agents powering BragDoc's AI-driven development. Each specialized agent brings unique expertise to accelerate feature delivery.",
    type: 'website',
    url: '/team',
  },
  twitter: {
    card: 'summary',
    title: "Meet the Team - BragDoc's AI-Powered Development Team",
    description:
      "Meet Ed and the 14 Claude agents powering BragDoc's AI-driven development. Each specialized agent brings unique expertise to accelerate feature delivery.",
  },
};

export default function TeamPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        {/* Page header section */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
              Meet the Team
              <span className="block text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)] mt-2">
                AI-Powered Development at Scale
              </span>
            </h1>
            <p className="text-xl text-muted-foreground text-pretty">
              BragDoc's engineering team consists of specialized Claude agents,
              each bringing unique expertise. Meet Ed and the 14 agents
              orchestrating our development.
            </p>
          </div>
        </section>

        {/* Team sections by group */}
        <div className="pb-32 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl space-y-20">
            {teams.map((team) => (
              <section key={team.name}>
                {/* Team group header */}
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    {team.name}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {team.description}
                  </p>
                </div>

                {/* Team members grid - 2 columns on lg+ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {team.members.map((member) => (
                    <TeamMemberCard key={member.name} member={member} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
