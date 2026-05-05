import { createFileRoute } from "@tanstack/react-router";

import { BookmarkService } from "@/server/modules/bookmark/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const Route = createFileRoute("/api/bookmarks/move")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          bookmarkId: string;
          sourceCategoryId: string;
          targetCategoryId: string;
        };

        return Response.json(
          await BookmarkService.moveBookmark(
            await getLocalDb(),
            body.bookmarkId,
            body.sourceCategoryId,
            body.targetCategoryId,
          ),
        );
      },
    },
  },
});
