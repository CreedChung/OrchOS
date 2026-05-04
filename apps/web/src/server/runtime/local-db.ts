import type { AppDb } from "@/server/db/types";

let dbInstancePromise: Promise<AppDb> | null = null;

export async function getLocalDb(): Promise<AppDb> {
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  const bunRuntime = globalThis as typeof globalThis & {
    Bun?: unknown;
  };

  dbInstancePromise = (bunRuntime.Bun
    ? import("@/server/bun/driver").then(({ createBunDb, syncSchema }) => {
        const db = createBunDb();
        syncSchema(db);
        return db;
      })
    : import("@/server/node/driver").then(({ createNodeDb, syncSchema }) => {
        const db = createNodeDb();
        syncSchema(db);
        return db;
      }));

  return dbInstancePromise;
}
