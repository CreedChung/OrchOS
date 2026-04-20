type RuntimeLookup = {
  registryId?: string;
  name: string;
  command: string;
  acpCommand?: string;
  acpArgs?: string[];
  acpEnv?: Record<string, string>;
  communicationMode?: "acp-native" | "acp-adapter" | "cli-fallback";
};

type AcpAgentConfig = {
  command: string;
  args: string[];
  env?: Record<string, string>;
  communicationMode: "acp-native" | "acp-adapter";
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
};

const ACP_AGENT_CONFIGS: Record<string, AcpAgentConfig> = {
  "claude-code": {
    command: "npx",
    args: ["-y", "@zed-industries/claude-code-acp"],
    communicationMode: "acp-adapter",
  },
  codex: {
    command: "npx",
    args: ["-y", "@zed-industries/codex-acp"],
    communicationMode: "acp-adapter",
  },
  opencode: { command: "opencode", args: ["acp"], communicationMode: "acp-native" },
  "gemini-cli": { command: "gemini", args: ["--acp"], communicationMode: "acp-native" },
  "qwen-code": { command: "qwen", args: ["--acp"], communicationMode: "acp-native" },
  pi: { command: "pi-acp", args: [], communicationMode: "acp-adapter" },
  amp: { command: "amp-acp", args: [], communicationMode: "acp-adapter" },
  copilot: { command: "copilot", args: ["--acp", "--stdio"], communicationMode: "acp-native" },
};

function normalizeKey(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, "-");
}

function extractCommandName(command: string) {
  return normalizeKey(command.split(/\s+/)[0]);
}

export function getAcpAgentConfig(runtime: RuntimeLookup): AcpAgentConfig | undefined {
  if (runtime.acpCommand) {
    return {
      command: runtime.acpCommand,
      args: runtime.acpArgs || [],
      env: runtime.acpEnv,
      communicationMode: runtime.communicationMode === "acp-native" ? "acp-native" : "acp-adapter",
    };
  }

  const keys = [
    normalizeKey(runtime.registryId),
    normalizeKey(runtime.name),
    extractCommandName(runtime.command),
  ];

  for (const key of keys) {
    if (key && ACP_AGENT_CONFIGS[key]) return ACP_AGENT_CONFIGS[key];
  }

  return undefined;
}

function extractTextContent(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTextContent(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const chunks: string[] = [];

    if (record.type === "text" && typeof record.text === "string") {
      chunks.push(record.text);
    }

    if (typeof record.text === "string") {
      chunks.push(record.text);
    }

    if (record.content !== undefined) {
      chunks.push(...extractTextContent(record.content));
    }

    if (record.contents !== undefined) {
      chunks.push(...extractTextContent(record.contents));
    }

    if (record.messages !== undefined) {
      chunks.push(...extractTextContent(record.messages));
    }

    return chunks;
  }

  return [];
}

function extractSessionModels(result: unknown): {
  currentModel?: string;
  availableModels: string[];
} {
  if (!result || typeof result !== "object") {
    return { currentModel: undefined, availableModels: [] };
  }

  const session = result as {
    models?: {
      currentModelId?: string;
      availableModels?: Array<{ modelId?: string; name?: string }>;
    };
  };

  const availableModels =
    session.models?.availableModels
      ?.map((model) => model.modelId || model.name)
      .filter((model): model is string => typeof model === "string" && model.length > 0) || [];

  return {
    currentModel: session.models?.currentModelId || availableModels[0],
    availableModels,
  };
}

async function consumeStream(
  stream: ReadableStream<Uint8Array> | null | undefined,
  onLine: (line: string) => void,
) {
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) onLine(line);
        newlineIndex = buffer.indexOf("\n");
      }
    }

    const remaining = `${buffer}${decoder.decode()}`.trim();
    if (remaining) onLine(remaining);
  } finally {
    reader.releaseLock();
  }
}

