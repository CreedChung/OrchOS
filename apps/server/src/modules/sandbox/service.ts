import { AgentOs, createHostDirBackend, createInMemoryFileSystem } from "@rivet-dev/agent-os-core"
import type { AgentOs as AgentOsType, SequencedEvent, PermissionReply, CreateSessionOptions } from "@rivet-dev/agent-os-core"
import common from "@rivet-dev/agent-os-common"
import { orchosToolkit } from "./tools"
import { ProjectService } from "../project/service"
import { db } from "../../db"
import { sandboxes } from "../../db/schema"
import { eq } from "drizzle-orm"
import { generateId, timestamp } from "../../utils"
import { eventBus } from "../event/event-bus"

interface VMInstance {
  vm: AgentOsType
  vmId: string
  projectId: string
  agentType: string
  status: "creating" | "running" | "disposed" | "error"
  sessions: Map<string, { sessionId: string; agentType: string; status: "active" | "closed"; createdAt: string }>
  createdAt: string
}

const vmInstances = new Map<string, VMInstance>()

const DEFAULT_AGENT_TYPE = "pi"

export abstract class SandboxService {
  static async createVM(options: {
    projectId: string
    agentType?: string
    additionalInstructions?: string
    readOnlyMount?: boolean
  }): Promise<VMInstance> {
    const project = ProjectService.get(options.projectId)
    if (!project) throw new Error("Project not found")

    const vmId = generateId("vm")
    const agentType = options.agentType || DEFAULT_AGENT_TYPE

    const instance: VMInstance = {
      vm: null as any,
      vmId,
      projectId: options.projectId,
      agentType,
      status: "creating",
      sessions: new Map(),
      createdAt: timestamp(),
    }

    vmInstances.set(vmId, instance)

    try {
      const mounts: any[] = [
        // Read-write working directory inside the VM
        { path: "/home/user/workspace", driver: createInMemoryFileSystem() },
      ]

      // Mount the project directory from the host (read-only by default)
      if (project.path) {
        mounts.push({
          path: "/home/user/project",
          driver: createHostDirBackend({ hostPath: project.path }),
          readOnly: options.readOnlyMount !== false,
        })
      }

      const vm = await AgentOs.create({
        software: [common],
        mounts,
        toolKits: [orchosToolkit],
        additionalInstructions: options.additionalInstructions || "You are an agent running inside OrchOS sandbox. Use /home/user/project for reading project files and /home/user/workspace for writing output.",
      })

      instance.vm = vm
      instance.status = "running"

      // Persist to database
      db.insert(sandboxes).values({
        id: vmId,
        projectId: options.projectId,
        agentType,
        status: "running",
        createdAt: instance.createdAt,
      }).run()

      eventBus.emit("sandbox_created", { vmId, projectId: options.projectId }, undefined)
      return instance
    } catch (err) {
      instance.status = "error"
      throw err
    }
  }

  static getVM(vmId: string): VMInstance | undefined {
    return vmInstances.get(vmId)
  }

  static listVMs(): Array<{
    vmId: string
    projectId: string
    status: string
    agentType: string
    sessions: number
    createdAt: string
  }> {
    return Array.from(vmInstances.values()).map((inst) => ({
      vmId: inst.vmId,
      projectId: inst.projectId,
      status: inst.status,
      agentType: inst.agentType,
      sessions: inst.sessions.size,
      createdAt: inst.createdAt,
    }))
  }

  static async disposeVM(vmId: string): Promise<boolean> {
    const instance = vmInstances.get(vmId)
    if (!instance) return false

    try {
      // Close all sessions first
      for (const [sessionId] of instance.sessions) {
        try { instance.vm.closeSession(sessionId) } catch {}
      }

      await instance.vm.dispose()
      instance.status = "disposed"
      vmInstances.delete(vmId)

      db.update(sandboxes).set({ status: "disposed" }).where(eq(sandboxes.id, vmId)).run()
      eventBus.emit("sandbox_disposed", { vmId }, undefined)
      return true
    } catch (err) {
      instance.status = "error"
      return false
    }
  }

