import { oc } from "@orpc/contract";
import { z } from "zod";

export const customAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  apiKey: z.string(),
  model: z.string(),
  createdAt: z.string(),
});

export const customAgentsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(customAgentSchema)),
  create: oc
    .input(
      z.object({
        name: z.string(),
        url: z.string(),
        apiKey: z.string(),
        model: z.string(),
      }),
    )
    .output(z.array(customAgentSchema)),
  update: oc
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        url: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      }),
    )
    .output(z.array(customAgentSchema)),
  delete: oc.input(z.object({ id: z.string() })).output(z.array(customAgentSchema)),
};
