import { createBunDb, syncSchema } from "./driver";
import { createApp } from "../app";
import { S3Client } from "bun";
import type { StorageAdapter } from "../modules/agent";

const db = createBunDb();
await syncSchema(db);

function createBunStorage(): StorageAdapter | undefined {
  try {
    const s3 = new S3Client({
      accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
      bucket: process.env.S3_BUCKET || "orchos-avatars",
    });
    const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    const bucket = process.env.S3_BUCKET || "orchos-avatars";
    return {
      async write(key: string, data: File, options?: { type?: string }) {
        await s3.write(key, data, { type: options?.type });
      },
      getUrl(key: string) {
        return `${endpoint}/${bucket}/${key}`;
      },
    };
  } catch {
    return undefined;
  }
}

const app = createApp({
  db,
  jwtKey: process.env.CLERK_JWT_KEY?.trim() ?? "",
  storage: createBunStorage(),
});

const port = parseInt(process.env.PORT || "5173");
app.listen(port);

console.log(`🦊 Elysia server running at http://localhost:${port}`);
