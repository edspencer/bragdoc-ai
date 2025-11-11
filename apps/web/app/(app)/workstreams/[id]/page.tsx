import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { Badge } from '@/components/ui/badge';
import {
  getWorkstreamById,
  getAchievementsByWorkstreamId,
} from '@bragdoc/database';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { formatDistanceToNow } from 'date-fns';

interface WorkstreamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkstreamDetailPage({
  params,
}: WorkstreamDetailPageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return <div className="p-4">Please log in.</div>;
  }

  const workstream = await getWorkstreamById(id);

  if (!workstream || workstream.userId !== session.user.id) {
    return <div className="p-4">Workstream not found.</div>;
  }

  const achievements = await getAchievementsByWorkstreamId(id);

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title={workstream.name} />
        <AppContent>
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: workstream.color || '#3B82F6' }}
              />
              <h1 className="text-3xl font-bold">{workstream.name}</h1>
            </div>
            {workstream.description && (
              <p className="text-muted-foreground mt-2">
                {workstream.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              {achievements.length} achievements
            </p>
          </div>

          {achievements.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Achievements in this Workstream</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{achievement.title}</h3>
                          {achievement.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {achievement.summary}
                            </p>
                          )}
                        </div>
                        {achievement.eventStart && (
                          <Badge
                            variant="outline"
                            className="text-xs whitespace-nowrap ml-2"
                          >
                            {formatDistanceToNow(
                              new Date(achievement.eventStart),
                              {
                                addSuffix: true,
                              },
                            )}
                          </Badge>
                        )}
                      </div>
                      {achievement.details && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {achievement.details}
                        </p>
                      )}
                      {achievement.impact && (
                        <div className="text-sm">
                          <Badge variant="secondary">
                            Impact: {achievement.impact}/10
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No achievements in this workstream yet.
              </p>
            </div>
          )}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
