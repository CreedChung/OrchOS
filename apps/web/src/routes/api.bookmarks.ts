import { createFileRoute } from "@tanstack/react-router";

import { getLocalDb } from "@/server/runtime/local-db";
import { BookmarkService, type BookmarkCategoryRecord } from "@/server/modules/bookmark/service";

export const Route = createFileRoute("/api/bookmarks")({
  server: {
    handlers: {
      GET: async () => Response.json(await BookmarkService.list(await getLocalDb())),
      PUT: async ({ request }) => {
        const body = (await request.json()) as { categories: BookmarkCategoryRecord[] };
        return Response.json(await BookmarkService.replaceAll(await getLocalDb(), body.categories ?? []));
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as
          | { kind?: "category"; name: string }
          | { kind: "bookmark"; categoryId: string; title: string; url: string };

        if (body.kind === "bookmark") {
          return Response.json(
            await BookmarkService.createBookmark(await getLocalDb(), body.categoryId, {
              title: body.title,
              url: body.url,
            }),
          );
        }

        return Response.json(await BookmarkService.createCategory(await getLocalDb(), body.name));
      },
    },
  },
});
