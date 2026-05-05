import { RUNTIME_REGISTRY } from "./runtime-registry";

declare const Bun: {
  spawn(options: {
    cmd: string[];
    cwd: string;
    env: Record<string, string>;
    stdout: "pipe";
    stderr: "pipe";
  }): {
    stdout: ReadableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    kill: () => void;
    exited: Promise<number>;
  };
  serve(options: {
    hostname: string;
    port: number;
    fetch: (request: Request) => Response | Promise<Response>;
  }): void;
  file(path: string): {
    text(): Promise<string>;
    exists(): Promise<boolean>;
  };
  write(path: string, data: string): Promise<number>;
};

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd(): string;
  exit(code: number): never;
  platform: string;
  stdout: { write(data: string): void };
};

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

interface DetectedRuntime {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  error?: string;
}

interface RuntimeChatResult {
  success: boolean;
  output: string;
  error?: string;
  agentName: string;
  responseTime: number;
}

function showHelp() {
  process.stdout.write(`OrchOS Local CLI Host

Usage:
  orchos-cli [options]

Options:
  --host <addr>              HTTP server host (default: 127.0.0.1)
                             Env: ORCHOS_LOCAL_CLI_HOST
  --port <num>               HTTP server port (default: 4318)
                             Env: ORCHOS_LOCAL_CLI_PORT
  --auth-token <token>       Bearer token for incoming requests
                             Env: ORCHOS_LOCAL_CLI_TOKEN
  --api-url <url>            OrchOS cloud API base URL (required for pairing)
                             Env: ORCHOS_CLOUD_API_URL
  --pairing-token <token>    Pairing token from the OrchOS dashboard
                             Env: ORCHOS_CLOUD_PAIRING_TOKEN
  --device-name <name>       Name for this device (default: "This device")
                             Env: ORCHOS_LOCAL_CLI_DEVICE_NAME
  --device-id <id>           Unique device identifier (default: host:port)
                             Env: ORCHOS_LOCAL_CLI_DEVICE_ID
  --heartbeat-ms <ms>        Heartbeat interval in ms (default: 30000)
                             Env: ORCHOS_LOCAL_CLI_HEARTBEAT_MS
  --allowed-origins <list>   Comma-separated allowed CORS origins
                             Env: ORCHOS_LOCAL_CLI_ALLOWED_ORIGINS
  --credential-path <path>   Path to store credentials (default: .orchos-local-cli.json)
                             Env: ORCHOS_LOCAL_CLI_CREDENTIAL_PATH
  --help                     Show this help message

Example:
  orchos-cli --api-url https://app.orchos.dev --pairing-token orchos_pair_abc123
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--help": {
        showHelp();
        process.exit(0);
      }
      case "--host":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_HOST = args[i];
        break;
      case "--port": {
        const val = args[++i];
        if (val) process.env.ORCHOS_LOCAL_CLI_PORT = val;
        break;
      }
      case "--auth-token":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_TOKEN = args[i];
        break;
      case "--api-url":
        if (args[++i]) process.env.ORCHOS_CLOUD_API_URL = args[i];
        break;
      case "--pairing-token":
        if (args[++i]) process.env.ORCHOS_CLOUD_PAIRING_TOKEN = args[i];
        break;
      case "--device-name":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_DEVICE_NAME = args[i];
        break;
      case "--device-id":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_DEVICE_ID = args[i];
        break;
      case "--heartbeat-ms":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_HEARTBEAT_MS = args[i];
        break;
      case "--allowed-origins":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_ALLOWED_ORIGINS = args[i];
        break;
      case "--credential-path":
        if (args[++i]) process.env.ORCHOS_LOCAL_CLI_CREDENTIAL_PATH = args[i];
        break;
      default:
        process.stdout.write(`Unknown option: ${arg}\n`);
        showHelp();
        process.exit(1);
    }
  }
}

parseArgs();

const DEFAULT_TIMEOUT = 60000;
const host = process.env.ORCHOS_LOCAL_CLI_HOST?.trim() || "127.0.0.1";
const port = Number.parseInt(process.env.ORCHOS_LOCAL_CLI_PORT?.trim() || "4318", 10);
const authToken = process.env.ORCHOS_LOCAL_CLI_TOKEN?.trim() || "";
const cloudApiBaseUrl = process.env.ORCHOS_CLOUD_API_URL?.trim()?.replace(/\/+$/, "") || "";
const cloudSessionToken = process.env.ORCHOS_CLOUD_SESSION_TOKEN?.trim() || "";
const cloudPairingToken = process.env.ORCHOS_CLOUD_PAIRING_TOKEN?.trim() || "";
const credentialStorePath =
  process.env.ORCHOS_LOCAL_CLI_CREDENTIAL_PATH?.trim() || `${process.cwd()}/.orchos-local-cli.json`;
let cloudHostToken = process.env.ORCHOS_CLOUD_HOST_TOKEN?.trim() || "";
const heartbeatIntervalMs = Number.parseInt(
  process.env.ORCHOS_LOCAL_CLI_HEARTBEAT_MS?.trim() || "30000",
  10,
);
const deviceId = process.env.ORCHOS_LOCAL_CLI_DEVICE_ID?.trim() || `${host}:${port}`;
const deviceName = process.env.ORCHOS_LOCAL_CLI_DEVICE_NAME?.trim() || "This device";
const devicePlatform = process.env.ORCHOS_LOCAL_CLI_PLATFORM?.trim() || process.platform;
const appVersion = process.env.ORCHOS_LOCAL_CLI_VERSION?.trim() || "dev";
const allowedOrigins = new Set(
  (process.env.ORCHOS_LOCAL_CLI_ALLOWED_ORIGINS?.split(",") || [])
    .map((origin: string) => origin.trim())
    .filter(Boolean),
);

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (!origin || !allowedOrigins.has(origin)) return {} as Record<string, string>;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function isAuthorized(request: Request) {
  if (!authToken) return true;
  const authHeader = request.headers.get("authorization")?.trim();
  return authHeader === `Bearer ${authToken}`;
}

async function runCommand(
  command: string,
  config: { cwd?: string; timeout?: number; env?: Record<string, string> } = {},
): Promise<ExecutionResult> {
  const { cwd = process.cwd(), timeout = DEFAULT_TIMEOUT, env = {} } = config;

  try {
    const mergedEnv = Object.fromEntries(
      Object.entries({ ...process.env, ...env }).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );

    const proc = Bun.spawn({
      cmd: ["sh", "-c", command],
      cwd,
      env: mergedEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const timer = setTimeout(() => proc.kill(), timeout);
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    clearTimeout(timer);

    const exitCode = await proc.exited;
    return {
      success: exitCode === 0,
      output: stdout,
      error: stderr || undefined,
      exitCode,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    };
  }
}

async function detectRuntimes() {
  const available: DetectedRuntime[] = [];
  const unavailable: DetectedRuntime[] = [];

  for (const runtime of RUNTIME_REGISTRY) {
    const whichResult = await runCommand(`which ${runtime.command}`);
    const base = {
      id: runtime.id,
      name: runtime.name,
      command: runtime.command,
      role: runtime.role,
      capabilities: [...runtime.capabilities],
      model: runtime.model,
      transport: runtime.transport,
    };

    if (!whichResult.success) {
      unavailable.push({
        ...base,
        error: `${runtime.command} not found in PATH`,
      });
      continue;
    }

    let version: string | undefined;
    if (runtime.versionFlag) {
      const versionResult = await runCommand(`${runtime.command} ${runtime.versionFlag}`);
      if (versionResult.success) {
        const firstLine = versionResult.output.trim().split("\n")[0]?.trim() ?? "";
        const versionMatch = firstLine.match(/v?\d+(\.\d+)+/);
        version = versionMatch ? versionMatch[0] : firstLine;
      }
    }

    available.push({
      ...base,
      path: whichResult.output.trim(),
      version,
    });
  }

  return { available, unavailable };
}

async function healthCheck(runtimeId: string, level: "basic" | "ping" | "full", prompt?: string) {
  const runtime = RUNTIME_REGISTRY.find((entry) => entry.id === runtimeId);
  if (!runtime) {
    return {
      healthy: false,
      level: "basic" as const,
      output: "",
      error: `Unknown agent ID: ${runtimeId}`,
      responseTime: 0,
      agentName: runtimeId,
      agentCommand: runtimeId,
    };
  }

  const whichResult = await runCommand(`which ${runtime.command}`);
  if (!whichResult.success) {
    return {
      healthy: false,
      level: "basic" as const,
      output: "",
      error: `${runtime.command} not found in PATH`,
      responseTime: 0,
      agentName: runtime.name,
      agentCommand: runtime.command,
    };
  }

  if (level === "basic") {
    const startTime = Date.now();
    const command = runtime.versionFlag
      ? `${runtime.command} ${runtime.versionFlag}`
      : `${runtime.command} --help`;
    const result = await runCommand(command, { timeout: 10000 });
    return {
      healthy: result.success,
      level,
      output: result.output.trim().slice(0, 1000),
      error: result.success ? undefined : result.error,
      responseTime: Date.now() - startTime,
      agentName: runtime.name,
      agentCommand: runtime.command,
    };
  }

  if (!runtime.invokeTemplate) {
    return {
      healthy: false,
      level,
      output: "",
      error: `No invoke template for ${runtime.name}`,
      responseTime: 0,
      agentName: runtime.name,
      agentCommand: runtime.command,
    };
  }

  const testPrompt = prompt || (level === "ping" ? "hello" : "Say hello and tell me your name.");
  const command = runtime.invokeTemplate.cmdTemplate.replace(
    "$PROMPT",
    testPrompt.replace(/'/g, "'\\''"),
  );
  const timeout = level === "ping"
    ? Math.min(runtime.invokeTemplate.timeout, 15000)
    : runtime.invokeTemplate.timeout;
  const startTime = Date.now();
  const result = await runCommand(command, { timeout });
  const output = `${result.output}\n${result.error ?? ""}`.trim();

  return {
    healthy: result.success,
    level,
    output: result.output.trim().slice(0, 1000),
    error: result.success ? undefined : result.error,
    responseTime: Date.now() - startTime,
    agentName: runtime.name,
    agentCommand: runtime.command,
    authRequired: /auth|api key|login/i.test(output),
  };
}

async function getCurrentModel(runtimeId: string, fallbackModel?: string) {
  const runtime = RUNTIME_REGISTRY.find((entry) => entry.id === runtimeId);
  if (!runtime) return { model: fallbackModel, source: "registry" as const };

  if (runtime.modelQuery) {
    const result = await runCommand(runtime.modelQuery.cmd);
    if (result.success && result.output.trim()) {
      let modelOutput = result.output.trim().split("\n")[0]?.trim() ?? "";
      if (runtime.modelQuery.extractPattern) {
        const match = result.output.match(new RegExp(runtime.modelQuery.extractPattern, "i"));
        if (match) modelOutput = match[0].trim();
      }
      return { model: modelOutput, source: "cli" as const, rawOutput: result.output.trim() };
    }
  }

  return { model: fallbackModel || runtime.model, source: "registry" as const };
}

async function chatWithRuntime(command: string, prompt: string, runtimeName: string): Promise<RuntimeChatResult> {
  const startTime = Date.now();
  const result = await runCommand(`${command} -p '${prompt.replace(/'/g, "'\\''")}' 2>&1`, {
    timeout: 120000,
  });

  return {
    success: result.success || result.output.trim().length > 0,
    output: result.output.trim(),
    error: result.success ? undefined : result.error,
    agentName: runtimeName,
    responseTime: Date.now() - startTime,
  };
}

