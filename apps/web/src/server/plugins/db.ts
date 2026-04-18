import { Elysia } from "elysia";
import type { AppDb } from "../db/types";

export function createDbPlugin(db: AppDb) {
  return new Elysia({ name: "db" }).decorate("db", db);
}
