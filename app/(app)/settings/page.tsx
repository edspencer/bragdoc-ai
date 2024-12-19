"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-medium">Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Account settings coming soon...
          </div>
        </TabsContent>
        <TabsContent value="github" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            GitHub integration settings coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
