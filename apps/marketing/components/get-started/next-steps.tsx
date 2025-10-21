import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock, Calendar, FileText, Download, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function NextSteps() {
  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What's Next?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore these features to get the most out of BragDoc
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <Link href="/cli#standup" className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
                <CardHeader>
                  <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-4">
                    <Clock className="size-6 text-primary" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                    Set Up Standup Mode
                    <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    Configure automatic standup prep and never scramble for
                    updates again
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/cli#scheduling" className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
                <CardHeader>
                  <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-4">
                    <Calendar className="size-6 text-primary" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                    Configure Schedule
                    <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    Set automatic extraction times to build your achievement
                    history effortlessly
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="#docs" className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
                <CardHeader>
                  <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-4">
                    <FileText className="size-6 text-primary" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                    Explore Document Templates
                    <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    Generate your first performance review or promotion document
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/cli#data-management" className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1">
                <CardHeader>
                  <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-4">
                    <Download className="size-6 text-primary" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                    Export Your Data
                    <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    Backup your achievements and maintain full control of your
                    data
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
