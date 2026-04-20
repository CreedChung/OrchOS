import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { db } from "@/db";
import { goals, activities, events } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

type TimeRange = "24h" | "7d" | "30d";

function getTimeRangeMs(range: TimeRange): number {
  switch (range) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function getIntervalMs(range: TimeRange): number {
  switch (range) {
    case "24h":
      return 60 * 60 * 1000;
    case "7d":
      return 24 * 60 * 60 * 1000;
    case "30d":
      return 24 * 60 * 60 * 1000;
  }
}

function getPoints(range: TimeRange): number {
  switch (range) {
    case "24h":
      return 24;
    case "7d":
      return 7;
    case "30d":
      return 30;
  }
}

function formatLabel(range: TimeRange, timestamp: number): string {
  if (range === "24h") {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export const observabilityController = new Elysia({ prefix: "/api/observability" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/metrics",
    ({ query }) => {
      const range = (query.range as TimeRange) || "24h";
      const now = Date.now();
      const start = now - getTimeRangeMs(range);

      const allGoals = db.select().from(goals).all();
      const allActivities = db
        .select()
        .from(activities)
        .where(sql`timestamp >= ${start}`)
        .all();
      const allEvents = db
        .select()
        .from(events)
        .where(sql`timestamp >= ${start}`)
        .all();

      const activeGoals = allGoals.filter((g) => g.status === "active").length;
      const completedGoals = allGoals.filter((g) => g.status === "completed").length;
      const pausedGoals = allGoals.filter((g) => g.status === "paused").length;

      const goalCount = allGoals.length;
      const activityCount = allActivities.length;
      const eventCount = allEvents.length;

      return {
        goals: { total: goalCount, active: activeGoals, completed: completedGoals, paused: pausedGoals },
        activities: { total: activityCount },
        events: { total: eventCount },
      };
    },
    {
      query: t.Object({ range: t.Optional(t.String()) }),
      response: t.Object({
        goals: t.Object({
          total: t.Number(),
          active: t.Number(),
          completed: t.Number(),
          paused: t.Number(),
        }),
        activities: t.Object({ total: t.Number() }),
        events: t.Object({ total: t.Number() }),
      }),
    },
  )
  .get(
    "/throughput",
    ({ query }) => {
      const range = (query.range as TimeRange) || "24h";
      const now = Date.now();
      const start = now - getTimeRangeMs(range);
      const interval = getIntervalMs(range);
      const points = getPoints(range);

      const activitiesInRange = db
        .select()
        .from(activities)
        .where(sql`timestamp >= ${start} AND timestamp <= ${now}`)
        .orderBy(desc(activities.timestamp))
        .all();

      const data: Array<{ time: number; label: string; operations: number; successes: number }> = [];

      for (let i = 0; i < points; i++) {
        const bucketStart = now - (points - 1 - i) * interval;
        const bucketEnd = bucketStart + interval;

        const bucketActivities = activitiesInRange.filter(
          (a) => a.timestamp >= bucketStart && a.timestamp < bucketEnd,
        );

        const operations = bucketActivities.length;
        const successes = bucketActivities.filter((a) => !a.error).length;

        data.push({
          time: bucketStart,
          label: formatLabel(range, bucketStart),
          operations,
          successes,
        });
      }

      return data;
    },
    {
      query: t.Object({ range: t.Optional(t.String()) }),
      response: t.Array(
        t.Object({
          time: t.Number(),
          label: t.String(),
          operations: t.Number(),
          successes: t.Number(),
        }),
      ),
    },
  )
  .get(
    "/goals",
    ({ query }) => {
      const range = (query.range as TimeRange) || "24h";
      const now = Date.now();
      const start = now - getTimeRangeMs(range);
      const interval = getIntervalMs(range);
      const points = getPoints(range);

      const goalsInRange = db
        .select()
        .from(goals)
        .where(sql`created_at >= ${start} AND created_at <= ${now}`)
        .orderBy(desc(goals.createdAt))
        .all();

      const data: Array<{ time: number; label: string; completed: number; active: number }> = [];

      for (let i = 0; i < points; i++) {
        const bucketStart = now - (points - 1 - i) * interval;
        const bucketEnd = bucketStart + interval;

        const bucketGoals = goalsInRange.filter(
          (g) => g.createdAt >= bucketStart && g.createdAt < bucketEnd,
        );

        const completed = bucketGoals.filter((g) => g.status === "completed").length;
        const active = bucketGoals.filter((g) => g.status === "active").length;

        data.push({
          time: bucketStart,
          label: formatLabel(range, bucketStart),
          completed,
          active,
        });
      }

      return data;
    },
    {
      query: t.Object({ range: t.Optional(t.String()) }),
      response: t.Array(
        t.Object({
          time: t.Number(),
          label: t.String(),
          completed: t.Number(),
          active: t.Number(),
        }),
      ),
    },
  );