import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, CloudIcon, Server } from "@hugeicons/core-free-icons"
import { cn } from "#/lib/utils"
import { m } from "#/paraglide/messages"
import type { RuntimeProfile } from "#/lib/types"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "#/components/ui/select"

const CAPABILITY_OPTIONS = [
  { value: "write_code", labelKey: "cap_write_code" },
  { value: "fix_bug", labelKey: "cap_fix_bug" },
  { value: "run_tests", labelKey: "cap_run_tests" },
  { value: "commit", labelKey: "cap_commit" },
  { value: "review", labelKey: "cap_review" },
] as const

const CAPABILITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  write_code: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  fix_bug: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/30" },
  run_tests: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  commit: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  review: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30" },
}

interface CreateAgentDialogProps {
  open: boolean
  onClose: () => void
  runtimes: RuntimeProfile[]
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
      cliCommand: selectedRuntime?.command,
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
                  <span className="flex items-center gap-1.5 flex-1 text-start truncate">
                    {selectedRuntime ? (
                      <>
                        {selectedRuntime.model.startsWith("local/") ? (
                          <HugeiconsIcon icon={Server} className="size-3.5 text-blue-500 dark:text-blue-400" />
                        ) : selectedRuntime.model.startsWith("cloud/") ? (
                          <HugeiconsIcon icon={CloudIcon} className="size-3.5 text-violet-500 dark:text-violet-400" />
                        ) : null}
                        <span>{selectedRuntime.name}</span>
                      </>
                    ) : m.agent_runtime_placeholder()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {runtimes.map((rt) => {
                      const isLocal = rt.model.startsWith("local/")
                      const isCloud = rt.model.startsWith("cloud/")
                      return (
                        <SelectItem key={rt.id} value={rt.id}>
                          <span className="flex items-center gap-2">
                            {isLocal ? (
                              <HugeiconsIcon icon={Server} className="size-3.5 text-blue-500 dark:text-blue-400" />
                            ) : isCloud ? (
                              <HugeiconsIcon icon={CloudIcon} className="size-3.5 text-violet-500 dark:text-violet-400" />
                            ) : null}
                            <span>{rt.name}</span>
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-dashed border-border/50 bg-muted/20 px-3 py-3 text-center">
                <p className="text-xs text-muted-foreground">{m.no_runtimes_registered()}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{m.no_runtimes_registered_desc()}</p>
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground/60">{m.create_agent_hint()}</p>
          </div>

          {/* Capabilities */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.agent_capabilities()}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map((cap) => {
                const colors = CAPABILITY_COLORS[cap.value]
                const isSelected = selectedCapabilities.includes(cap.value)
                return (
                  <button
                    key={cap.value}
                    type="button"
                    onClick={() => toggleCapability(cap.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {(m as Record<string, () => string>)[cap.labelKey]()}
                  </button>
                )
              })}
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
