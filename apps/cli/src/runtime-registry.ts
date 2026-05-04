export interface RuntimeRegistryEntry {
  id: string;
  name: string;
  command: string;
  versionFlag?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  invokeTemplate?: {
    cmdTemplate: string;
    successIndicators: string[];
    timeout: number;
  };
  modelQuery?: {
    cmd: string;
    extractPattern?: string;
  };
}

export const RUNTIME_REGISTRY: RuntimeRegistryEntry[] = [
  {
    id: "pi",
    name: "Pi",
    command: "pi",
    versionFlag: "--version",
    role: "Conversational AI assistant",
    capabilities: ["write_code", "fix_bug", "review"],
    model: "local/pi",
    transport: "stdio",
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
    transport: "stdio",
    invokeTemplate: {
      cmdTemplate: "claude -p '$PROMPT' 2>&1 | head -20",
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
    transport: "stdio",
    invokeTemplate: {
      cmdTemplate: "echo '$PROMPT' | codex 2>&1 | head -20",
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
    transport: "stdio",
    invokeTemplate: {
      cmdTemplate: "echo '$PROMPT' | opencode 2>&1 | head -20",
      successIndicators: ["opencode", "OpenCode"],
      timeout: 30000,
    },
  },
];
