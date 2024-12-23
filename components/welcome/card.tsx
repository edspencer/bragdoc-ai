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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isActive ? 1 : 0,
        scale: isActive ? 1 : 0.95,
        display: isActive ? "block" : "none"
      }}
      transition={{ duration: 0.3 }}
      className={cn("flex-shrink-0 w-full", className)}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-6">
          {image && (
            <div className="w-full overflow-hidden rounded-lg aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={title}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          {demo && <div className="w-full">{demo}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
