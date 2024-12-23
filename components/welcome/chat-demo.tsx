"use client";

import * as React from "react";
import { AnimatedText } from "./animated-text";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const EXAMPLE_MESSAGE =
  "I fixed up the bugs with the autofocus dashboard generation and we launched autofocus version 2.1 this morning. I also added a new feature to do custom printing jobs.";

const EXTRACTED_ACHIEVEMENTS = [
  "Fixed bugs in autofocus dashboard generation",
  "Launched autofocus version 2.1",
  "Added custom printing jobs feature",
];

export function ChatDemo() {
  const [showAchievements, setShowAchievements] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <Avatar>
            <div className="bg-primary text-primary-foreground h-full w-full flex items-center justify-center text-sm font-medium">
              U
            </div>
          </Avatar>
          <AnimatedText
            text={EXAMPLE_MESSAGE}
            className="text-sm"
            onComplete={() => setShowAchievements(true)}
          />
        </div>
      </Card>

      {showAchievements && (
        <div className="pl-12">
          <div className="flex flex-col gap-2">
            {EXTRACTED_ACHIEVEMENTS.map((achievement, index) => (
              <motion.div
                key={achievement}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.5 }}
              >
                <Card className="p-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">
                      Achievement
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{achievement}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
