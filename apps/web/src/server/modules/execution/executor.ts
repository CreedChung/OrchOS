import { getRemoteExecutionAdapter } from "../../runtime/execution-adapter";

type BunSpawn = typeof import("bun").spawn;

let _spawn: BunSpawn | undefined;
async function getSpawn(): Promise<BunSpawn | undefined> {
  if (_spawn !== undefined) return _spawn;
  try {
    const bun = await import("bun");
    _spawn = bun.spawn;
    return _spawn;
  } catch {
    return undefined;
  }
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export interface ExecutorConfig {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

const DEFAULT_TIMEOUT = 60000;

export interface AgentCLIDefinition {
  id: string;
  name: string;
  command: string;
  versionFlag?: string;
  role: string;
  capabilities: string[];
  model: string;
  /** How to invoke this CLI with a prompt (stdin or args) */
  invokeTemplate?: {
    /** Command template: $PROMPT will be replaced with the test message */
    cmdTemplate: string;
    /** Text that indicates a successful response (substring match) */
    successIndicators: string[];
    /** Timeout override for this agent */
    timeout?: number;
  };
  /** How to query the current model from this CLI */
  modelQuery?: {
    /** Command to run to get the current model */
    cmd: string;
    /** Regex or index path to extract the model name from output */
    extractPattern?: string;
  };
}

const AGENT_CLI_REGISTRY: AgentCLIDefinition[] = [
  {
    id: "pi",
    name: "Pi",
    command: "pi",
    versionFlag: "--version",
    role: "Conversational AI assistant",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "local/pi",
    invokeTemplate: {
      cmdTemplate: "echo '$PROMPT' | pi --output-format text 2>&1 | head -20",
      successIndicators: ["pi"],
      timeout: 30000,
    },
  },
  {
    id: "claude-code",
    name: "Claude Code",
    command: "claude",
    versionFlag: "--version",
    role: "Code generation & reasoning",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "cloud/claude-sonnet-4",
    invokeTemplate: {
      cmdTemplate: `claude -p '$PROMPT' 2>&1 | head -20`,
      successIndicators: ["claude"],
      timeout: 60000,
    },
    modelQuery: {
      cmd: "claude --version 2>&1",
      extractPattern: "Claude Code",
    },
  },
  {
    id: "codex",
    name: "Codex",
    command: "codex",
    versionFlag: "--version",
    role: "Code generation & editing",
    capabilities: ["write_code", "fix_bug"],
    model: "local/codex",
    invokeTemplate: {
      cmdTemplate: `echo '$PROMPT' | codex 2>&1 | head -20`,
      successIndicators: ["codex", "CodeX"],
      timeout: 30000,
    },
  },
  {
    id: "opencode",
    name: "OpenCode",
    command: "opencode",
    versionFlag: "--version",
    role: "Open-source code generation",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "local/opencode",
    invokeTemplate: {
      cmdTemplate: `echo '$PROMPT' | opencode 2>&1 | head -20`,
      successIndicators: ["opencode", "OpenCode"],
      timeout: 30000,
    },
  },
  {
    id: "amp",
    name: "Amp",
    command: "amp",
    versionFlag: "--version",
    role: "AI-powered development",
    capabilities: ["write_code", "fix_bug", "run_tests"],
    model: "local/amp",
    invokeTemplate: {
      cmdTemplate: `echo '$PROMPT' | amp 2>&1 | head -20`,
      successIndicators: ["amp", "Amp"],
      timeout: 30000,
    },
  },
];

export interface DetectedAgentCLI {
  definition: AgentCLIDefinition;
  available: boolean;
  version?: string;
  path?: string;
}

export const executor = {
  async run(command: string, config: ExecutorConfig = {}): Promise<ExecutionResult> {
    const remoteAdapter = getRemoteExecutionAdapter();
    if (remoteAdapter) {
      return remoteAdapter.run(command, config);
    }

    const spawnFn = await getSpawn();
    if (!spawnFn) {
      return {
        success: false,
        output: "",
        error: "Executor not available in this environment",
        exitCode: 1,
      };
    }

    const { cwd = process.cwd(), timeout = DEFAULT_TIMEOUT, env = {} } = config;

    try {
      const mergedEnv = Object.fromEntries(
        Object.entries({ ...process.env, ...env }).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );

      const proc = spawnFn({
        cmd: ["sh", "-c", command],
        cwd,
        env: mergedEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      const timer = setTimeout(() => {
        proc.kill();
      }, timeout);

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      clearTimeout(timer);
      const exitCode = await proc.exited;

      return { success: exitCode === 0, output: stdout, error: stderr || undefined, exitCode };
    } catch (err) {
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
        exitCode: 1,
      };
    }
  },

  async git(args: string, cwd?: string): Promise<ExecutionResult> {
    return this.run(`git ${args}`, { cwd });
  },

  async gitStatus(
    cwd?: string,
  ): Promise<{ branch: string; modified: string[]; staged: string[]; untracked: string[] }> {
    const result = await this.git("status --porcelain", cwd);
    if (!result.success) throw new Error(result.error || "git status failed");

    const lines = result.output.trim().split("\n").filter(Boolean);
    const modified: string[] = [];
    const staged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const s = line.slice(0, 2);
      const file = line.slice(3);
      if (s.includes("?")) untracked.push(file);
      else if (s[0] !== " ") staged.push(file);
      else if (s[1] !== " ") modified.push(file);
    }

    const branchResult = await this.git("rev-parse --abbrev-ref HEAD", cwd);
    return { branch: branchResult.output.trim() || "unknown", modified, staged, untracked };
  },

  async gitLog(
    cwd?: string,
    limit: number = 10,
  ): Promise<{ hash: string; message: string; author: string; date: string }[]> {
    const result = await this.git(
      `log --oneline -${limit} --pretty=format:"%h|%s|%an|%ad" --date=short`,
      cwd,
    );
    if (!result.success) return [];
    return result.output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, author, date] = line.split("|");
        return { hash, message, author, date };
      });
  },

  async checkTools(): Promise<Record<string, boolean>> {
    const tools = ["git", "node", "npm", "pnpm", "yarn", "bun"];
    const results: Record<string, boolean> = {};
    for (const tool of tools) {
      try {
        const result = await this.run(`which ${tool}`);
        results[tool] = result.success;
      } catch {
        results[tool] = false;
      }
    }
    return results;
  },

  async detectAgentCLIs(): Promise<DetectedAgentCLI[]> {
    const results: DetectedAgentCLI[] = [];

    for (const agent of AGENT_CLI_REGISTRY) {
      const detected: DetectedAgentCLI = {
        definition: agent,
        available: false,
      };

      try {
        const whichResult = await this.run(`which ${agent.command}`);
        if (whichResult.success) {
          detected.available = true;
          detected.path = whichResult.output.trim();

          if (agent.versionFlag) {
            const versionResult = await this.run(`${agent.command} ${agent.versionFlag}`);
            if (versionResult.success) {
              const versionOutput = versionResult.output.trim().split("\n")[0].trim();
              // Extract version number only (e.g., "v2.1.86" from "Claude Code v2.1.86")
              const versionMatch = versionOutput.match(/v?\d+(\.\d+)+/);
              detected.version = versionMatch ? versionMatch[0] : versionOutput;
            }
          }
        }
      } catch {
        // Agent CLI not found
      }

      results.push(detected);
    }

    return results;
  },

  async testAgentCLI(
    agentId: string,
    options: { level?: "basic" | "ping" | "full"; prompt?: string } = {},
  ): Promise<{
    healthy: boolean;
    level: "basic" | "ping" | "full";
    output: string;
    error?: string;
    responseTime: number;
    agentName: string;
    agentCommand: string;
    authRequired?: boolean;
  }> {
    const agent = AGENT_CLI_REGISTRY.find((a) => a.id === agentId);
    if (!agent) {
      return {
        healthy: false,
        level: "basic",
        output: "",
        error: `Unknown agent ID: ${agentId}`,
        responseTime: 0,
        agentName: agentId,
        agentCommand: agentId,
      };
    }

    const whichResult = await this.run(`which ${agent.command}`);
    if (!whichResult.success) {
      return {
        healthy: false,
        level: "basic",
        output: "",
        error: `${agent.command} not found in PATH`,
        responseTime: 0,
        agentName: agent.name,
        agentCommand: agent.command,
      };
    }

    const level = options.level || "basic";

    // Basic: verify CLI responds to --version/--help (no auth needed)
    if (level === "basic") {
      const startTime = Date.now();
      const checkCmd = agent.versionFlag
        ? `${agent.command} ${agent.versionFlag}`
        : `${agent.command} --help`;
      const result = await this.run(checkCmd, { timeout: 10000 });
      const responseTime = Date.now() - startTime;

      return {
        healthy: result.success,
        level: "basic",
        output: result.output.trim().slice(0, 1000),
        error: result.success ? undefined : result.error,
        responseTime,
        agentName: agent.name,
        agentCommand: agent.command,
      };
    }

    // Ping/Full: attempt prompt-based invocation (may require auth)
    if (level === "ping" || level === "full") {
      if (!agent.invokeTemplate) {
        return {
          healthy: false,
          level,
          output: "",
          error: `No invoke template for ${agent.name}`,
          responseTime: 0,
          agentName: agent.name,
          agentCommand: agent.command,
        };
      }
      const testPrompt =
        options.prompt || (level === "ping" ? "hello" : "Say hello and tell me your name.");
      const cmd = agent.invokeTemplate.cmdTemplate.replace(
        "$PROMPT",
        testPrompt.replace(/'/g, "'\\''"),
      );
      const timeout =
        level === "ping"
          ? Math.min(agent.invokeTemplate.timeout || 15000, 15000)
          : agent.invokeTemplate.timeout || 60000;

      const startTime = Date.now();
      const result = await this.run(cmd, { timeout });
      const responseTime = Date.now() - startTime;

      const authLikelyMissing =
        result.error?.toLowerCase().includes("auth") ||
        result.output.toLowerCase().includes("auth") ||
        result.output.toLowerCase().includes("api key") ||
        result.output.toLowerCase().includes("login");

      if (level === "ping") {
        const processStarted = result.exitCode !== 127;
        return {
          healthy: processStarted && !authLikelyMissing,
          level: "ping",
          output: result.output.trim().slice(0, 2000),
          error: processStarted ? undefined : result.error || "Process did not start",
          responseTime,
          agentName: agent.name,
          agentCommand: agent.command,
          authRequired: authLikelyMissing,
        };
      }

      // Full
      const healthy =
        result.success &&
        agent.invokeTemplate.successIndicators.some((indicator) =>
          result.output.toLowerCase().includes(indicator.toLowerCase()),
        );
      return {
        healthy,
        level: "full",
        output: result.output.trim().slice(0, 2000),
        error: healthy ? undefined : result.error || "Response did not match expected indicators",
        responseTime,
        agentName: agent.name,
        agentCommand: agent.command,
        authRequired: authLikelyMissing,
      };
    }

    return {
      healthy: false,
      level: "basic",
      output: "",
      error: "Invalid level",
      responseTime: 0,
      agentName: agent.name,
      agentCommand: agent.command,
    };
  },

  async getAgentCurrentModel(agentId: string): Promise<{
    model?: string;
    source: "cli" | "config" | "registry";
    rawOutput?: string;
  }> {
    const agent = AGENT_CLI_REGISTRY.find((a) => a.id === agentId);
    if (!agent) {
      return { model: undefined, source: "registry", rawOutput: `Unknown agent: ${agentId}` };
    }

    // Try CLI query first
    if (agent.modelQuery) {
      try {
        const result = await this.run(agent.modelQuery.cmd);
        if (result.success && result.output.trim()) {
          let modelOutput = result.output.trim().split("\n")[0].trim();
          if (agent.modelQuery.extractPattern) {
            const match = result.output.match(new RegExp(agent.modelQuery.extractPattern, "i"));
            if (match) {
              modelOutput = match[0].trim();
            }
          }
          return { model: modelOutput, source: "cli", rawOutput: result.output.trim() };
        }
      } catch {
        // Fall through to registry
      }
    }

    // Check for config file patterns
    const configPatterns: Record<string, string> = {
      "claude-code": "~/.claude/config.json",
      codex: "~/.codex/config.yaml",
    };
    const configPath = configPatterns[agent.id];
    if (configPath) {
      const configResult = await this.run(`cat ${configPath} 2>/dev/null || echo ""`);
      if (configResult.success && configResult.output.trim()) {
        return {
          model: configResult.output.trim(),
          source: "config",
          rawOutput: configResult.output.trim(),
        };
      }
    }

    // Fall back to registry default
    return { model: agent.model, source: "registry" };
  },

  async runTests(cwd?: string): Promise<ExecutionResult> {
    const commands = [
      "bun test",
      "npm test",
      "pnpm test",
      "yarn test",
      "npm run test",
      "pnpm run test",
      "yarn run test",
    ];
    for (const cmd of commands) {
      const result = await this.run(cmd, { cwd, timeout: 120000 });
      if (result.exitCode !== 127) return result;
    }
    return { success: false, output: "", error: "No test runner found", exitCode: 127 };
  },

  async runBuild(cwd?: string): Promise<ExecutionResult> {
    const commands = ["bun run build", "npm run build", "pnpm run build", "yarn run build"];
    for (const cmd of commands) {
      const result = await this.run(cmd, { cwd, timeout: 180000 });
      if (result.exitCode !== 127) return result;
    }
    return { success: false, output: "", error: "No build script found", exitCode: 127 };
  },

  async runLint(cwd?: string): Promise<ExecutionResult> {
    const commands = ["bun run lint", "npm run lint", "pnpm run lint", "yarn run lint"];
    for (const cmd of commands) {
      const result = await this.run(cmd, { cwd, timeout: 120000 });
      if (result.exitCode !== 127) return result;
    }
    return { success: false, output: "", error: "No lint script found", exitCode: 127 };
  },

  async getProjectInfo(
    cwd: string,
  ): Promise<{ name: string; packageManager: string; hasTests: boolean; hasBuild: boolean }> {
    const name = cwd.split("/").pop() || "unknown";
    let packageManager = "unknown";
    let hasTests = false;
    let hasBuild = false;

    const checkFile = async (filename: string): Promise<boolean> => {
      const result = await this.run(`test -f ${filename} && echo "exists" || echo "missing"`, {
        cwd,
      });
      return result.output.trim() === "exists";
    };

    if (await checkFile("bun.lockb")) packageManager = "bun";
    else if (await checkFile("pnpm-lock.yaml")) packageManager = "pnpm";
    else if (await checkFile("yarn.lock")) packageManager = "yarn";
    else if (await checkFile("package-lock.json")) packageManager = "npm";

    const result = await this.run("cat package.json 2>/dev/null || echo '{}'", { cwd });
    try {
      const pkg = JSON.parse(result.output);
      hasTests = !!(pkg.scripts?.test || pkg.scripts?.["test:watch"]);
      hasBuild = !!pkg.scripts?.build;
    } catch {}

    return { name, packageManager, hasTests, hasBuild };
  },
};
