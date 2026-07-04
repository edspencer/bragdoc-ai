import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const comparisonData = [
  {
    useCase: 'Developer',
    cliUsage: 'Heavy',
    standupMode: 'Yes',
    documentGen: 'Monthly',
  },
  {
    useCase: 'Manager',
    cliUsage: 'Light',
    standupMode: 'No',
    documentGen: 'Monthly',
  },
  {
    useCase: 'Freelancer',
    cliUsage: 'Heavy',
    standupMode: 'Varies',
    documentGen: 'Per-client',
  },
  {
    useCase: 'Transitioner',
    cliUsage: 'Historical',
    standupMode: 'No',
    documentGen: 'Resume prep',
  },
  {
    useCase: 'Remote',
    cliUsage: 'Daily',
    standupMode: 'Yes',
    documentGen: 'Weekly',
  },
  {
    useCase: 'Enterprise',
    cliUsage: 'Heavy',
    standupMode: 'Yes',
    documentGen: 'Quarterly',
  },
];

export function ComparisonTable() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">
            Comparison by Use Case
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Use Case</TableHead>
                  <TableHead className="font-semibold">CLI Usage</TableHead>
                  <TableHead className="font-semibold">Standup Mode</TableHead>
                  <TableHead className="font-semibold">Document Gen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.useCase}</TableCell>
                    <TableCell>{row.cliUsage}</TableCell>
                    <TableCell>{row.standupMode}</TableCell>
                    <TableCell>{row.documentGen}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  );
}