  static async createSession(
    vmId: string,
    options?: {
      agentType?: string
      cwd?: string
      env?: Record<string, string>
      additionalInstructions?: string
      mcpServers?: CreateSessionOptions["mcpServers"]
    }
  ): Promise<{ sessionId: string; agentType: string }> {
    const instance = vmInstances.get(vmId)
    if (!instance) throw new Error("VM not found")
    if (instance.status !== "running") throw new Error(`VM is not running (status: ${instance.status})`)

    const agentType = options?.agentType || instance.agentType

    const sessionOpts: CreateSessionOptions = {
      cwd: options?.cwd || "/home/user/workspace",
      env: options?.env,
      additionalInstructions: options?.additionalInstructions,
      mcpServers: options?.mcpServers,
    }

    const { sessionId } = await instance.vm.createSession(agentType, sessionOpts)

    // Set up permission handler: auto-approve reads, queue writes for approval
    instance.vm.onPermissionRequest(sessionId, (request) => {
      const desc = (request as any).description || ""
      const toolName = (request as any).toolName || ""

      // Auto-approve read operations
      if (desc.toLowerCase().includes("read") || toolName.toLowerCase().includes("read")) {
        instance.vm.respondPermission(sessionId, request.permissionId, "always")
        return
      }

      // For write operations, auto-approve if they target the workspace directory
      const path = (request as any).path || ""
      if (path.startsWith("/home/user/workspace")) {
        instance.vm.respondPermission(sessionId, request.permissionId, "once")
        return
      }

      // Default: auto-approve for now (can be configured later for human-in-the-loop)
      instance.vm.respondPermission(sessionId, request.permissionId, "once")
    })

    // Stream session events to the event bus
    instance.vm.onSessionEvent(sessionId, (event) => {
      eventBus.emit("sandbox_session_event", {
        vmId,
        sessionId,
        method: event.method,
        params: event.params,
      }, undefined)
    })

    const sessionRecord = {
      sessionId,
      agentType,
      status: "active" as const,
      createdAt: timestamp(),
    }
    instance.sessions.set(sessionId, sessionRecord)

    return { sessionId, agentType }
  }

  static async sendPrompt(sessionId: string, text: string): Promise<{
    sessionId: string
    text: string
    success: boolean
  }> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    try {
      const result = await instance.vm.prompt(sessionId, text)
      return {
        sessionId,
        text: result.text,
        success: true,
      }
    } catch (err) {
      return {
        sessionId,
        text: err instanceof Error ? err.message : String(err),
        success: false,
      }
    }
  }

  static async cancelPrompt(sessionId: string): Promise<boolean> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    try {
      await instance.vm.cancelSession(sessionId)
      return true
    } catch {
      return false
    }
  }

  static getSessionEvents(sessionId: string, since?: number): Array<{
    sequenceNumber: number
    method: string
    params: any
  }> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    const events = instance.vm.getSessionEvents(sessionId, since !== undefined ? { since } : undefined)
    return events.map((e) => ({
      sequenceNumber: e.sequenceNumber,
      method: (e.notification as any).method || "unknown",
      params: (e.notification as any).params || {},
    }))
  }

  static async respondPermission(
    sessionId: string,
    permissionId: string,
    reply: PermissionReply
  ): Promise<void> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    await instance.vm.respondPermission(sessionId, permissionId, reply)
  }

  static async setSessionModel(sessionId: string, model: string): Promise<void> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    await instance.vm.setSessionModel(sessionId, model)
  }

  static async setSessionMode(sessionId: string, mode: string): Promise<void> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    await instance.vm.setSessionMode(sessionId, mode)
  }

  static async setSessionThoughtLevel(sessionId: string, level: string): Promise<void> {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    await instance.vm.setSessionThoughtLevel(sessionId, level)
  }

  static closeSession(sessionId: string): void {
    const instance = this.findInstanceBySession(sessionId)
    if (!instance) throw new Error("Session not found")

    instance.vm.closeSession(sessionId)
    const session = instance.sessions.get(sessionId)
    if (session) {
      session.status = "closed"
    }
    instance.sessions.delete(sessionId)
  }

  // File operations delegated to the VM
  static async writeFile(vmId: string, path: string, content: string): Promise<void> {
    const instance = vmInstances.get(vmId)
    if (!instance || instance.status !== "running") throw new Error("VM not found or not running")
    await instance.vm.writeFile(path, content)
  }

  static async readFile(vmId: string, path: string): Promise<string> {
    const instance = vmInstances.get(vmId)
    if (!instance || instance.status !== "running") throw new Error("VM not found or not running")
    const content = await instance.vm.readFile(path)
    return new TextDecoder().decode(content)
  }

  static async execInVM(vmId: string, command: string): Promise<{ success: boolean; output: string; exitCode: number }> {
    const instance = vmInstances.get(vmId)
    if (!instance || instance.status !== "running") throw new Error("VM not found or not running")
    const result = await instance.vm.exec(command)
    return { success: result.exitCode === 0, output: result.stdout, exitCode: result.exitCode }
  }

  // --- Helper ---

  private static findInstanceBySession(sessionId: string): VMInstance | undefined {
    for (const instance of vmInstances.values()) {
      if (instance.sessions.has(sessionId)) return instance
    }
    return undefined
  }

  // --- Database helpers ---

  static listFromDB(): Array<{ id: string; projectId: string; agentType: string; status: string; createdAt: string }> {
    return db.select().from(sandboxes).all().map((row) => ({
      id: row.id,
      projectId: row.projectId || "",
      agentType: row.agentType,
      status: row.status,
      createdAt: row.createdAt,
    }))
  }
}
