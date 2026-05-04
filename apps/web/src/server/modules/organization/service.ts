import { eq } from "drizzle-orm";
import type { AppDb } from "../../db/types";
import { organizations } from "../../db/schema";

export abstract class OrganizationService {
  static async list(db: AppDb) {
    return await db.select().from(organizations).all();
  }

  static async get(db: AppDb, id: string) {
    return await db.select().from(organizations).where(eq(organizations.id, id)).get();
  }

  static async create(db: AppDb, name: string) {
    const id = crypto.randomUUID();
    await db.insert(organizations).values({ id, name }).run();
    return { id, name };
  }

  static async update(db: AppDb, id: string, data: { name?: string }) {
    const existing = await OrganizationService.get(db, id);
    if (!existing) return null;

    if (data.name !== undefined) {
      await db.update(organizations).set({ name: data.name }).where(eq(organizations.id, id)).run();
    }

    return OrganizationService.get(db, id);
  }

  static async delete(db: AppDb, id: string) {
    const existing = await OrganizationService.get(db, id);
    if (!existing) return false;

    await db.delete(organizations).where(eq(organizations.id, id)).run();
    return true;
  }
}
