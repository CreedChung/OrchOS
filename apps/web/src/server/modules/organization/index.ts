import { Elysia, t } from "elysia";
import { status } from "elysia";
import { eq } from "drizzle-orm";
import type { AppDb } from "../../db/types";
import { organizations } from "../../db/schema";

export const OrganizationModel = {
  response: t.Object({
    id: t.String(),
    name: t.String(),
  }),
  errorNotFound: t.Object({ error: t.Literal("Organization not found") }),
  successDeleted: t.Object({ success: t.Literal(true) }),
} as const;

export const OrganizationService = {
  async list(db: AppDb) {
    return await db.select().from(organizations).all();
  },

  async get(db: AppDb, id: string) {
    return await db.select().from(organizations).where(eq(organizations.id, id)).get();
  },

  async create(db: AppDb, name: string) {
    const id = crypto.randomUUID();
    await db.insert(organizations).values({ id, name }).run();
    return { id, name };
  },

  async update(db: AppDb, id: string, data: { name?: string }) {
    const existing = await this.get(db, id);
    if (!existing) return null;

    if (data.name !== undefined) {
      await db.update(organizations).set({ name: data.name }).where(eq(organizations.id, id)).run();
    }
    return this.get(db, id);
  },

  async delete(db: AppDb, id: string) {
    const existing = await this.get(db, id);
    if (!existing) return false;

    await db.delete(organizations).where(eq(organizations.id, id)).run();
    return true;
  },
};

const createBody = t.Object({
  name: t.String(),
});

const updateBody = t.Object({
  name: t.Optional(t.String()),
});

export function createOrganizationController(db: AppDb) {
  return new Elysia({ prefix: "/api/organizations" })
    .get("/", async () => OrganizationService.list(db), {
      response: t.Array(OrganizationModel.response),
    })
    .post(
      "/",
      async ({ body }) => {
        return await OrganizationService.create(db, body.name);
      },
      {
        body: createBody,
        response: OrganizationModel.response,
      },
    )
    .get(
      "/:id",
      async ({ params: { id } }) => {
        const org = await OrganizationService.get(db, id);
        if (!org) throw status(404, "Organization not found");
        return org;
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: OrganizationModel.response,
          404: OrganizationModel.errorNotFound,
        },
      },
    )
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        const org = await OrganizationService.update(db, id, body);
        if (!org) throw status(404, "Organization not found");
        return org;
      },
      {
        params: t.Object({ id: t.String() }),
        body: updateBody,
        response: {
          200: OrganizationModel.response,
          404: OrganizationModel.errorNotFound,
        },
      },
    )
    .delete(
      "/:id",
      async ({ params: { id } }) => {
        const deleted = await OrganizationService.delete(db, id);
        if (!deleted) throw status(404, "Organization not found");
        return { success: true };
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: OrganizationModel.successDeleted,
          404: OrganizationModel.errorNotFound,
        },
      },
    );
}
