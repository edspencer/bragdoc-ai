"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"
import { StandupForm } from "./standup-form"
import { RecentUpdatesTable } from "./recent-updates-table"
import { StandupUpdateSection } from "./standup-update-section"
import { WipSection } from "./wip-section"
import { IconEdit, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { StandupAchievementsTable } from "./standup-achievements-table"

interface Achievement {
  id: string
  title: string
  summary: string | null
  impact: number
  projectName: string | null
  companyName: string | null
  createdAt: Date
  source: string
}

interface StandupDocument {
  id: string
  date: Date
  quickSummary: string | null
  achievementsSummary: string | null
  wip: string | null
}

interface Standup {
  id: string
  name: string
  companyId: string | null
  projectIds: string[] | null
  daysMask: number
  meetingTime: string
  timezone: string
  instructions: string | null
}

interface ExistingStandupPageProps {
  standup: Standup
}

export function ExistingStandupContent({ standup }: ExistingStandupPageProps) {
  const router = useRouter()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAchievements, setSelectedAchievements] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [documents, setDocuments] = useState<StandupDocument[]>([])
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)

  // Fetch achievements
  useEffect(() => {
    async function fetchAchievements() {
      try {
        const response = await fetch(`/api/standups/${standup.id}/achievements?days=7`)
        if (response.ok) {
          const data = await response.json()
          setAchievements(data)
        }
      } catch (error) {
        console.error('Error fetching achievements:', error)
      } finally {
        setIsLoadingAchievements(false)
      }
    }
    fetchAchievements()
  }, [standup.id])

  // Fetch documents
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch(`/api/standups/${standup.id}/documents?limit=10`)
        if (response.ok) {
          const data = await response.json()
          setDocuments(data)
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setIsLoadingDocuments(false)
      }
    }
    fetchDocuments()
  }, [standup.id])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/standups/${standup.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete standup')
      }

      toast.success("Standup deleted successfully")
      setShowDeleteDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Error deleting standup:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete standup')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImpactChange = (id: string, impact: number) => {
    // TODO: Update achievement impact in database
    toast.success(`Impact updated to ${impact}`)
  }

  const handleViewDocument = (doc: any) => {
    // TODO: Show document in a dialog or navigate to detail view
    toast.info("Document viewer coming soon")
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b bg-background px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{standup.name}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <IconEdit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        {/* Left column */}
        <div className="space-y-6">
          <StandupAchievementsTable
            achievements={achievements}
            selectedAchievements={selectedAchievements}
            onSelectionChange={setSelectedAchievements}
            onImpactChange={handleImpactChange}
            isLoading={isLoadingAchievements}
          />
          <RecentUpdatesTable
            documents={documents}
            onViewDocument={handleViewDocument}
            isLoading={isLoadingDocuments}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <StandupUpdateSection
            standupId={standup.id}
            selectedAchievements={selectedAchievements}
            standupInstructions={standup.instructions || ''}
          />
          <WipSection standupId={standup.id} />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Standup</DialogTitle>
          </DialogHeader>
          <StandupForm
            initialData={{
              ...standup,
              projectIds: standup.projectIds || [],
              instructions: standup.instructions || undefined,
            }}
            isEdit
            onSuccess={() => {
              setShowEditDialog(false)
              router.refresh()
            }}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your standup and all associated updates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
