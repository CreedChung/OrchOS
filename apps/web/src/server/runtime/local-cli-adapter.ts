import {
  configureRemoteExecutionAdapter,
  type DetectedRuntime,
  type ExecutorConfig,
  type ExecutionResult,
  type RuntimeChatResult,
  type RuntimeHealthCheckResult,
  type RuntimeModelResult,
} from "./execution-adapter";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getHeaders(token?: string) {
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function parseErrorResponse(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || `Local CLI host request failed with status ${response.status}`;
  } catch {
    const text = await response.text();
    return text || `Local CLI host request failed with status ${response.status}`;
  }
}

function createLocalCliExecutionAdapter(baseUrl: string, token?: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    async run(command: string, config?: ExecutorConfig): Promise<ExecutionResult> {
      try {
        const response = await fetch(`${normalizedBaseUrl}/exec`, {
          method: "POST",
          headers: getHeaders(token),
          body: JSON.stringify({
            command,
            cwd: config?.cwd,
            timeout: config?.timeout,
            env: config?.env,
          }),
        });

        if (!response.ok) {
          return {
            success: false,
            output: "",
            error: await parseErrorResponse(response),
            exitCode: 1,
          };
        }

        return parseJsonResponse<ExecutionResult>(response);
      } catch (error) {
        return {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
        };
      }
    },

    async detectRuntimes(): Promise<{
      available: DetectedRuntime[];
      unavailable: DetectedRuntime[];
    }> {
      const response = await fetch(`${normalizedBaseUrl}/runtimes/detect`, {
        headers: getHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      return parseJsonResponse<{
        available: DetectedRuntime[];
        unavailable: DetectedRuntime[];
      }>(response);
    },

    async runtimeHealthCheck(
      runtimeId: string,
      options?: { level?: "basic" | "ping" | "full"; prompt?: string },
    ): Promise<RuntimeHealthCheckResult> {
      const searchParams = new URLSearchParams();
      if (options?.level) searchParams.set("level", options.level);
      if (options?.prompt) searchParams.set("prompt", options.prompt);

      const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      const response = await fetch(`${normalizedBaseUrl}/runtimes/${runtimeId}/health${suffix}`, {
        headers: getHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      return parseJsonResponse<RuntimeHealthCheckResult>(response);
    },

    async getRuntimeCurrentModel(runtimeId: string, fallbackModel?: string): Promise<RuntimeModelResult> {
      const searchParams = new URLSearchParams();
      if (fallbackModel) searchParams.set("fallbackModel", fallbackModel);

      const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      const response = await fetch(`${normalizedBaseUrl}/runtimes/${runtimeId}/model${suffix}`, {
        headers: getHeaders(token),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      return parseJsonResponse<RuntimeModelResult>(response);
    },

    async chatWithRuntime(command: string, prompt: string, runtimeName: string): Promise<RuntimeChatResult> {
      const response = await fetch(`${normalizedBaseUrl}/runtimes/chat`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify({ command, prompt, runtimeName }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      return parseJsonResponse<RuntimeChatResult>(response);
    },
  };
}

export function configureLocalCliExecution(baseUrl?: string, token?: string) {
  configureRemoteExecutionAdapter(
    baseUrl?.trim() ? createLocalCliExecutionAdapter(baseUrl, token) : undefined,
  );
}