async function publishHeartbeat() {
  if (!cloudApiBaseUrl) return;

  if (!cloudHostToken && cloudPairingToken) {
    try {
      const pairResponse = await fetch(`${cloudApiBaseUrl}/api/local-hosts/pair`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pairingToken: cloudPairingToken,
          deviceId,
          name: deviceName,
          platform: devicePlatform,
          appVersion,
          metadata: {
            host,
            port: String(port),
          },
        }),
      });

      if (!pairResponse.ok) {
        const text = await pairResponse.text();
        console.warn(`Failed to pair OrchOS local host: ${text || pairResponse.statusText}`);
        return;
      }

      const paired = (await pairResponse.json()) as { hostToken?: string };
      if (!paired.hostToken) {
        console.warn("Failed to pair OrchOS local host: missing host token");
        return;
      }

      cloudHostToken = paired.hostToken;
      await persistHostToken(cloudHostToken);
    } catch (error) {
      console.warn(`Failed to pair OrchOS local host: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }

  if (!cloudHostToken && !cloudSessionToken) return;

  try {
    const detected = await detectRuntimes();
    const response = await fetch(`${cloudApiBaseUrl}/api/local-hosts/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cloudHostToken || cloudSessionToken}`,
      },
      body: JSON.stringify({
        deviceId,
        name: deviceName,
        platform: devicePlatform,
        appVersion,
        runtimes: detected.available,
        metadata: {
          host,
          port: String(port),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`Failed to publish OrchOS local host heartbeat: ${text || response.statusText}`);
    }
  } catch (error) {
    console.warn(
      `Failed to publish OrchOS local host heartbeat: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function loadStoredHostToken() {
  if (cloudHostToken) return;

  try {
    const credentialFile = Bun.file(credentialStorePath);
    if (!(await credentialFile.exists())) return;

    const parsed = JSON.parse(await credentialFile.text()) as { hostToken?: string };
    if (typeof parsed.hostToken === "string" && parsed.hostToken.trim()) {
      cloudHostToken = parsed.hostToken.trim();
    }
  } catch (error) {
    console.warn(
      `Failed to load OrchOS local CLI credentials: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function persistHostToken(hostToken: string) {
  try {
    await Bun.write(
      credentialStorePath,
      JSON.stringify(
        {
          hostToken,
          storedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.warn(
      `Failed to persist OrchOS local CLI credentials: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, service: "orchos-local-cli" }, { headers: corsHeaders });
  }

  if (request.method === "GET" && url.pathname === "/runtimes/detect") {
    return json(await detectRuntimes(), { headers: corsHeaders });
  }

  if (request.method === "GET" && url.pathname.startsWith("/runtimes/") && url.pathname.endsWith("/health")) {
    const runtimeId = url.pathname.split("/")[2];
    const levelParam = url.searchParams.get("level");
    const level = levelParam === "ping" || levelParam === "full" ? levelParam : "basic";
    const prompt = url.searchParams.get("prompt") || undefined;
    return json(await healthCheck(runtimeId, level, prompt), { headers: corsHeaders });
  }

  if (request.method === "GET" && url.pathname.startsWith("/runtimes/") && url.pathname.endsWith("/model")) {
    const runtimeId = url.pathname.split("/")[2];
    const fallbackModel = url.searchParams.get("fallbackModel") || undefined;
    return json(await getCurrentModel(runtimeId, fallbackModel), { headers: corsHeaders });
  }

  if (request.method === "POST" && url.pathname === "/runtimes/chat") {
    const body = (await request.json()) as {
      command?: string;
      prompt?: string;
      runtimeName?: string;
    };

    if (!body.command?.trim() || !body.prompt?.trim() || !body.runtimeName?.trim()) {
      return json(
        { error: "command, prompt, and runtimeName are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    return json(
      await chatWithRuntime(body.command, body.prompt, body.runtimeName),
      { headers: corsHeaders },
    );
  }

  if (request.method === "POST" && url.pathname === "/exec") {
    const body = (await request.json()) as {
      command?: string;
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    };

    if (!body.command?.trim()) {
      return json({ error: "Command is required" }, { status: 400, headers: corsHeaders });
    }

    return json(
      await runCommand(body.command, {
        cwd: body.cwd,
        timeout: body.timeout,
        env: body.env,
      }),
      { headers: corsHeaders },
    );
  }

  return json({ error: "Not found" }, { status: 404, headers: corsHeaders });
}

Bun.serve({
  hostname: host,
  port,
  fetch: handleRequest,
});

console.log(`OrchOS local CLI host listening on http://${host}:${port}`);

void loadStoredHostToken().then(async () => {
  await publishHeartbeat();
  setInterval(() => {
    void publishHeartbeat();
  }, heartbeatIntervalMs);
});
