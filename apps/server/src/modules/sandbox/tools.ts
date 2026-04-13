import { toolKit, hostTool } from "@rivet-dev/agent-os-core"
import { z } from "zod"
import { ProjectService } from "../project/service"
import { executor } from "../execution/executor"

export const orchosToolkit = toolKit({
  name: "orchos",
  description: "OrchOS project management tools — clone repos, get project info, run tests and builds",
  tools: {
    gitClone: hostTool({
      description: "Clone a git repository by project ID. Returns the clone output and target path.",
      inputSchema: z.object({
        projectId: z.string().describe("The OrchOS project ID to clone"),
        force: z.boolean().optional().describe("Overwrite existing directory if true"),
      }),
      execute: async (input) => {
        const result = await ProjectService.clone(input.projectId, { force: input.force })
        return { success: result.success, output: result.output, error: result.error, path: result.path }
      },
      examples: [
        { description: "Clone a project repo", input: { projectId: "proj_abc123" } },
        { description: "Force re-clone", input: { projectId: "proj_abc123", force: true } },
      ],
    }),

    projectInfo: hostTool({
      description: "Get information about an OrchOS project by ID",
      inputSchema: z.object({
        projectId: z.string().describe("The OrchOS project ID"),
      }),
      execute: async (input) => {
        const project = ProjectService.get(input.projectId)
        if (!project) return { success: false, error: "Project not found" }
        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
            path: project.path,
            repositoryUrl: project.repositoryUrl,
          },
        }
      },
      examples: [
        { description: "Get project details", input: { projectId: "proj_abc123" } },
      ],
    }),

    runTests: hostTool({
      description: "Run tests in a project directory on the host",
      inputSchema: z.object({
        projectPath: z.string().describe("Absolute path to the project on the host"),
      }),
      execute: async (input) => {
        const result = await executor.runTests(input.projectPath)
        return { success: result.success, output: result.output, error: result.error, exitCode: result.exitCode }
      },
      examples: [
        { description: "Run tests for a project", input: { projectPath: "/home/user/my-project" } },
      ],
    }),

    runBuild: hostTool({
      description: "Run build in a project directory on the host",
      inputSchema: z.object({
        projectPath: z.string().describe("Absolute path to the project on the host"),
      }),
      execute: async (input) => {
        const result = await executor.runBuild(input.projectPath)
        return { success: result.success, output: result.output, error: result.error, exitCode: result.exitCode }
      },
      examples: [
        { description: "Build a project", input: { projectPath: "/home/user/my-project" } },
      ],
    }),

    gitStatus: hostTool({
      description: "Get git status of a project directory on the host",
      inputSchema: z.object({
        projectPath: z.string().describe("Absolute path to the project on the host"),
      }),
      execute: async (input) => {
        const result = await executor.gitStatus(input.projectPath)
        return { success: true, ...result }
      },
      examples: [
        { description: "Check git status", input: { projectPath: "/home/user/my-project" } },
      ],
    }),
  },
})
