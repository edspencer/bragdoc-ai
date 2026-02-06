import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Minus } from 'lucide-react';

export function ComparisonTable() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Feature Comparison
        </h2>
        <div className="max-w-5xl mx-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Feature</TableHead>
                <TableHead className="text-center">Open Source</TableHead>
                <TableHead className="text-center">Free Account</TableHead>
                <TableHead className="text-center">Full Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  Manual achievement entry
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Web app access</TableCell>
                <TableCell className="text-center">
                  <Minus
                    className="size-5 text-muted-foreground mx-auto"
                    aria-label="Self-hosted only"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">CLI tool</TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Data export/import
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  AI achievement extraction
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Self-host
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Your LLM
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  AI standup summaries
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Self-host
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <X className="size-5 text-muted-foreground mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Cloud AI
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  AI document generation
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Your LLM
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <X className="size-5 text-muted-foreground mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Cloud AI
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  AI performance reviews
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Your LLM
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <X className="size-5 text-muted-foreground mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Cloud AI
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Hosted infrastructure
                </TableCell>
                <TableCell className="text-center">
                  <X className="size-5 text-muted-foreground mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Self-host
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Priority support</TableCell>
                <TableCell className="text-center">
                  <X className="size-5 text-muted-foreground mx-auto" />
                  <span className="text-xs text-muted-foreground block">
                    Community
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <X className="size-5 text-muted-foreground mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Check className="size-5 text-green-600 dark:text-green-500 mx-auto" />
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/30">
                <TableCell className="font-bold">Cost</TableCell>
                <TableCell className="text-center font-semibold">
                  Free
                  <span className="text-xs text-muted-foreground block font-normal">
                    + LLM costs
                  </span>
                </TableCell>
                <TableCell className="text-center font-semibold">
                  Free
                  <span className="text-xs text-muted-foreground block font-normal">
                    + trial credits
                  </span>
                </TableCell>
                <TableCell className="text-center font-semibold">
                  <div className="text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)] text-lg">
                    $45/year
                  </div>
                  <span className="text-xs text-muted-foreground block">
                    or $99 lifetime
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Start free with 10 AI credits + 20 chat messages. No credit card
            required.
          </p>
        </div>
      </div>
    </section>
  );
}
