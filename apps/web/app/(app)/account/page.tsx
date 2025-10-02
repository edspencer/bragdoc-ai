'use client';

import { useState } from 'react';
import { AppPage } from 'components/shared/app-page';
import { Button } from '@/components/ui/button';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { useToast } from '@/hooks/use-toast';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';

export default function AccountPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/account/export');
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bragdoc-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Your data has been exported to a JSON file.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/account/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import data');
      }

      const result = await response.json();
      toast({
        title: 'Import successful',
        description: `Imported ${result.stats.companies.created} companies, ${result.stats.projects.created} projects, ${result.stats.achievements.created} achievements, and ${result.stats.documents.created} documents.`,
      });

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description:
          error instanceof Error ? error.message : 'Failed to import data',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppPage
      title="Account"
      description="Manage your account data and preferences"
    >
      <SidebarInset>
        <SiteHeader title="Account Settings" />
        <div className="space-y-8 p-6">
          {/* Export Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Export Data</h2>
              <p className="text-muted-foreground text-sm">
                Download all your data (achievements, projects, companies, and
                documents) as a JSON file. This can be used as a backup or to
                transfer your data.
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
            >
              <IconDownload />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>

          {/* Divider */}
          <div className="border-border border-t" />

          {/* Import Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Import Data</h2>
              <p className="text-muted-foreground text-sm">
                Import data from a previously exported JSON file. Existing items
                with the same ID will be skipped to avoid duplicates. All
                imported data will be associated with your current account.
              </p>
            </div>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                id="import-file"
                className="hidden"
              />
              <Button asChild variant="outline" disabled={isImporting}>
                <label htmlFor="import-file" className="cursor-pointer">
                  <IconUpload />
                  {isImporting ? 'Importing...' : 'Import Data'}
                </label>
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
