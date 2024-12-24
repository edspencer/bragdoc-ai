"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BuildingIcon, FolderIcon, } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

interface ActionButtonsProps {
  className?: string;
  onCompanyCreate?: (name: string) => void;
  onProjectCreate?: (name: string) => void;
}

export function ActionButtons({
  className,
  onCompanyCreate,
  onProjectCreate,
}: ActionButtonsProps) {
  const [companyName, setCompanyName] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const CompanyDialog = isDesktop ? Dialog : Drawer;
  const CompanyDialogContent = isDesktop ? DialogContent : DrawerContent;
  const CompanyDialogHeader = isDesktop ? DialogHeader : DrawerHeader;
  const CompanyDialogFooter = isDesktop ? DialogFooter : DrawerFooter;
  const CompanyDialogTitle = isDesktop ? DialogTitle : DrawerTitle;
  const CompanyDialogDescription = isDesktop ? DialogDescription : DrawerDescription;
  const CompanyDialogTrigger = isDesktop ? DialogTrigger : DrawerTrigger;

  const ProjectDialog = isDesktop ? Dialog : Drawer;
  const ProjectDialogContent = isDesktop ? DialogContent : DrawerContent;
  const ProjectDialogHeader = isDesktop ? DialogHeader : DrawerHeader;
  const ProjectDialogFooter = isDesktop ? DialogFooter : DrawerFooter;
  const ProjectDialogTitle = isDesktop ? DialogTitle : DrawerTitle;
  const ProjectDialogDescription = isDesktop ? DialogDescription : DrawerDescription;
  const ProjectDialogTrigger = isDesktop ? DialogTrigger : DrawerTrigger;

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompanyCreate?.(companyName);
    setCompanyName("");
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProjectCreate?.(projectName);
    setProjectName("");
  };

  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:gap-4", className)}>
      <CompanyDialog>
        <CompanyDialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2 md:w-auto">
            <BuildingIcon className="size-4" />
            Add Company
          </Button>
        </CompanyDialogTrigger>
        <CompanyDialogContent>
          <form onSubmit={handleCompanySubmit}>
            <CompanyDialogHeader>
              <CompanyDialogTitle>Add Company</CompanyDialogTitle>
              <CompanyDialogDescription>
                Add a new company to organize your achievements.
              </CompanyDialogDescription>
            </CompanyDialogHeader>
            <div className="py-4">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-2"
                placeholder="e.g., Acme Corp"
              />
            </div>
            <CompanyDialogFooter>
              <Button type="submit" disabled={!companyName.trim()}>
                Add Company
              </Button>
            </CompanyDialogFooter>
          </form>
        </CompanyDialogContent>
      </CompanyDialog>

      <ProjectDialog>
        <ProjectDialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2 md:w-auto">
            <FolderIcon className="size-4" />
            Add Project
          </Button>
        </ProjectDialogTrigger>
        <ProjectDialogContent>
          <form onSubmit={handleProjectSubmit}>
            <ProjectDialogHeader>
              <ProjectDialogTitle>Add Project</ProjectDialogTitle>
              <ProjectDialogDescription>
                Add a new project to organize your achievements.
              </ProjectDialogDescription>
            </ProjectDialogHeader>
            <div className="py-4">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-2"
                placeholder="e.g., Dashboard Redesign"
              />
            </div>
            <ProjectDialogFooter>
              <Button type="submit" disabled={!projectName.trim()}>
                Add Project
              </Button>
            </ProjectDialogFooter>
          </form>
        </ProjectDialogContent>
      </ProjectDialog>
    </div>
  );
}