async function withAcpProcess<T>(
  config: AcpAgentConfig,
  fn: (helpers: {
    request: (method: string, params?: unknown) => Promise<unknown>;
    getOutput: () => string;
    getStderr: () => string;
  }) => Promise<T>,
  cwd?: string,
) {
  const bun = await import("bun");
  const proc = bun.spawn({
    cmd: [config.command, ...config.args],
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...config.env },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  let nextId = 1;
  const pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  const outputParts: string[] = [];
  const stderrParts: string[] = [];

  const handleStdoutLine = (line: string) => {
    try {
      const message = JSON.parse(line) as JsonRpcResponse | JsonRpcNotification;

      if ("id" in message && typeof message.id === "number") {
        const deferred = pending.get(message.id);
        if (!deferred) return;
        pending.delete(message.id);

        if ("error" in message && message.error) {
          deferred.reject(new Error(message.error.message));
          return;
        }

        deferred.resolve((message as JsonRpcResponse).result);
        return;
      }

      if ("method" in message && message.method === "session/update") {
        const text = extractTextContent(message.params?.update).join("");
        if (text) outputParts.push(text);
      }
    } catch {
      // Ignore non-JSON stdout noise from adapters.
    }
  };

  const stdoutTask = consumeStream(proc.stdout, handleStdoutLine);
  const stderrTask = consumeStream(proc.stderr, (line) => {
    stderrParts.push(line);
  });

  const request = async (method: string, params?: unknown) => {
    const id = nextId++;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    const response = new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });

    proc.stdin.write(`${JSON.stringify(payload)}\n`);
    return response;
  };

  try {
    await request("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "OrchOS", version: "0.1.0" },
      clientCapabilities: {},
    });

    return await fn({
      request,
      getOutput: () => outputParts.join("").trim(),
      getStderr: () => stderrParts.join("\n").trim(),
    });
  } finally {
    proc.kill();

    for (const deferred of pending.values()) {
      deferred.reject(new Error("ACP session terminated"));
    }
    pending.clear();

    await Promise.allSettled([stdoutTask, stderrTask]);
  }
}

export async function getAcpCurrentModel(config: AcpAgentConfig, cwd?: string) {
  return withAcpProcess(
    config,
    async ({ request, getStderr }) => {
      const session = await request("session/new", { cwd: cwd || process.cwd(), mcpServers: [] });
      const { currentModel } = extractSessionModels(session);
      return {
        model: currentModel,
        rawOutput: getStderr() || undefined,
      };
    },
    cwd,
  );
}

export async function getAcpAvailableModels(config: AcpAgentConfig, cwd?: string) {
  return withAcpProcess(
    config,
    async ({ request, getStderr }) => {
      const session = await request("session/new", { cwd: cwd || process.cwd(), mcpServers: [] });
      const { currentModel, availableModels } = extractSessionModels(session);
      return {
        currentModel,
        models: availableModels,
        rawOutput: getStderr() || undefined,
      };
    },
    cwd,
  );
}

export async function probeAcpAgent(config: AcpAgentConfig, cwd?: string) {
  return withAcpProcess(
    config,
    async ({ request, getStderr }) => {
      await request("initialize", {
        protocolVersion: 1,
        clientInfo: { name: "OrchOS", version: "0.1.0" },
        clientCapabilities: {},
      });

      return {
        ok: true,
        rawOutput: getStderr() || undefined,
      };
    },
    cwd,
  );
}

export async function promptAcpAgent(config: AcpAgentConfig, prompt: string, cwd?: string) {
  return withAcpProcess(
    config,
    async ({ request, getOutput, getStderr }) => {
      const session = (await request("session/new", {
        cwd: cwd || process.cwd(),
        mcpServers: [],
      })) as { sessionId?: string };

      if (!session.sessionId) {
        throw new Error("ACP agent did not return a sessionId");
      }

      await request("session/prompt", {
        sessionId: session.sessionId,
        prompt: [{ type: "text", text: prompt }],
      });

      return {
        output: getOutput(),
        rawOutput: getStderr() || undefined,
      };
    },
    cwd,
  );
}

type ManagedSession = {
  key: string;
  configKey: string;
  request: (method: string, params?: unknown) => Promise<unknown>;
  getOutput: () => string;
  clearOutput: () => void;
  sessionId?: string;
  startedAt: number;
  lastUsedAt: number;
  close: () => Promise<void>;
};

const managedSessions = new Map<string, ManagedSession>();
const ACP_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACP_SWEEP_INTERVAL_MS = 60 * 1000;

let sweepTimer: ReturnType<typeof setInterval> | undefined;
let cleanupRegistered = false;

function isSessionExpired(session: ManagedSession, now: number) {
  return now - session.lastUsedAt >= ACP_IDLE_TIMEOUT_MS;
}

async function destroyManagedSession(sessionKey: string) {
  const session = managedSessions.get(sessionKey);
  if (!session) return;
  managedSessions.delete(sessionKey);
  await session.close().catch(() => undefined);
}

