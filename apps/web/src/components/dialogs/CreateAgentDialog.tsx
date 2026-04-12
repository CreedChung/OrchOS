import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "#/lib/utils"
import { m } from "#/paraglide/messages"
import type { AgentProfile } from "#/lib/types"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "#/components/ui/select"

const CAPABILITY_OPTIONS = [
  { value: "write_code", label: "Write Code" },
  { value: "fix_bug", label: "Fix Bug" },
  { value: "run_tests", label: "Run Tests" },
  { value: "commit", label: "Commit" },
  { value: "review", label: "Review" },
]

interface CreateAgentDialogProps {
  open: boolean
  onClose: () => void
  runtimes: AgentProfile[]
  onSubmit: (data: { name: string; role: string; capabilities: string[]; model: string; cliCommand?: string; runtimeId?: string }) => void
}

export function CreateAgentDialog({ open, onClose, runtimes, onSubmit }: CreateAgentDialogProps) {
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [runtimeId, setRuntimeId] = useState<string | null>(null)
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])
  const [model, setModel] = useState("")

  if (!open) return null

  const selectedRuntime = runtimes.find((r) => r.id === runtimeId)

  const handleRuntimeChange = (id: string) => {
    setRuntimeId(id)
    const rt = runtimes.find((r) => r.id === id)
    if (rt) {
      setModel(rt.model)
      setSelectedCapabilities([...rt.capabilities])
    }
  }

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim() || selectedCapabilities.length === 0) return
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      capabilities: selectedCapabilities,
      model: model.trim() || (selectedRuntime?.model ?? "local/custom"),
      cliCommand: selectedRuntime?.cliCommand,
      runtimeId: runtimeId ?? undefined,
    })
    setName("")
    setRole("")
    setRuntimeId(null)
    setSelectedCapabilities([])
    setModel("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{m.create_agent()}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.agent_name()}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.agent_name_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.agent_role()}
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={m.agent_role_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Runtime */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.agent_runtime()}
            </label>
            {runtimes.length > 0 ? (
              <Select value={runtimeId ?? ""} onValueChange={handleRuntimeChange}>
                <SelectTrigger>
                  <span className="flex-1 text-start truncate">
                    {selectedRuntime ? selectedRuntime.name : m.agent_runtime_placeholder()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {runtimes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name} — {rt.model}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-dashed border-border/50 bg-muted/20 px-3 py-3 text-center">
                <p className="text-xs text-muted-foreground">{m.no_runtimes_registered()}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{m.no_runtimes_registered_desc()}</p>
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.agent_capabilities()}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button
                  key={cap.value}
                  type="button"
                  onClick={() => toggleCapability(cap.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedCapabilities.includes(cap.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-accent"
                  )}
                >
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.agent_model()}
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={m.agent_model_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {m.cancel()}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !role.trim() || selectedCapabilities.length === 0}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                name.trim() && role.trim() && selectedCapabilities.length > 0
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {m.create_agent()}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
