export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

export interface ExecutorConfig {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ProjectExecutionTarget {
  id: string;
  path?: string;
  repositoryUrl?: string;
}

export interface PreparedProjectWorkspace {
  sandboxId: string;
  rootPath: string;
  workingPath: string;
}

export interface RemoteExecutionAdapter {
  run(command: string, config?: ExecutorConfig): Promise<ExecutionResult>;
  prepareProject?(project: ProjectExecutionTarget): Promise<PreparedProjectWorkspace>;
}

let remoteExecutionAdapter: RemoteExecutionAdapter | undefined;

export function configureRemoteExecutionAdapter(adapter?: RemoteExecutionAdapter) {
  remoteExecutionAdapter = adapter;
}

export function getRemoteExecutionAdapter() {
  return remoteExecutionAdapter;
}
