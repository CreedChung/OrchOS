import { useState, useCallback } from "react"
import { cn } from "#/lib/utils"
import { Send, Bot, FolderGit2, X, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import type { AgentProfile, Project } from "#/lib/types"

interface CommandBarProps {
  open: boolean
  agents: AgentProfile[]
  projects: Project[]
  onSubmit: (data: { instruction: string; agentNames: string[]; projectIds: string[] }) => void
  onClose: () => void
}

export function CommandBar({ open, agents, projects, onSubmit, onClose }: CommandBarProps) {
  const [instruction, setInstruction] = useState("")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  const enabledAgents = agents.filter((a) => a.enabled)

  const toggleAgent = (name: string) => {
    setSelectedAgents((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!instruction.trim()) return
    onSubmit({
      instruction: instruction.trim(),
      agentNames: selectedAgents,
      projectIds: selectedProjects,
    })
    setInstruction("")
    setSelectedAgents([])
    setSelectedProjects([])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">New Command</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Instruction Input */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Command
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='e.g. "Implement login functionality, with tests passing"'
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              autoFocus
            />
          </div>

          {/* Agent Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Agents
            </label>
            <div className="flex flex-wrap gap-1.5">
              {enabledAgents.map((agent) => {
                const isSelected = selectedAgents.includes(agent.name)
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Bot className="size-3" />
                    {agent.name}
                    {agent.status === "active" && (
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                )
              })}
              {enabledAgents.length === 0 && (
                <span className="text-xs text-muted-foreground">No agents available</span>
              )}
            </div>
          </div>

          {/* Project / Context Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Context
            </label>
            <div className="flex flex-wrap gap-1.5">
              {projects.map((project) => {
                const isSelected = selectedProjects.includes(project.id)
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <FolderGit2 className="size-3" />
                    {project.name}
                  </button>
                )
              })}
              {projects.length === 0 && (
                <span className="text-xs text-muted-foreground">No projects configured</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">
              Command → Goal + initial Actions
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!instruction.trim()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  instruction.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="size-3.5" />
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
