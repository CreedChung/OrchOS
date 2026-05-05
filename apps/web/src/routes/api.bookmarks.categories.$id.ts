import { createFileRoute } from "@tanstack/react-router";

import { getLocalDb } from "@/server/runtime/local-db";
import { BookmarkService } from "@/server/modules/bookmark/service";

export const Route = createFileRoute("/api/bookmarks/categories/$id")({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as { name: string };
        return Response.json(await BookmarkService.updateCategory(await getLocalDb(), params.id, body.name));
      },
      DELETE: async ({ params }) => Response.json(await BookmarkService.deleteCategory(await getLocalDb(), params.id)),
    },
  },
});
