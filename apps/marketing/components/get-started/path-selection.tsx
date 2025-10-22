'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal, Globe, Layers, Clock, Check } from 'lucide-react';
import { PathASteps } from './path-a-steps';
import { PathBSteps } from './path-b-steps';
import { PathCSteps } from './path-c-steps';

export function PathSelection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="path-a" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto gap-4 bg-transparent p-0 mb-12">
            <TabsTrigger
              value="path-a"
              className="h-auto p-0 data-[state=active]:bg-transparent border-0"
            >
              <Card className="w-full transition-all hover:shadow-lg hover:border-primary/50 data-[state=active]:border-primary data-[state=active]:shadow-lg cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Terminal className="size-6 text-primary" />
                    </div>
                    <Badge className="bg-primary text-primary-foreground border-0">
                      Recommended
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mb-2">CLI + Local AI</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Maximum privacy, cost control, and automation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>5 minutes setup</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 mt-0.5 text-primary" />
                    <span>Best for daily use</span>
                  </div>
                </CardContent>
              </Card>
            </TabsTrigger>

            <TabsTrigger
              value="path-b"
              className="h-auto p-0 data-[state=active]:bg-transparent border-0"
            >
              <Card className="w-full transition-all hover:shadow-lg hover:border-primary/50 data-[state=active]:border-primary data-[state=active]:shadow-lg cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Globe className="size-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2">Web-Only Start</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Quick start for trying BragDoc
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>3 minutes setup</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 mt-0.5 text-primary" />
                    <span>No installation needed</span>
                  </div>
                </CardContent>
              </Card>
            </TabsTrigger>

            <TabsTrigger
              value="path-c"
              className="h-auto p-0 data-[state=active]:bg-transparent border-0"
            >
              <Card className="w-full transition-all hover:shadow-lg hover:border-primary/50 data-[state=active]:border-primary data-[state=active]:shadow-lg cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Layers className="size-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mb-2">
                    Hybrid Approach
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Combine both for maximum value
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>Flexible timeline</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 mt-0.5 text-primary" />
                    <span>Best long-term value</span>
                  </div>
                </CardContent>
              </Card>
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="path-a" className="mt-0">
              <PathASteps />
            </TabsContent>

            <TabsContent value="path-b" className="mt-0">
              <PathBSteps />
            </TabsContent>

            <TabsContent value="path-c" className="mt-0">
              <PathCSteps />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
