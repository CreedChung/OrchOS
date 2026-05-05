import { createFileRoute } from "@tanstack/react-router";

import { getLocalDb } from "@/server/runtime/local-db";
import { BookmarkService } from "@/server/modules/bookmark/service";

export const Route = createFileRoute("/api/bookmarks/categories/$categoryId/items/$itemId")({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as { title: string; url: string };
        return Response.json(
          await BookmarkService.updateBookmark(await getLocalDb(), params.categoryId, params.itemId, body),
        );
      },
      DELETE: async ({ params }) =>
        Response.json(await BookmarkService.deleteBookmark(await getLocalDb(), params.categoryId, params.itemId)),
    },
  },
});
