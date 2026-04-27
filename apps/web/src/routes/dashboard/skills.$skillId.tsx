import { createFileRoute } from "@tanstack/react-router";

import { SkillMarketDetailView } from "@/components/panels/SkillMarketDetailView";
import { api } from "@/lib/api";

export const Route = createFileRoute("/dashboard/skills/$skillId")({
  loader: async ({ params }) => api.getSkillMarketItem(params.skillId),
  component: SkillMarketDetailPage,
});

function SkillMarketDetailPage() {
  const item = Route.useLoaderData();
  return <SkillMarketDetailView item={item} />;
}
