import type { AppDb } from "@/server/db/types";

let dbInstancePromise: Promise<AppDb> | null = null;

export async function getLocalDb(): Promise<AppDb> {
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = import("@/server/bun/driver").then(({ createBunDb, syncSchema }) => {
    const db = createBunDb();
    syncSchema(db);
    return db;
  });

  return dbInstancePromise;
}