async function sweepManagedSessions() {
  const now = Date.now();
  const expiredKeys = [...managedSessions.entries()]
    .filter(([, session]) => isSessionExpired(session, now))
    .map(([key]) => key);

  await Promise.all(expiredKeys.map((key) => destroyManagedSession(key)));
}

function ensureSweepTimer() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    void sweepManagedSessions();
  }, ACP_SWEEP_INTERVAL_MS);
}

async function cleanupAllManagedSessions() {
  const keys = [...managedSessions.keys()];
  await Promise.all(keys.map((key) => destroyManagedSession(key)));
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = undefined;
  }
}

function registerCleanupHooks() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  process.once("beforeExit", () => {
    void cleanupAllManagedSessions();
  });
  process.once("SIGINT", () => {
    void cleanupAllManagedSessions().finally(() => process.exit(130));
  });
  process.once("SIGTERM", () => {
    void cleanupAllManagedSessions().finally(() => process.exit(143));
  });
}

function getConfigKey(config: AcpAgentConfig) {
  return JSON.stringify({ command: config.command, args: config.args, env: config.env || {} });
}

async function createManagedSession(
  config: AcpAgentConfig,
  cwd?: string,
  key?: string,
): Promise<ManagedSession> {
  ensureSweepTimer();
  registerCleanupHooks();

  const bun = await import("bun");
  const proc = bun.spawn({
    cmd: [config.command, ...config.args],
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...config.env },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  const outputParts: string[] = [];
  const stderrParts: string[] = [];

  const stdoutTask = consumeStream(proc.stdout, (line) => {
    try {
      const message = JSON.parse(line) as JsonRpcResponse | JsonRpcNotification;
      if ("id" in message && typeof message.id === "number") {
        const deferred = pending.get(message.id);
        if (!deferred) return;
        pending.delete(message.id);
        if ("error" in message && message.error) {
          deferred.reject(new Error(message.error.message));
          return;
        }
        deferred.resolve((message as JsonRpcResponse).result);
        return;
      }
      if ("method" in message && message.method === "session/update") {
        const text = extractTextContent(message.params?.update).join("");
        if (text) outputParts.push(text);
      }
    } catch {
      // Ignore non-JSON stdout noise from adapters.
    }
  });
  const stderrTask = consumeStream(proc.stderr, (line) => {
    stderrParts.push(line);
  });

  const request = async (method: string, params?: unknown) => {
    const id = nextId++;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    const response = new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
    proc.stdin.write(`${JSON.stringify(payload)}\n`);
    return response;
  };

  await request("initialize", {
    protocolVersion: 1,
    clientInfo: { name: "OrchOS", version: "0.1.0" },
    clientCapabilities: {},
  });

  return {
    key: key || `${Date.now()}`,
    configKey: getConfigKey(config),
    request,
    getOutput: () => outputParts.join("").trim(),
    clearOutput: () => {
      outputParts.length = 0;
      stderrParts.length = 0;
    },
    startedAt: Date.now(),
    lastUsedAt: Date.now(),
    close: async () => {
      proc.kill();
      for (const deferred of pending.values()) {
        deferred.reject(new Error("ACP session terminated"));
      }
      pending.clear();
      await Promise.allSettled([stdoutTask, stderrTask]);
    },
  };
}

export async function promptManagedAcpAgent(
  config: AcpAgentConfig,
  prompt: string,
  cwd?: string,
  sessionKey?: string,
) {
  if (!sessionKey) return promptAcpAgent(config, prompt, cwd);

  await sweepManagedSessions();

  const configKey = getConfigKey(config);
  let session = managedSessions.get(sessionKey);

  if (!session || session.configKey !== configKey) {
    if (session) {
      await session.close();
      managedSessions.delete(sessionKey);
    }
    session = await createManagedSession(config, cwd, sessionKey);
    managedSessions.set(sessionKey, session);
  }

  session.clearOutput();
  session.lastUsedAt = Date.now();

  if (!session.sessionId) {
    const created = (await session.request("session/new", {
      cwd: cwd || process.cwd(),
      mcpServers: [],
    })) as { sessionId?: string };
    if (!created.sessionId) throw new Error("ACP agent did not return a sessionId");
    session.sessionId = created.sessionId;
  }

  await session.request("session/prompt", {
    sessionId: session.sessionId,
    prompt: [{ type: "text", text: prompt }],
  });

  return {
    output: session.getOutput(),
    rawOutput: undefined,
    sessionId: session.sessionId,
  };
}
