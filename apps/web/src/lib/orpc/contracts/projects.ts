import { oc } from "@orpc/contract";
import { z } from "zod";

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  repositoryUrl: z.string().optional(),
  createdAt: z.string(),
});

const createProjectSchema = z.object({
  name: z.string(),
  path: z.string(),
  repositoryUrl: z.string().optional(),
});

const updateProjectSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  path: z.string().optional(),
  repositoryUrl: z.string().optional(),
});

export const projectsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(projectSchema)),
  get: oc.input(z.object({ id: z.string() })).output(projectSchema.nullable()),
  create: oc.input(createProjectSchema).output(projectSchema),
  update: oc.input(updateProjectSchema).output(projectSchema.nullable()),
  delete: oc.input(z.object({ id: z.string() })).output(z.object({ success: z.boolean() })),
};
