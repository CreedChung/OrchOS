import { spawn } from "bun"

export interface ExecutionResult {
  success: boolean
  output: string
  error?: string
  exitCode: number
}

export interface ExecutorConfig {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

const DEFAULT_TIMEOUT = 60000

export const executor = {
  async run(command: string, config: ExecutorConfig = {}): Promise<ExecutionResult> {
    const { cwd = process.cwd(), timeout = DEFAULT_TIMEOUT, env = {} } = config

    try {
      const proc = spawn({
        cmd: ["sh", "-c", command],
        cwd,
        env: { ...process.env, ...env },
        stdout: "pipe",
        stderr: "pipe",
      })

      const timer = setTimeout(() => { proc.kill() }, timeout)

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])

      clearTimeout(timer)
      const exitCode = await proc.exited

      return { success: exitCode === 0, output: stdout, error: stderr || undefined, exitCode }
    } catch (err) {
      return { success: false, output: "", error: err instanceof Error ? err.message : String(err), exitCode: 1 }
    }
  },

  async git(args: string, cwd?: string): Promise<ExecutionResult> {
    return this.run(`git ${args}`, { cwd })
  },

  async gitStatus(cwd?: string): Promise<{ branch: string; modified: string[]; staged: string[]; untracked: string[] }> {
    const result = await this.git("status --porcelain", cwd)
    if (!result.success) throw new Error(result.error || "git status failed")

    const lines = result.output.trim().split("\n").filter(Boolean)
    const modified: string[] = []
    const staged: string[] = []
    const untracked: string[] = []

    for (const line of lines) {
      const s = line.slice(0, 2)
      const file = line.slice(3)
      if (s.includes("?")) untracked.push(file)
      else if (s[0] !== " ") staged.push(file)
      else if (s[1] !== " ") modified.push(file)
    }

    const branchResult = await this.git("rev-parse --abbrev-ref HEAD", cwd)
    return { branch: branchResult.output.trim() || "unknown", modified, staged, untracked }
  },

  async gitLog(cwd?: string, limit: number = 10): Promise<{ hash: string; message: string; author: string; date: string }[]> {
    const result = await this.git(`log --oneline -${limit} --pretty=format:"%h|%s|%an|%ad" --date=short`, cwd)
    if (!result.success) return []
    return result.output.trim().split("\n").filter(Boolean).map((line) => {
      const [hash, message, author, date] = line.split("|")
      return { hash, message, author, date }
    })
  },

  async checkTools(): Promise<Record<string, boolean>> {
    const tools = ["git", "node", "npm", "pnpm", "yarn", "bun"]
    const results: Record<string, boolean> = {}
    for (const tool of tools) {
      try {
        const result = await this.run(`which ${tool}`)
        results[tool] = result.success
      } catch { results[tool] = false }
    }
    return results
  },

  async runTests(cwd?: string): Promise<ExecutionResult> {
    const commands = ["bun test", "npm test", "pnpm test", "yarn test", "npm run test", "pnpm run test", "yarn run test"]
    for (const cmd of commands) {
      const result = await this.run(cmd, { cwd, timeout: 120000 })
      if (result.exitCode !== 127) return result
    }
    return { success: false, output: "", error: "No test runner found", exitCode: 127 }
  },

  async runBuild(cwd?: string): Promise<ExecutionResult> {
    const commands = ["bun run build", "npm run build", "pnpm run build", "yarn run build"]
    for (const cmd of commands) {
      const result = await this.run(cmd, { cwd, timeout: 180000 })
      if (result.exitCode !== 127) return result
    }
    return { success: false, output: "", error: "No build script found", exitCode: 127 }
  },

  async runLint(cwd?: string): Promise<ExecutionResult> {
    const commands = ["bun run lint", "npm run lint", "pnpm run lint", "yarn run lint"]
    for (const cmd of commands) {
      const result = await this.run(cmd, { cwd, timeout: 120000 })
      if (result.exitCode !== 127) return result
    }
    return { success: false, output: "", error: "No lint script found", exitCode: 127 }
  },

  async getProjectInfo(cwd: string): Promise<{ name: string; packageManager: string; hasTests: boolean; hasBuild: boolean }> {
    const name = cwd.split("/").pop() || "unknown"
    let packageManager = "unknown"
    let hasTests = false
    let hasBuild = false

    const checkFile = async (filename: string): Promise<boolean> => {
      const result = await this.run(`test -f ${filename} && echo "exists" || echo "missing"`, { cwd })
      return result.output.trim() === "exists"
    }

    if (await checkFile("bun.lockb")) packageManager = "bun"
    else if (await checkFile("pnpm-lock.yaml")) packageManager = "pnpm"
    else if (await checkFile("yarn.lock")) packageManager = "yarn"
    else if (await checkFile("package-lock.json")) packageManager = "npm"

    const result = await this.run("cat package.json 2>/dev/null || echo '{}'", { cwd })
    try {
      const pkg = JSON.parse(result.output)
      hasTests = !!(pkg.scripts?.test || pkg.scripts?.["test:watch"])
      hasBuild = !!(pkg.scripts?.build)
    } catch {}

    return { name, packageManager, hasTests, hasBuild }
  },
}
