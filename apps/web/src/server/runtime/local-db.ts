import { createBunDb, syncSchema } from "@/server/bun/driver";
import type { AppDb } from "@/server/db/types";

let dbInstance: AppDb | null = null;

export function getLocalDb(): AppDb {
  if (dbInstance) {
    return dbInstance;
  }

  const db = createBunDb();
  syncSchema(db);
  dbInstance = db;
  return db;
}
