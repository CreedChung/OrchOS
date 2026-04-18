import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin } from "../auth";
import { eq } from "drizzle-orm";
import { db } from "../../db";
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
  list() {
    return db.select().from(organizations).all();
  },

  get(id: string) {
    return db.select().from(organizations).where(eq(organizations.id, id)).get();
  },

  create(name: string) {
    const id = crypto.randomUUID();
    db.insert(organizations).values({ id, name }).run();
    return { id, name };
  },

  update(id: string, data: { name?: string }) {
    const existing = this.get(id);
    if (!existing) return null;

    if (data.name !== undefined) {
      db.update(organizations).set({ name: data.name }).where(eq(organizations.id, id)).run();
    }
    return this.get(id);
  },

  delete(id: string) {
    const existing = this.get(id);
    if (!existing) return false;

    db.delete(organizations).where(eq(organizations.id, id)).run();
    return true;
  },
};

const createBody = t.Object({
  name: t.String(),
});

const updateBody = t.Object({
  name: t.Optional(t.String()),
});

export const organizationController = new Elysia({ prefix: "/api/organizations" })
  .use(authPlugin)
  .requireAuth(true)
  .get("/", () => OrganizationService.list(), {
    response: t.Array(OrganizationModel.response),
  })
  .post(
    "/",
    ({ body }) => {
      return OrganizationService.create(body.name);
    },
    {
      body: createBody,
      response: OrganizationModel.response,
    },
  )
  .get(
    "/:id",
    ({ params: { id } }) => {
      const org = OrganizationService.get(id);
      if (!org) throw status(404, "Organization not found");
      return org;
    },
    {
      response: {
        200: OrganizationModel.response,
        404: OrganizationModel.errorNotFound,
      },
    },
  )
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const org = OrganizationService.update(id, body);
      if (!org) throw status(404, "Organization not found");
      return org;
    },
    {
      body: updateBody,
      response: {
        200: OrganizationModel.response,
        404: OrganizationModel.errorNotFound,
      },
    },
  )
  .delete(
    "/:id",
    ({ params: { id } }) => {
      const deleted = OrganizationService.delete(id);
      if (!deleted) throw status(404, "Organization not found");
      return { success: true };
    },
    {
      response: {
        200: OrganizationModel.successDeleted,
        404: OrganizationModel.errorNotFound,
      },
    },
  );
