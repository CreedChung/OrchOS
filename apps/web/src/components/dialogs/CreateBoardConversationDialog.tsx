import { useEffect, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/app-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface CreateBoardConversationDialogProps {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    description: string;
    projectId?: string;
    dueDate?: string;
    priority: "low" | "medium" | "high";
    tags: string[];
    subtasks: string[];
  }) => Promise<void> | void;
}

function priorityColor(priority: "low" | "medium" | "high") {
  if (priority === "low") return "text-emerald-600 dark:text-emerald-400";
  if (priority === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function CreateBoardConversationDialog({
  open,
  projects,
  onClose,
  onSubmit,
}: CreateBoardConversationDialogProps) {
  const availableProjects = projects ?? [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [tags, setTags] = useState("");
  const [subtasks, setSubtasks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setProjectId("");
      setDueDate("");
      setPriority("medium");
      setTags("");
      setSubtasks("");
      setSubmitting(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || submitting) {
      return;
    }

    const parsedTags = tags
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const parsedSubtasks = subtasks
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await onSubmit({
        title: nextTitle,
        description: description.trim(),
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
        priority,
        tags: parsedTags,
        subtasks: parsedSubtasks,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title="Add to board"
      description="Create a lightweight to-do item with the details you would expect on a normal board card."
      size="lg"
      bodyClassName="pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form="create-board-conversation-form" disabled={!title.trim() || submitting}>
            {submitting ? "Creating..." : "Create"}
          </Button>
        </>
      }
      >
      <form id="create-board-conversation-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-title" className="text-sm font-medium text-foreground">
                Title
              </label>
              <Input
                id="create-board-title"
                ref={inputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Follow up with design on toolbar spacing"
              />
            </fieldset>

            <fieldset className="space-y-1.5">
              <label htmlFor="create-board-description" className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                id="create-board-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add any context, links, or follow-up notes for this to-do item."
                className="min-h-28 resize-y"
              />
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <fieldset className="space-y-1.5">
                <label htmlFor="create-board-project" className="text-sm font-medium text-foreground">
                  Project
                </label>
                <Select
                  value={projectId}
                  onValueChange={(value) => setProjectId(value ?? "")}
                >
                  <SelectTrigger id="create-board-project" className="w-full">
                    <SelectValue>
                      {availableProjects.find((project) => project.id === projectId)?.name ?? "No linked project"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No linked project</SelectItem>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </fieldset>

              <fieldset className="space-y-1.5">
                <label htmlFor="create-board-due-date" className="text-sm font-medium text-foreground">
                  Due date
                </label>
                <Input
                  id="create-board-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </fieldset>

              <fieldset className="space-y-1.5">
                <label htmlFor="create-board-priority" className="text-sm font-medium text-foreground">
                  Priority
                </label>
                <Select
                  value={priority}
                  onValueChange={(value) => {
                    if (value === "low" || value === "medium" || value === "high") {
                      setPriority(value);
                    }
                  }}
                >
                  <SelectTrigger id="create-board-priority" className="w-full">
                    <SelectValue>
                      {priority === "low" ? "Low" : priority === "medium" ? "Medium" : "High"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </fieldset>
            </div>
          </div>

          <Card size="sm" className="h-fit">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>To-do card shape</CardTitle>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground [text-wrap:pretty]">
                    Keep this closer to a board card than a project brief.
                  </p>
                </div>
                <Badge variant="outline" className={cn("capitalize", priorityColor(priority))}>
                  {priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="text-sm font-medium text-foreground [text-wrap:balance]">
                  {title.trim() || "A short, actionable title will read best here"}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground [text-wrap:pretty]">
                  {description.trim() || "Use notes for context, decisions, links, or follow-up details that should stay attached to the card."}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{dueDate || "No due date"}</Badge>
                  <Badge variant="outline">
                    {availableProjects.find((project) => project.id === projectId)?.name ?? "Inbox"}
                  </Badge>
                </div>
              </div>
              <div className="text-xs leading-6 text-muted-foreground">
                <p>Tags and subtasks use one line per item.</p>
                <p>Keep the title concrete and let the notes hold the extra context.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset className="space-y-1.5">
            <label htmlFor="create-board-tags" className="text-sm font-medium text-foreground">
              Tags
            </label>
            <Textarea
              id="create-board-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={"Design\nFollow-up\nToolbar"}
              className="min-h-28 resize-y"
            />
          </fieldset>

          <fieldset className="space-y-1.5">
            <label htmlFor="create-board-subtasks" className="text-sm font-medium text-foreground">
              Subtasks
            </label>
            <Textarea
              id="create-board-subtasks"
              value={subtasks}
              onChange={(event) => setSubtasks(event.target.value)}
              placeholder={"Review current spacing\nPrepare updated mock\nShare with team"}
              className="min-h-28 resize-y"
            />
          </fieldset>
        </div>
      </form>
    </AppDialog>
  );
}
