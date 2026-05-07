import { oc } from "@orpc/contract";
import { z } from "zod";

export const observabilityRangeSchema = z.enum(["24h", "7d", "30d"]);

export const timeSeriesPointSchema = z.object({
  time: z.number(),
  label: z.string(),
  operations: z.number(),
  successes: z.number(),
});

export const observabilityMetricsSchema = z.object({
  events: z.object({
    total: z.number(),
  }),
  runtime: z.object({
    avgLatencyMs: z.number(),
    totalCostUsd: z.number(),
  }),
});

export const observabilityContract = {
  throughput: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
      }),
    )
    .output(z.array(timeSeriesPointSchema)),
  metrics: oc
    .input(
      z.object({
        range: observabilityRangeSchema.optional(),
      }),
    )
    .output(observabilityMetricsSchema),
};
