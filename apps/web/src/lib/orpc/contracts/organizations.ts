import { oc } from "@orpc/contract";
import { z } from "zod";

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const organizationsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(organizationSchema)),
  get: oc.input(z.object({ id: z.string() })).output(organizationSchema.nullable()),
  create: oc.input(z.object({ name: z.string() })).output(organizationSchema),
  update: oc.input(z.object({ id: z.string(), name: z.string().optional() })).output(organizationSchema.nullable()),
  delete: oc.input(z.object({ id: z.string() })).output(z.object({ success: z.boolean() })),
};
