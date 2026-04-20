import { spawn } from "bun";

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
  stdin?: string;
}

const DEFAULT_TIMEOUT = 60000;

export interface AgentCLIDefinition {
  id: string;
  name: string;
  command: string;
  aliases?: string[];
  versionArgs?: string[];
  versionArgSets?: string[][];
  helpArgs?: string[];
  helpArgSets?: string[][];
  role: string;
  capabilities: string[];
  model: string;
  invoke?: {
    mode: "argv" | "stdin";
    args?: string[];
    stdinTemplate?: string;
    successIndicators: string[];
    timeout?: number;
    truncateLines?: number;
  };
  invokeFallbacks?: Array<{
    mode: "argv" | "stdin";
    args?: string[];
    stdinTemplate?: string;
    successIndicators?: string[];
    timeout?: number;
    truncateLines?: number;
  }>;
  modelQuery?: {
    cmd: string;
    extractPattern?: string;
  };
  modelQueries?: Array<{
    cmd: string;
    extractPattern?: string;
  }>;
}

const AGENT_CLI_REGISTRY: AgentCLIDefinition[] = [
  {
    id: "pi",
    name: "Pi",
    command: "pi",
    aliases: ["pi cli"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"], ["help"]],
    role: "Conversational AI assistant",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "local/pi",
    invoke: {
      mode: "stdin",
      args: ["--output-format", "text"],
      stdinTemplate: "$PROMPT",
      successIndicators: ["pi"],
      timeout: 30000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "stdin",
        stdinTemplate: "$PROMPT",
      },
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    command: "claude",
    aliases: ["claude", "claude code", "anthropic claude"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"]],
    role: "Code generation & reasoning",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "cloud/claude-sonnet-4",
    invoke: {
      mode: "argv",
      args: ["-p", "$PROMPT"],
      successIndicators: ["claude"],
      timeout: 60000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "stdin",
        stdinTemplate: "$PROMPT",
      },
    ],
    modelQueries: [
      {
        cmd: "claude --version 2>&1",
        extractPattern: "Claude Code",
      },
      {
        cmd: "claude version 2>&1",
        extractPattern: "Claude Code",
      },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    command: "codex",
    aliases: ["openai codex", "codex cli"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"]],
    role: "Code generation & editing",
    capabilities: ["write_code", "fix_bug"],
    model: "local/codex",
    invoke: {
      mode: "stdin",
      stdinTemplate: "$PROMPT",
      successIndicators: ["codex", "CodeX"],
      timeout: 30000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "argv",
        args: ["-p", "$PROMPT"],
      },
    ],
    modelQueries: [{ cmd: "codex --version 2>&1" }, { cmd: "codex version 2>&1" }],
  },
  {
    id: "opencode",
    name: "OpenCode",
    command: "opencode",
    aliases: ["open code", "open-code"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"]],
    role: "Open-source code generation",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "local/opencode",
    invoke: {
      mode: "stdin",
      stdinTemplate: "$PROMPT",
      successIndicators: ["opencode", "OpenCode"],
      timeout: 30000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "argv",
        args: ["-p", "$PROMPT"],
      },
    ],
    modelQueries: [{ cmd: "opencode --version 2>&1" }, { cmd: "opencode version 2>&1" }],
  },
  {
    id: "amp",
    name: "Amp",
    command: "amp",
    aliases: ["sourcegraph amp"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"]],
    role: "AI-powered development",
    capabilities: ["write_code", "fix_bug", "run_tests"],
    model: "local/amp",
    invoke: {
      mode: "stdin",
      stdinTemplate: "$PROMPT",
      successIndicators: ["amp", "Amp"],
      timeout: 30000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "argv",
        args: ["-p", "$PROMPT"],
      },
    ],
    modelQueries: [{ cmd: "amp --version 2>&1" }, { cmd: "amp version 2>&1" }],
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    command: "gemini",
    aliases: ["gemini", "google gemini", "gemini code"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"], ["help"]],
    role: "Google Gemini coding assistant",
    capabilities: ["write_code", "fix_bug", "review", "run_tests"],
    model: "cloud/gemini-2.5-pro",
    invoke: {
      mode: "argv",
      args: ["-p", "$PROMPT"],
      successIndicators: ["gemini", "google"],
      timeout: 60000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "stdin",
        stdinTemplate: "$PROMPT",
      },
    ],
    modelQueries: [{ cmd: "gemini --version 2>&1" }, { cmd: "gemini version 2>&1" }],
  },

  {
    id: "qwen-code",
    name: "Qwen Code",
    command: "qwen",
    aliases: ["qwen", "qwen coder", "qwen-cli"],
    versionArgs: ["--version"],
    versionArgSets: [["--version"], ["version"]],
    helpArgs: ["--help"],
    helpArgSets: [["--help"], ["help"]],
    role: "Qwen coding assistant",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "cloud/qwen-coder",
    invoke: {
      mode: "argv",
      args: ["-p", "$PROMPT"],
      successIndicators: ["qwen"],
      timeout: 60000,
      truncateLines: 20,
    },
    invokeFallbacks: [
      {
        mode: "stdin",
        stdinTemplate: "$PROMPT",
      },
    ],
    modelQueries: [{ cmd: "qwen --version 2>&1" }, { cmd: "qwen version 2>&1" }],
  },
];

export interface DetectedAgentCLI {
  definition: AgentCLIDefinition;
  available: boolean;
  version?: string;
  path?: string;
}

export interface AgentInvocationResult extends ExecutionResult {
  agentId: string;
  agentName: string;
  agentCommand: string;
}

type SpawnCommand =
  | string
  | {
      cmd: string[];
    };

function findAgentCLI(agentIdOrCommand: string): AgentCLIDefinition | undefined {
  const normalized = agentIdOrCommand.trim().toLowerCase();
  if (!normalized) return undefined;

  return AGENT_CLI_REGISTRY.find((agent) => {
    return (
      agent.id.toLowerCase() === normalized ||
      agent.name.toLowerCase() === normalized ||
      agent.command.toLowerCase() === normalized ||
      agent.aliases?.some((alias) => alias.toLowerCase() === normalized)
    );
  });
}

function replacePromptToken(value: string, prompt: string): string {
  return value.replaceAll("$PROMPT", prompt);
}

function truncateLines(output: string, maxLines?: number): string {
  if (!maxLines || maxLines <= 0) return output;
  return output.split("\n").slice(0, maxLines).join("\n");
}

function getCheckArgSets(agent: AgentCLIDefinition, kind: "version" | "help"): string[][] {
  if (kind === "version") {
    if (agent.versionArgSets?.length) return agent.versionArgSets;
    if (agent.versionArgs?.length) return [agent.versionArgs];
    return [];
  }

  if (agent.helpArgSets?.length) return agent.helpArgSets;
  if (agent.helpArgs?.length) return [agent.helpArgs];
  return [];
}

function getInvokeStrategies(
  agent: AgentCLIDefinition,
): NonNullable<AgentCLIDefinition["invoke"]>[] {
  const strategies: NonNullable<AgentCLIDefinition["invoke"]>[] = [];
  if (agent.invoke) strategies.push(agent.invoke);
  if (agent.invokeFallbacks?.length) {
    for (const fallback of agent.invokeFallbacks) {
      strategies.push({
        successIndicators: agent.invoke?.successIndicators || [],
        timeout: agent.invoke?.timeout,
        truncateLines: agent.invoke?.truncateLines,
        ...fallback,
      });
    }
  }
  return strategies;
}

function getModelQueries(
  agent: AgentCLIDefinition,
): NonNullable<AgentCLIDefinition["modelQueries"]> {
  if (agent.modelQueries?.length) return agent.modelQueries;
  if (agent.modelQuery) return [agent.modelQuery];
  return [];
}

export const executor = {
  async run(command: SpawnCommand, config: ExecutorConfig = {}): Promise<ExecutionResult> {
    const { cwd = process.cwd(), timeout = DEFAULT_TIMEOUT, env = {}, stdin } = config;

    try {
      const cmd = typeof command === "string" ? ["sh", "-c", command] : command.cmd;
      const proc = spawn({
        cmd,
        cwd,
        env: { ...process.env, ...env },
        stdin: stdin !== undefined ? "pipe" : undefined,
        stdout: "pipe",
        stderr: "pipe",
      });

      if (stdin !== undefined && proc.stdin) {
        proc.stdin.write(new TextEncoder().encode(stdin));
        await proc.stdin.end();
      }

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

          for (const argSet of getCheckArgSets(agent, "version")) {
            const versionResult = await this.run({ cmd: [agent.command, ...argSet] });
            if (versionResult.success) {
              const versionOutput =
                `${versionResult.output}${versionResult.error ? `\n${versionResult.error}` : ""}`
                  .trim()
                  .split("\n")[0]
                  .trim();
              const versionMatch = versionOutput.match(/v?\d+(\.\d+)+/);
              detected.version = versionMatch ? versionMatch[0] : versionOutput;
              break;
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

  async invokeAgentCLI(
    agentIdOrCommand: string,
    prompt: string,
    config: ExecutorConfig = {},
  ): Promise<AgentInvocationResult> {
    const agent = findAgentCLI(agentIdOrCommand);
    if (!agent) {
      return {
        success: false,
        output: "",
        error: `Unknown agent runtime: ${agentIdOrCommand}`,
        exitCode: 1,
        agentId: agentIdOrCommand,
        agentName: agentIdOrCommand,
        agentCommand: agentIdOrCommand,
      };
    }

    const strategies = getInvokeStrategies(agent);
    if (strategies.length === 0) {
      return {
        success: false,
        output: "",
        error: `No invoke configuration for ${agent.name}`,
        exitCode: 1,
        agentId: agent.id,
        agentName: agent.name,
        agentCommand: agent.command,
      };
    }

    let lastResult: ExecutionResult | undefined;
    let lastStrategy: NonNullable<AgentCLIDefinition["invoke"]> | undefined;

    for (const strategy of strategies) {
      const args = (strategy.args || []).map((arg) => replacePromptToken(arg, prompt));
      const stdin =
        strategy.mode === "stdin"
          ? replacePromptToken(strategy.stdinTemplate || "$PROMPT", prompt)
          : undefined;

      const result = await this.run(
        { cmd: [agent.command, ...args] },
        {
          ...config,
          stdin,
          timeout: config.timeout ?? strategy.timeout ?? DEFAULT_TIMEOUT,
        },
      );

      lastResult = result;
      lastStrategy = strategy;

      if (result.success || result.exitCode !== 127) {
        const combinedOutput = `${result.output}${result.error ? `\n${result.error}` : ""}`.trim();
        return {
          ...result,
          output: truncateLines(combinedOutput, strategy.truncateLines),
          error: result.error,
          agentId: agent.id,
          agentName: agent.name,
          agentCommand: agent.command,
        };
      }
    }

    const finalResult = lastResult || {
      success: false,
      output: "",
      error: `Failed to start ${agent.command}`,
      exitCode: 127,
    };

    return {
      ...finalResult,
      output: truncateLines(
        `${finalResult.output}${finalResult.error ? `\n${finalResult.error}` : ""}`.trim(),
        lastStrategy?.truncateLines,
      ),
      error: finalResult.error,
      agentId: agent.id,
      agentName: agent.name,
      agentCommand: agent.command,
    };
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
      const checkArgSets = [
        ...getCheckArgSets(agent, "version"),
        ...getCheckArgSets(agent, "help"),
      ];
      let result: ExecutionResult = {
        success: false,
        output: "",
        error: `${agent.command} health check failed`,
        exitCode: 1,
      };
      for (const argSet of checkArgSets.length ? checkArgSets : [["--help"]]) {
        result = await this.run({ cmd: [agent.command, ...argSet] }, { timeout: 10000 });
        if (result.success || result.exitCode !== 127) break;
      }
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
      if (getInvokeStrategies(agent).length === 0) {
        return {
          healthy: false,
          level,
          output: "",
          error: `No invoke configuration for ${agent.name}`,
          responseTime: 0,
          agentName: agent.name,
          agentCommand: agent.command,
        };
      }
      const testPrompt =
        options.prompt || (level === "ping" ? "hello" : "Say hello and tell me your name.");
      const startTime = Date.now();
      const result = await this.invokeAgentCLI(agent.id, testPrompt, {
        timeout:
          level === "ping"
            ? Math.min(agent.invoke?.timeout || 15000, 15000)
            : agent.invoke?.timeout || 60000,
      });
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
        getInvokeStrategies(agent).some((strategy) =>
          strategy.successIndicators.some((indicator) =>
            result.output.toLowerCase().includes(indicator.toLowerCase()),
          ),
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
    const modelQueries = getModelQueries(agent);
    if (modelQueries.length) {
      try {
        for (const modelQuery of modelQueries) {
          const result = await this.run(modelQuery.cmd);
          if (result.success && result.output.trim()) {
            let modelOutput = result.output.trim().split("\n")[0].trim();
            if (modelQuery.extractPattern) {
              const match = result.output.match(new RegExp(modelQuery.extractPattern, "i"));
              if (match) {
                modelOutput = match[0].trim();
              }
            }
            return { model: modelOutput, source: "cli", rawOutput: result.output.trim() };
          }
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
