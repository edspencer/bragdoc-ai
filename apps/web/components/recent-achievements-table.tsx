'use client';

import * as React from 'react';
import {
  IconStar,
  IconStarFilled,
  IconBuilding,
  IconFolder,
  IconCalendar,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock achievement data - in real app this would come from your database
const mockAchievements = [
  {
    id: 1,
    title: 'Implemented new authentication system',
    project: 'User Management Portal',
    company: 'TechCorp Inc',
    impactRating: 8,
    dateAdded: new Date('2024-01-15'),
    category: 'Technical',
  },
  {
    id: 2,
    title: 'Led team of 5 developers on mobile app redesign',
    project: 'Mobile App v2.0',
    company: 'TechCorp Inc',
    impactRating: 9,
    dateAdded: new Date('2024-01-12'),
    category: 'Leadership',
  },
  {
    id: 3,
    title: 'Reduced API response time by 40%',
    project: 'Performance Optimization',
    company: 'StartupXYZ',
    impactRating: 7,
    dateAdded: new Date('2024-01-10'),
    category: 'Technical',
  },
  {
    id: 4,
    title: 'Mentored 3 junior developers',
    project: 'Team Development',
    company: 'TechCorp Inc',
    impactRating: 6,
    dateAdded: new Date('2024-01-08'),
    category: 'Mentoring',
  },
  {
    id: 5,
    title: 'Delivered presentation to 50+ stakeholders',
    project: 'Q4 Strategy Review',
    company: 'StartupXYZ',
    impactRating: 8,
    dateAdded: new Date('2024-01-05'),
    category: 'Communication',
  },
];

function StarRating({
  rating,
  onRatingChange,
}: { rating: number; onRatingChange: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="icon"
          className="size-4 p-0 hover:bg-transparent"
          onClick={() => onRatingChange(star)}
        >
          {star <= rating ? (
            <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
          ) : (
            <IconStar className="size-3 text-muted-foreground hover:text-yellow-400" />
          )}
        </Button>
      ))}
    </div>
  );
}

export function RecentAchievementsTable() {
  const [achievements, setAchievements] = React.useState(mockAchievements);

  const handleRatingChange = (id: number, newRating: number) => {
    setAchievements((prev) =>
      prev.map((achievement) =>
        achievement.id === id
          ? { ...achievement, impactRating: newRating }
          : achievement,
      ),
    );
    // In real app, this would make an API call to update the database
    console.log(`[v0] Updated achievement ${id} rating to ${newRating}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Achievements</CardTitle>
        <CardDescription>
          Your latest accomplishments with impact ratings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Achievement</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Impact Rating</TableHead>
                <TableHead>Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {achievements.map((achievement) => (
                <TableRow key={achievement.id}>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium line-clamp-2">
                        {achievement.title}
                      </div>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {achievement.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconFolder className="size-4 text-muted-foreground" />
                      <span className="text-sm">{achievement.project}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconBuilding className="size-4 text-muted-foreground" />
                      <span className="text-sm">{achievement.company}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StarRating
                        rating={achievement.impactRating}
                        onRatingChange={(rating) =>
                          handleRatingChange(achievement.id, rating)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {achievement.impactRating}/10
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="size-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(achievement.dateAdded, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
