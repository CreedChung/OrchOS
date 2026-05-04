declare module "bun" {
  export function spawn(options: Record<string, unknown>): any;

  export class S3Client {
    constructor(options: Record<string, unknown>);
    write(
      key: string,
      data: File | Blob | string,
      options?: Record<string, unknown>,
    ): Promise<void>;
  }
}

declare module "bun:sqlite";

declare module "better-sqlite3" {
  export default class Database {
    constructor(path: string, options?: Record<string, unknown>);
    pragma(statement: string): unknown;
  }
}

interface R2ObjectBody {
  body?: ReadableStream<Uint8Array> | null;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream<Uint8Array> | string,
    options?: Record<string, unknown>,
  ): Promise<void>;
  get(key: string): Promise<R2ObjectBody | null>;
}

declare namespace Cloudflare {
  interface Env {
    Sandbox?: unknown;
  }
}
