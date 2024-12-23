"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export interface WelcomeCardProps {
  title: string;
  description: string;
  image?: string;
  demo?: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export function WelcomeCard({
  title,
  description,
  image,
  demo,
  isActive = false,
  className,
}: WelcomeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
      transition={{ duration: 0.3 }}
      className={cn("absolute inset-0", className)}
      style={{ pointerEvents: isActive ? "auto" : "none" }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-6">
          {image && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title}
                className="object-cover"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          )}
          {demo && <div className="w-full">{demo}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
